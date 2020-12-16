const port = 3001
const fastify = require('fastify')({
  logger: { level: 'info', prettyPrint: true }
})

// Hypns will connect us to the network and pin the data
const HyPNS = require('hypns')
// Security note: It's deliberately placed in the `.data` directory which doesn't get copied if someone remixes the project.
const hypnsNode = new HyPNS({ persist: true, applicationName: '.data/hypnsapp' })

// setup a new lowdatabase
// persisted using file storage
// Deliberately placed in the `.data` directory which doesn't get copied if someone remixes the project.
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('.data/db.json')
const db = low(adapter)

// Set some defaults // does this overwrite?
if (db.get('pins').size().value() < 1) { db.defaults({ pins: {} }).write() }

const getLatest = (publicKey) => {
  return hypnsNode.instances.get(publicKey).latest
}

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
      db.set(`pins.${publicKey}`, instance.latest)
        .write()
    })
  }
  console.log(`2. Listener count ${instance.listenerCount('update')} on ${instance.key}`)

  db.set(`pins.${publicKey}`, instance.latest).write()
  console.log('** Setup COMPLETE ** \n', instance.publicKey, ` pins.size: [${db.get('pins').size().value()}]`)
  return instance.latest
}

// load list from storage and initialize the node
const init = async () => {
  const pins = db.get('pins').value() // Find all publicKeys pinned in the collection
  Object.keys(pins).forEach((key) => {
    // skip if it's already configured on this node
    if (!hypnsNode.instances.has(key)) { setUp(key) }
  })
}

init()

// const helmet = require('fastify-helmet')
// fastify.register(helmet, {
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", 'glitch.me', '*.glitch.me', '*.jquery.com'],
//       objectSrc: ["'none'"],
//       styleSrc: ['unsafe-inline'],
//       styleSrcElem: ['unsafe-inline'],
//       upgradeInsecureRequests: []
//     }
//   }
// })

fastify.decorate('setUp', setUp)
fastify.decorate('getLatest', getLatest)

fastify.register(require('fastify-cors'), { origin: '*' })

fastify.register(require('./fastifyPlugins/static.js'))
fastify.register(require('./fastifyPlugins/main.js'))

fastify.get('/pins', function (request, reply) {
  console.log('*** getting pins ***')
  const pins = db.get('pins').value() // Find all publicKeys pinned in the collection
  console.log('*** pins ***', pins)
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

// Run the server!
fastify.listen(port, '::', function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})
