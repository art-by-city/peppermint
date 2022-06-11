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
    mint: function ({ token_id, to_address, amount = 1 }, batch) {
      batch.withContractCall(ops.mint_tokens([{
        owner: to_address,
        token_id,
        amount
      }]))

      return true
    }
  }
}
