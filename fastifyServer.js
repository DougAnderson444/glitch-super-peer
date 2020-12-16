const port = 3001
const fastify = require('fastify')({
  logger: { level: 'info', prettyPrint: true }
})

// setup a new lowdatabase
// persisted using file storage
// Deliberately placed in the `.data` directory which doesn't get copied if someone remixes the project.
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('.data/db.json')
const db = low(adapter)

// Set some defaults // does this overwrite?
if (db.get('pins').size().value() < 1) { db.defaults({ pins: {} }).write() }

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

fastify.decorate('db', db)

fastify.register(require('fastify-cors'), { origin: '*' })

fastify.register(require('./fastifyPlugins/static.js'))
fastify.register(require('./fastifyPlugins/main.js'))

// Run the server!
fastify.listen(port, '::', function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  fastify.log.info(`server listening on ${address}`)
})
