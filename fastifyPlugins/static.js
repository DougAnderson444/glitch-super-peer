const path = require('path')

module.exports = function (fastify, options, done) {
  fastify.register(require('fastify-static'), {
    root: path.resolve(__dirname, '../public') // path.normalize()  path.join(__dirname, '../public')
    // prefix: '/public/' // optional: default '/'
  })

  fastify.get('/', function (req, reply) {
    reply.sendFile('index.html')
  })

  done()
}
