module.exports = function (fastify, options, done) {
  const setUp = async (publicKey) => {
    const instance = await fastify.node.open({ keypair: { publicKey } })
    await instance.ready()

    // skip if the instance is already listening
    if (instance.listenerCount('update') < 1) {
      instance.on('update', (val) => {
        console.log('Update ', instance.publicKey, ` latest:${instance.latest.timestamp} ${instance.latest.text}`)
        fastify.db.set(`pins.${publicKey}`, instance.latest)
          .write()
      })
    }
    fastify.instances.set(instance.publicKey, instance)
    fastify.db.set(`pins.${publicKey}`, instance.latest).write()
    console.log('** Setup COMPLETE ** ', instance.publicKey, ` pins.size: [${fastify.db.get('pins').size().value()}]`)
    return instance.latest
  }

  // load list from storage and initialize the node
  const init = async () => {
    const pins = fastify.db.get('pins').value() // Find all publicKeys pinned in the collection
    Object.keys(pins).forEach((key) => {
      // skip if it's already configured on this node
      if (!fastify.node.instances.has(key)) { setUp(key) }
    })
  }

  init()

  // https://www.fastify.io/docs/latest/Validation-and-Serialization/
  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          rootKey: {
            type: 'string',
            minLength: 64, // https://json-schema.org/understanding-json-schema/reference/string.html#length
            maxLength: 64
          }
        }
      },
      querystring: {},
      params: {},
      headers: {
        type: 'object',
        properties: {
          Authorization: { type: 'string' }
        },
        required: ['Authorization']
      }
    }
  }
  const keys = new Set(['thetokenhere'])
  fastify.register(require('fastify-bearer-auth'), { keys }) // only apply token requirement to this fastify instance (fastify)
  fastify.post('/pin/', opts, async (request, reply) => {
    const publicKey = request.body.rootKey
    const latest = await setUp(publicKey)
    reply.send({ latest })
  })

  done()
}
