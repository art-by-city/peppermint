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
const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY
  || 'edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq'
const nftName = process.env.NFT_NAME || 'Interactive NFT Test'
const nftDesc = process.env.NFT_DESC
  || 'This is an interactive NFT test contract!'
const rpcUrl = process.env.RPC_URL || 'https://jakartanet.ecadinfra.com'

const main = async function() {
  const tezos = new TezosToolkit(rpcUrl)
  const signer = new InMemorySigner(creatorPrivateKey)
	const address = await signer.publicKeyHash()
  console.log('Signer initialized for originating address', address)
  tezos.setSignerProvider(signer)

  const code = fs.readFileSync(
    '../smart-contracts/nft_assets/ligo/out/fa2_nft_asset.tz'
  ).toString()


  const metadata = new MichelsonMap()
  metadata.set('', char2Bytes('tezos-storage:content'))
  metadata.set('content', char2Bytes(JSON.stringify({
    name: nftName,
    description: nftDesc,
    version: '1',
    license: 'MIT',
    interfaces: [ 'TZIP-012' ]
  })))

  tezos.contract.originate({
    code,
    storage: {
      admin: {
        admin: creatorPKH,
        paused: false
      },
      assets: {
        ledger: new MichelsonMap(),
        operators: new MichelsonMap(),
        metadata: {
          token_defs: [],
          next_token_id: 1,
          metadata: new MichelsonMap()
        }
      },
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
