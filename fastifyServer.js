const path = require('path')

const HyPNS = require('hypns')
const fastify = require('fastify')({
  // logger: { level: 'info', prettyPrint: true }
  // logger: { prettyPrint: true }
})

const fs = require('fs-extra')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const file = '.data/db.json'
fs.ensureFileSync(file)
const adapter = new FileSync('.data/db.json')
const db = low(adapter)
// Set some defaults
if (db.get('pins').size().value() < 1) { db.defaults({ pins: {} }).write() }

fastify.decorate('hypnsNode', new HyPNS({ persist: true, applicationName: '.data/hypnsapp' })) // , applicationName: '.data/hypnsapp'
fastify.decorate('instances', new Map())

fastify.register(require('fastify-helmet'),
  // Example disables the `contentSecurityPolicy` middleware but keeps the rest.
  { contentSecurityPolicy: false })
fastify.register(require('fastify-cors'), { origin: '*' })
fastify.register(require('./fastifyPlugins/deploy.js'))

fastify.register((fi, options, done) => {
  const setUp = async (publicKey) => {
    // skip if it's already configured on this node
    if (fastify.hypnsNode.instances.has(publicKey)) {
      return fastify.hypnsNode.instances.get(publicKey).latest
    }
    const instance = await fastify.hypnsNode.open({ keypair: { publicKey } })
    await instance.ready()

    // skip if the instance is already listening
    if (instance.listenerCount('update') > 0) return

    instance.on('update', (val) => {
      console.log('Update ', instance.publicKey, ` latest:${instance.latest.timestamp} ${instance.latest.text}`)
      db.set(`pins.${publicKey}`, instance.latest)
        .write()
    })

    fastify.instances.set(instance.publicKey, instance)
    db.set(`pins.${publicKey}`, instance.latest).write()
    console.log('** Setup COMPLETE: ', instance.publicKey, ` pins.size: [${db.get('pins').size().value()}]`)
    return instance.latest
  }

  // load list from storage and initialize the node
  const init = async () => {
    const pins = db.get('pins').value() // Find all publicKeys pinned in the collection
    Object.keys(pins).forEach((key) => {
      setUp(key)
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
      headers: {
        type: 'object',
        properties: {
          Authorization: { type: 'string' }
        },
        required: ['Authorization']
      }
    }
  }
  const keys = new Set([process.env.TOKEN])
  fi.register(require('fastify-bearer-auth'), { keys }) // only apply token requirement to this fastify instance (fi)
  fi.post('/pin/', opts, async (request, reply) => {
    const publicKey = request.body.rootKey
    const latest = await setUp(publicKey)
    reply.send({ latest })
  })

  done()
})

fastify.get('/pins', function (request, reply) {
  const pins = db.get('pins').value() // Find all publicKeys pinned in the collection
  reply.send(pins) // sends pins back to the page
})

// removes all entries from the collection
fastify.get('/clear', function (request, reply) {
  // removes all entries from the collection
  db.get('pins')
    .remove()
    .write()
  console.log('Database cleared')
  reply.redirect('/')
})

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, '/public')
})

fastify.get('/', function (req, reply) {
  reply.sendFile('index.html')
})

// Run the server!
fastify.listen(process.env.PORT, '::', function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
  console.log(`server listening on ${address}`)
})
