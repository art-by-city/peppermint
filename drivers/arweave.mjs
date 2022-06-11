export default class ArweaveDriver {
  queue = null
  handlers = []

  constructor(queue, handlers) {
    this.queue = queue
    this.handlers = handlers
  }

  async batch(ops) {
    const batch = [], batchedIds = [], rejectedIds = []

    ops.map(op => {
      if (
        this.handlers[op.command.handler]
        && this.handlers[op.command.handler][op.command.name]
      ) {
        this.handlers[op.command.handler][op.command.name](
          op.command, batch
        )
        batchedIds.push(op.id)
      } else {
        rejectedIds.push(op.id)
      }
    })

    return {
      batch,
      batchedIds,
      rejectedIds
    }
  }

  async run(batch) {
    throw new Error('ArweaveDriver.run() not yet implemented')
  }
}
