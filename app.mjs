import { createRequire } from 'module'
import { parallel, reflect } from 'async'
import { TezosToolkit, TezosOperationError } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import Arweave from 'arweave'

import Queue from './queue.mjs'
import {
	ArweaveHandler,
	NftAssetHandler,
	NftMultiassetHandler,
	TezHandler
} from './operations'
import { ArweaveDriver, TezosDriver } from './drivers'
import {
	parse_rpc_error,
	postprocess_error_object
} from './errorhandler/tezos_error.mjs'

const require = createRequire(import.meta.url);
require('console-stamp')(console);
const config = require('./config.json');

const main = async function() {
	const queue = Queue(config.dbConnection);
	const tezos = new TezosToolkit(config.rpcUrl);
	const arweave = Arweave.init(config.arweave)
	const signer = new InMemorySigner(config.privateKey);
	const address = await signer.publicKeyHash();

	console.log("Signer initialized for originating address", address);
	tezos.setSignerProvider(signer);

	const drivers = {
		arweave: new ArweaveDriver(config, queue, {
			'arweave': ArweaveHandler(arweave)
		}),
		tezos: new TezosDriver(config, queue, {
			// 'nft': await NftMultiassetHandler(tezos, config.nftContract),
			'nft-asset': await NftAssetHandler(tezos, config.nftContract),
			'tez': await TezHandler(tezos),
		})
	}

	const handlers = {
		// 'nft': await NftMultiassetHandler(tezos, config.nftContract),
		'nft-asset': await NftAssetHandler(tezos, config.nftContract),
		'tez': await TezHandler(tezos),
	}

	const saveRejected = async function (rejectedIds) {
		if (rejectedIds.length > 0) {
			console.warn('Rejected operations with ids:',	rejectedIds)

			try {
				await queue.save_rejected(rejectedIds)
			} catch (err) {
				console.error(
					"Database error when updating rejected operation with ids:",
					rejectedIds,
					'\n',
					err
				)
			}
		}
	}

	const heartbeat = async function() {
		let ops = await queue.checkout(address, config.batchSize);
		if (ops.length == 0) {
			console.log("No pending operations for originator", address);

			return true;
		}
		console.log("Generating batch with", ops.length, "operations.")


		// TODO -> async parallel & reflect
		for (const driverName in drivers) {
			const driver = drivers[driverName]
			const driverOps = ops.filter(
				op => Object.keys(driver.handlers).includes(op.command.handler)
			)

			return await driver.batch(driverOps).run(batch, batchedIds)
		}



		// Setup
		const dispatch_command = function(
			command,
			tezosWalletBatch
		) {
			let handler = handlers[command.handler];
			if (handler) {
				let handling_function = handler[command.name];
				if (handling_function) {
					return handling_function(command.args, tezosWalletBatch);
				}
			}
			console.warn("Invalid comand:", JSON.stringify(command));
			return false;
		}
		let tezosWalletBatch = tezos.wallet.batch();
		let batched_ids = [];
		let rejected_ids = [];

		// Batch Operations
		await Promise.all(
			ops.map((operation) => {
				let success = dispatch_command(operation.command, tezosWalletBatch);

				if (success) {
					batched_ids.push(operation.id);
				} else {
					rejected_ids.push(operation.id);
				}
			})
		);

		if (rejected_ids.length > 0) {
			console.warn(
				'Rejected operations with ids:',
				JSON.stringify(rejected_ids)
			);
			queue
				.save_rejected(rejected_ids)
				.catch((err) => {
					console.error(
						"Database error when updating rejected operation with ids:",
						JSON.stringify(rejected_ids),
						'\n',
						err
					);
				});
		}
		if (batched_ids.length == 0) {
			console.log("No valid operations left, aborting batch.");
			return true;
		}
		console.log(
			"Attempting to send operation group containing operations with ids:",
			JSON.stringify(batched_ids)
		);

		// Send Operations
		while (true) {
			try {
				let sent_operation = await tezosWalletBatch.send();
				let op_hash = sent_operation.opHash;
				console.log(
					"Sent operation group with hash", op_hash,
					"containing operations with ids:", JSON.stringify(batched_ids)
				);

				queue
					.save_sent(batched_ids, sent_operation.opHash)
					.catch((err) => {
						console.error(
							"Database error when writing hash to operations with ids:",
							JSON.stringify(batched_ids),
							'\n',
							err
						);
					});

				let result = await sent_operation.confirmation(config.confirmations);

				if (result.completed) {
					console.log(
						"Operation group with hash",
						op_hash,
						"has been successfully confirmed."
					);
					queue
						.save_confirmed(batched_ids)
						.catch((err) => {
							console.error(
								"Database error when saving confirmed status to operations with ids:",
								JSON.stringify(batched_ids),
								'\n',
								err
							);
						});
					return true;
				} else {
					// FIXME: Taquito .confirmation() gives us some interesting and underdocumented results
					// it should be possible to prepare for chain reorgs based on it
					console.log("Operation group with hash", op_hash, "has failed.")
					queue
						.save_failed(batched_ids)
						.catch((err) => {
							console.error(
								"Database error when saving failed status to operations with ids:",
								JSON.stringify(batched_ids),
								'\n',
								err
							);
						});
				}
			} catch (err) {
				let tezos_error = null;
				if (TezosOperationError.prototype.isPrototypeOf(err)) {
					tezos_error = postprocess_error_object(err);
				} else {
					tezos_error = parse_rpc_error(err.body);
					console.log(tezos_error);
				}
				if (tezos_error) {
					switch (tezos_error.id_noproto) {
						// case "node.prevalidation.oversized_operation":
						// case "gas_limit_too_high":
						// 	// Do something smart later
						case "gas_exhausted.block":
							console.log("Block gas limit error - most likely due to know Octez bug. Retrying...");
							continue;
						case "contract.balance_too_low":
						case "contract.cannot_pay_storage_fee":
							console.log(
								"Balance too low, please fund the account. Retrying..."
							);
							continue;
						case "michelson_v1.script_rejected":
							console.log(
								"A Michelson script error has occurred when processing operations with ids:",
								JSON.stringify(batched_ids),
								"\n",
								err
							);
							break;
						default:
							console.log(
								"A Tezos error has occurred when processing operations with ids:",
								JSON.stringify(batched_ids),
								"\n",
								err
							);
					}

					queue
						.save_rejected(batched_ids)
						.catch((err) => {
							console.error(
								"Database error when updating rejected operation with ids:",
								JSON.stringify(batched_ids),
								'\n',
								err
							);
						});

					return true;
				}
				console.error(
					"An error has occurred when processing operations with ids:",
					JSON.stringify(batched_ids),
					"\n",
					err,
					"\nOperation group state unknown."
				);

				queue
					.save_unknown(batched_ids)
					.catch((err) => {
						console.error(
							"Database error when updating unknown state operation with ids:",
							JSON.stringify(batched_ids),
							'\n',
							err
						);
					});

				return true;
			}
		}
	};

	let signal = true;
	while (signal) {
		try {
			let [ result, _ ] = await Promise.all([
				heartbeat(),
				new Promise(_ => setTimeout(_, config.pollingDelay))
			]);
			signal = result;
		} catch (err) {
			console.error("An error has occurred in the main event loop.\n", err);
			signal = false;
		}
	}

};

main()
	.then(() => {
		console.log("bye!")
		process.exit()
	})
	.catch((err) => {
		console.log("An error has ocurred outside the main event loop.\n", err)
	});