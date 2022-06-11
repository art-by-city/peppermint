import { createRequire } from 'module'
import { TezosToolkit } from '@taquito/taquito'
import { InMemorySigner } from '@taquito/signer'

const require = createRequire(import.meta.url)
require('console-stamp')(console)
const config = require('./config.json')

const main = async function() {
  const tezos = new TezosToolkit(config.rpcUrl)
  tezos.setSignerProvider(new InMemorySigner(config.privateKey))

  tezos.contract
  .at(config.nftContract)
  .then((contract) => {
    console.log('contract.methods', contract.methods)
    const method = 'admin'
    console.log(
      `${method}() transfer params:`,
      contract.methods[method]().toTransferParams()
    )
    console.log(
      `${method}() schema:`,
      contract.methods[method]().schema
    )

    return contract.methods[method]().send()
  })
  .then((result) => {
    console.log('result', result)
  })
  .catch((error) => console.log('Error:', error))
}

main()
  .then(() => {
    console.log('Done')
  })
  .catch((err) => {
    console.error('An error has ocurred deploying contract\n', err)
  })
