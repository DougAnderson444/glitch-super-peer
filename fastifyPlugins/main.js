// Hypns will connect us to the network and pin the data
const HyPNS = require('hypns')
// Security note: It's deliberately placed in the `.data` directory which doesn't get copied if someone remixes the project.
const hypnsNode = new HyPNS({ persist: true, applicationName: '.data/hypnsapp' })

module.exports = function (fastify, options, done) {
  const setUp = async (publicKey) => {
    console.log('setting up ', publicKey)

    const instance = await hypnsNode.open({ keypair: { publicKey } })
    await instance.ready()
    console.log(`1. Listener count ${instance.listenerCount('update')} on ${instance.key}`)

    // skip if the instance is already listening
    if (instance.listenerCount('update') < 1) {
      console.log('Setup ', instance.publicKey, ` latest:${instance.listenerCount('update')}`)
      const d = Date.now()
      instance.on('update', (val) => {
        const lag = (new Date(Date.now())) - (new Date(instance.latest.timestamp))
        console.log('Update ', instance.publicKey, ` latest:${instance.latest.timestamp} ${instance.latest.text} [${new Date(lag).getSeconds()} sec] on ${d}`)
        fastify.db.set(`pins.${publicKey}`, instance.latest)
          .write()
      })
    }
    console.log(`2. Listener count ${instance.listenerCount('update')} on ${instance.key}`)

    fastify.db.set(`pins.${publicKey}`, instance.latest).write()
    console.log('** Setup COMPLETE ** \n', instance.publicKey, ` pins.size: [${fastify.db.get('pins').size().value()}]`)
    return instance.latest
  }

  // load list from storage and initialize the node
  const init = async () => {
    const pins = fastify.db.get('pins').value() // Find all publicKeys pinned in the collection
    Object.keys(pins).forEach((key) => {
      // skip if it's already configured on this node
      if (!hypnsNode.instances.has(key)) { setUp(key) }
    })
  }

  init()

  fastify.register((fi, options, done) => {
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
        headers: {
          type: 'object',
          properties: {
            Authorization: { type: 'string' }
          },
          required: ['Authorization']
        }
      }
    }

    const keys = new Set(['thetokenhere']) // A Set or array with valid keys of type string // could be drawn from db or json
    fi.register(require('fastify-bearer-auth'), { keys }) // only apply token requirement to this fastify instance (fi)
    fi.post('/pin/', opts, async (request, reply) => {
      const publicKey = request.body.rootKey
      const latest = await fastify.setUp(publicKey)
      reply.send({ latest }) // posted: request.body.query.rootKey
    })

    done()
  })

  // curl -H "Authorization: Bearer thetokenhere" -X GET https://super.peerpiper.io/pins/
  fastify.get('/pins/',
    async (request, reply) => {
      let out = ''
      for (const inst of hypnsNode.instances.values()) {
        if (inst.latest) {
          out += `\n<br />${inst.latest.timestamp} ${inst.publicKey}: ${inst.latest.text}`
        } else {
          out += `\n<br />${inst.publicKey}: ${inst.latest}`
        }
      }

      console.log('** Pins/Out: ', out)

      reply
        .code(200)
        .type('text/html')
        .send(out)
    }
  )

  fastify.get('/latest/', { schema: { querystring: { rootKey: { type: 'string' } } } },
    async function (request, reply) {
      const publicKey = request.querystring.rootKey
      const latest = hypnsNode.instances.get(publicKey).latest
      console.log(`** GET Latest ${publicKey}: ${latest}`)
      reply.send({ latest })
    }
  )

  done()
}
