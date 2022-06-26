import { createRequire } from 'module'
import { MichelsonMap, TezosToolkit, compose } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'
import { char2Bytes, bytes2Char, verifySignature } from '@taquito/utils'
import { Tzip12Module, tzip12 } from '@taquito/tzip12'
import { tzip16 } from '@taquito/tzip16'

const require = createRequire(import.meta.url)
require('console-stamp')(console)
const config = require('./config.json')

const main = async function() {
  const tezos = new TezosToolkit(config.rpcUrl)
  tezos.addExtension(new Tzip12Module())
  const signer = new InMemorySigner(config.privateKey)
	const address = await signer.publicKeyHash()
  const pk = await signer.publicKey()
  console.log('Signer initialized for originating address', address)
  console.log('Signer initialized for originating pk', pk)
  tezos.setSignerProvider(signer)

  const bytes = char2Bytes(JSON.stringify({
    "handler": "nft-asset",
    "name": "mint_tokens",
    "args": {
      "token_id": 2,
      "metadata_uri": "ipfs://QmPxz1s3wYVGibvLpgcqFMrvtnhVmNU5Y7xo9qLGLAGeHx",
      "owners": ["tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb"]
    }
  }))

  signer.sign(bytes).then(signature => {
    console.log('bytes', bytes)
    console.log('sig', signature.sig)
    const verified = verifySignature(bytes, pk, signature.sig)

    console.log('Message verified?', verified)
  }).catch(err => console.error('err!', err))

  const tokenId = 1

  tezos.contract
  .at(config.nftContract)
  // .at('KT1HcpvkvqaqzbTfz4mS6Ldwn31vVhzjwf8q') // has contract metadata
  // .then(contract => {
  //   // const schema = contract.parameterSchema.ExtractSchema()
  //   // console.log('CONTRACT PARAMETER SCHEMA\n', JSON.stringify(schema, null, 2))
  //   // console.log(`Fetching the token metadata for the token ID ${tokenId}...`)

  //   return contract.storage()
  // })
  // .then(storage => {
  //   console.log('storage', JSON.stringify(storage, null, 2))

  //   // return storage.metadata.get('content') // contract metadata
  //   // return storage.assets.ledger.get(tokenId) // owner of tokenId
  //   return storage.assets.metadata.metadata.get({ from_: tokenId, to_: tokenId + 1 })
  // })
  // .then(metadata => {
  //   // console.log('metadata', JSON.stringify(bytes2Char(metadata), null, 2))
  //   // console.log('metadata', bytes2Char(metadata))
  //   console.log('metadata', metadata)

  //   return metadata.token_info.get('')
  // })
  // .then(token_info => {
  //   console.log('token_info', bytes2Char(token_info))


  // })

  // .then(contract => {
  //   const methods = contract.parameterSchema.ExtractSignatures()
  //   const schema = contract.parameterSchema.ExtractSchema()
  //   console.log('METHODS?', contract.methods)
  // console.log('CONTRACT PARAMETER SCHEMA\n', JSON.stringify(schema, null, 2))
  //   // console.log('CONTRACT METHOD SIGNATURES\n', JSON.stringify(methods, null, 2))

  //   // console.log('contract.mint_tokens()', JSON.stringify(contract.methods.mint_tokens().getSignature(), null, 2))
  //   // console.log('contract.tokens()', JSON.stringify(contract.methods.tokens().getSignature(), null, 2))
  //   console.log('contract.assets()', JSON.stringify(contract.methods.assets().getSignature(), null, 2))
  // })

  // .then(contract => {


  //   // token_metadata = {
  //   //   "token_id": 0,
  //   //   "token_info": {
  //   //     "0": "left".encode().hex(),
  //   //     "1": "right".encode().hex(),
  //   //     "decimals": "0".encode().hex(),
  //   //     "name": "socks token".encode().hex(),
  //   //     "symbol": "SOCK".encode().hex(),
  //   //   },
  //   // self.fa2.mint_tokens(
  //   //   {
  //   //     "metadata": token_metadata,
  //   //     "token_def": {
  //   //         "from_": 0,
  //   //         "to_": 2,
  //   //     },
  //   //     "owners": [owner1_address, owner2_address],
  //   //   }

  //   // let token_info = MichelsonMap.fromLiteral({"": char2Bytes(metadata_ipfs)})
  //   const uri = 'ipfs://QmPxz1s3wYVGibvLpgcqFMrvtnhVmNU5Y7xo9qLGLAGeHx'
  //   const token_id = 1
  //   const from_ = token_id
  //   const to_ = token_id + 1
  //   const token_info = MichelsonMap.fromLiteral({ '': char2Bytes(uri) })
  //   const owners = ['tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb']

  //   // console.log('mint_tokens func', JSON.stringify(contract.methods.mint_tokens().getSignature(), null, 2))
  //   // (from_, to_, token_id, token_info, owners)
  //   return contract.methods.mint_tokens(from_, to_, token_id, token_info, owners).send()
  // })
  // .then(op => {
  //   console.log(`Waiting for ${op.hash} to be confirmed`)

  //   return op.confirmation(config.confirmations).then(() => op.hash)
  // })
  // .then(hash => {
  //   console.log(`Confirmed op ${hash}`)
  // })
  .catch(error => console.error(error))
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract\n', err)
  })

  // [15.06.2022 21:04.25.658] [LOG]   Signer initialized for originating address tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb
  // [15.06.2022 21:04.25.671] [LOG]   Done
  // [15.06.2022 21:04.25.745] [LOG]   Waiting for ookNRsyUJN2U854znNdKzF2UJ2PmVgqGJjhtToe5z5uR794RUE4 to be confirmed
  // [15.06.2022 21:04.30.761] [LOG]   Confirmed op ookNRsyUJN2U854znNdKzF2UJ2PmVgqGJjhtToe5z5uR794RUE4