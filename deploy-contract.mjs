import { createRequire } from 'module'
import { TezosToolkit, MichelsonMap } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import fs from 'fs'
import { char2Bytes, getPkhfromPk } from '@taquito/utils'

const require = createRequire(import.meta.url)
require('console-stamp')(console)
const config = require('./config.json')

const creatorPK = process.env.CREATOR_PK
  || 'edpkvGfYw3LyB1UcCahKQk4rF2tvbMUk8GFiTuMjL75uGXrpvKXhjn'
const creatorPKH = getPkhfromPk(creatorPK)

const main = async function() {
  const tezos = new TezosToolkit(config.rpcUrl)
  const signer = new InMemorySigner(config.privateKey)
	const address = await signer.publicKeyHash()
  console.log('Signer initialized for originating address', address)
  tezos.setSignerProvider(signer)

  const code = fs.readFileSync(
    '../smart-contracts/nft_assets/ligo/out/fa2_nft_asset.tz'
  ).toString()


  const metadata = new MichelsonMap()
  metadata.set('', char2Bytes('tezos-storage:content'))
  metadata.set('content', char2Bytes(JSON.stringify({
    name: 'Interactive NFT Test',
    description: 'This is an interactive NFT test contract!',
    version: '1',
    license: 'MIT',
    interfaces: [ 'TZIP-012' ]
  })))

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
        admin: creatorPKH,
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
      metadata
    }
  })
  .then((op) => {
    console.log(`Confirming origination for contract ${op.contractAddress}`)

    return op.confirmation(config.confirmations)
  })
  .then(confirms => {
    console.log(`deployed with ${confirms} confirms`)
  })
  .catch((err) => {
    console.error('An error has occurred deploying contract!\n', err)
  })
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract\n', err)
  })
