import {
	parse_rpc_error,
	postprocess_error_object
} from '../errorhandler/tezos_error.mjs'

const ERRORS = {
  GAS_EXHAUSTED:
    'Block gas limit error - most likely due to know Octez bug. Retrying...',
  BALANCE_TOO_LOW: 'Balance too low, please fund the account. Retrying...',
  MICHELSON_SCRIPT_REJECTED:
    'A Michelson script error has occurred when processing operations with ids:',
  TEZOS_ERROR: 'A Tezos error has occurred when processing operations with ids:',
  UNKNOWN: 'An error has occurred when processing operations with ids:'
}

export default class TezosDriver {
  private config = {}
  private batch = null
  private ids = []
  private queue = null
  handlers = []

  constructor(config, queue, handlers) {
    this.config = config
    this.queue = queue
    this.handlers = handlers
  }

  async batch(ops) {
    const rejectedIds = []
    this.batch = tezos.wallet.batch()

    ops.map(op => {
      const valid = this.handlers[op.command.handler]
        && this.handlers[op.command.handler][op.command.name]
        && this.handlers[op.command.handler][op.command.name](op.command, batch)

      if (valid) {
        this.ids.push(op.id)
      } else {
        rejectedIds.push(op.id)
      }
    })

    if (rejectedIds.length > 0) {
			console.warn('Rejected operations with ids:',	rejectedIds)
			await this.queue.save_rejected(rejectedIds)
		}

    return this
  }

  async run() {
    console.log(
      'Attempting to send operation group containing operations with ids:',
			this.ids
		)

		while (true) {
			try {
				const batchOp = await this.batch.send()
        console.log(
					'Sent operation group with hash:', batchOp.opHash,
					'containing operations with ids:', this.ids
				)
				this.queue.save_sent(this.ids, batchOp.opHash)

				const result = await batchOp.confirmation(this.config.confirmations)

				if (result.completed) {
					console.log(
						`Operation group with hash ${batchOp.opHash} has been confirmed.`
					)
					this.queue.save_confirmed(this.ids)

					return true
				} else {
          /**
           * FIXME:
           *   Taquito .confirmation() gives us some interesting and
           *   underdocumented results.
           *   It should be possible to prepare for chain reorgs based on it
           */
					console.log(`Operation group with hash ${batchOp.opHash} has failed.`)
					this.queue.save_failed(this.ids)
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
							console.log(ERRORS.GAS_EXHAUSTED)
							continue
						case "contract.balance_too_low":
						case "contract.cannot_pay_storage_fee":
							console.log(ERRORS.BALANCE_TOO_LOW);
							continue
						case "michelson_v1.script_rejected":
							console.log(ERRORS.MICHELSON_SCRIPT_REJECTED,	this.ids,	'\n',	err)
							break
						default:
							console.log(ERRORS.TEZOS_ERROR,	this.ids,	'\n',	err)
					}

					this.queue.save_rejected(this.ids)

					return true
				}

				console.error(
          ERRORS.UNKNOWN,
          this.ids,
          '\n',
          err,
          '\nOperation group state unknown.'
        )

				this.queue.save_unknown(batched_ids)

				return true
			}
		}
  }
}
