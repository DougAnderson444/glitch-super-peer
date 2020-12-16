module.exports = function (fastify, options, done) {
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
      for (const inst of fastify.instances.values()) {
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
      const latest = fastify.getLatest(publicKey)
      console.log(`** GET Latest ${publicKey}: ${latest}`)
      reply.send({ latest })
    }
  )

  done()
}
