const fastifyPlugin = require('fastify-plugin')
const fs = require('fs-extra')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const file = '.data/db.json'
fs.ensureFileSync(file)

const adapter = new FileSync('.data/db.json')

async function dbConnector (fastify, options, done) {
  const db = low(adapter)

  // Set some defaults
  if (db.get('pins').size().value() < 1) { db.defaults({ pins: {} }).write() }

  fastify.decorate('db', db)

  done()
}

// Wrapping a plugin function with fastify-plugin exposes the decorators
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(dbConnector)
