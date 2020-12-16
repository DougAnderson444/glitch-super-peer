const path = require('path')

module.exports = function (fastify, options, done) {
  fastify.register(require('fastify-static'), {
    root: path.resolve(__dirname, '../public') // path.normalize()  path.join(__dirname, '../public')
    // prefix: '/public/' // optional: default '/'
  })

  fastify.get('/', function (req, reply) {
    reply.sendFile('index.html')
  })

  fastify.get('/pins', function (request, reply) {
    console.log('*** getting pins ***')
    const pins = fastify.db.get('pins').value() // Find all publicKeys pinned in the collection
    console.log('*** pins ***', pins)
    reply.send(pins) // sends pins back to the page
  })

  // removes all entries from the collection
  fastify.get('/clear', function (request, reply) {
    // removes all entries from the collection
    fastify.db.get('pins')
      .remove()
      .write()
    console.log('Database cleared')
    reply.redirect('/')
  })

  done()
}
