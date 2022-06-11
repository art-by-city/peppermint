import { createRequire } from 'module'
import { TezosToolkit, MichelsonMap } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import fs from 'fs'

const require = createRequire(import.meta.url)
require('console-stamp')(console)
const config = require('./config.json')

const main = async function() {
  const tezos = new TezosToolkit(config.rpcUrl)
  const signer = new InMemorySigner(config.privateKey)
	const address = await signer.publicKeyHash()
  console.log('Signer initialized for originating address', address)
  tezos.setSignerProvider(signer)

  const code = fs.readFileSync(
    '../smart-contracts/nft_assets/ligo/out/fa2_nft_asset.tz'
  ).toString()

  tezos.contract.originate({
    code,
    storage: {
      /**
        admin = {
          admin = ("tz1YPSCGWXwBdTncK2aCctSZAXWvGsGwVJqU" : address);
          pending_admin = (None : address option);
          paused = true;
        };
      */
      admin: {
        admin: 'tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb',
        // pending_admin: '',
        paused: false
      },
      /**
        assets = {
          ledger = (Big_map.empty : (token_id, address) big_map);
          operators = (Big_map.empty : operator_storage);
          metadata = {
            token_defs = (Set.empty : token_def set);
            next_token_id = 0n;
            metadata = (Big_map.empty : (token_def, token_metadata) big_map);
          };
        };
      */
      assets: {
        ledger: new MichelsonMap(),
        operators: new MichelsonMap(),
        metadata: {
          token_defs: [],
          next_token_id: 1,
          metadata: new MichelsonMap()
        }
      },
      /**
        metadata = Big_map.literal [
          ("", Bytes.pack "tezos-storage:content" );
          (* ("", 0x74657a6f732d73746f726167653a636f6e74656e74); *)
          ("content", 0x00) (* bytes encoded UTF-8 JSON *)
        ];
      */
      metadata: new MichelsonMap()
    }
  })
  .then((op) => {
    console.log(`Confirming origination for ${op.contractAddress}...`)

    return op.contract()
  })
  .then((contract) => {
    console.log(`Successfuly deployed contract ${contract.address}!`)

    return contract.address
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract!\n', err)
  })
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract\n', err)
  })
