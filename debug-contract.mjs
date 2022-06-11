import { createRequire } from 'module'
import { TezosToolkit } from '@taquito/taquito'

const require = createRequire(import.meta.url)
require('console-stamp')(console)
const config = require('./config.json')

const main = async function() {
  const tezos = new TezosToolkit(config.rpcUrl)

  tezos.contract
  .at(config.nftContract)
  .then((contract) => {
    const methods = contract.parameterSchema.ExtractSignatures()
    const schema = contract.parameterSchema.ExtractSchema()
    console.log('METHODS?', contract.methods)
    console.log('CONTRACT PARAMETER SCHEMA\n', JSON.stringify(schema, null, 2))
    console.log('CONTRACT METHOD SIGNATURES\n', JSON.stringify(methods, null, 2))
  })
  .catch((error) => console.log(`Error: ${error}`))
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract\n', err)
  })
