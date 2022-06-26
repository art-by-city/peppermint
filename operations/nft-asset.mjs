import {MichelsonMap} from '@taquito/taquito'
import {char2Bytes} from '@taquito/tzip16'

export default async function (tezos, contractAddress) {
  const contract = await tezos.contract.at(contractAddress)
  console.log(
    'token contract loaded',
    contract.parameterSchema.ExtractSignatures()
  )

  const ops = {
    update_operators: contract.methods.update_operators,
    transfer: contract.methods.transfer,
    tokens: contract.methods.tokens,
    token_metadata: contract.methods.token_metadata,
    set_admin: contract.methods.set_admin,
    pause: contract.methods.pause,
    mint_tokens: contract.methods.mint_tokens,
    fa2: contract.methods.fa2,
    confirm_admin: contract.methods.confirm_admin,
    burn_tokens: contract.methods.burn_tokens,
    balance_of: contract.methods.balance_of,
    assets: contract.methods.assets,
    admin: contract.methods.admin
  }

  Object.entries(ops).forEach(([key, value]) => {
    if (typeof value != 'function') {
			throw new Error('Invalid token contract signature')
		}
  })

  return {
  //   const uri = 'ipfs://QmPxz1s3wYVGibvLpgcqFMrvtnhVmNU5Y7xo9qLGLAGeHx'
  //   const token_id = 1
  //   const from_ = token_id
  //   const to_ = token_id + 1
  //   const token_info = MichelsonMap.fromLiteral({ '': char2Bytes(uri) })
  //   const owners = ['tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb']

  // mint_tokens(from_, to_, token_id, token_info, owners)
    mint_tokens: function ({ token_id, metadata_uri, owners }, batch) {
      console.log('nft-asset.mint_tokens()', token_id, metadata_uri, owners)
      const from_ = token_id
      const to_ = token_id + 1
      const token_info = MichelsonMap.fromLiteral({
        '': char2Bytes(metadata_uri)
      })
      const args = {
        from_,
        to_,
        token_id,
        token_info,
        owners
      }

      console.log('nft-asset.mint_tokens() args', args)

      // batch.withContractCall(ops.mint_tokens(args))
      batch.withContractCall(contract.methods.mint_tokens(
        from_, to_, token_id, token_info, owners
      ))

      return true
    }
  }
}
