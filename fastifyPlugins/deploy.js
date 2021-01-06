const { execSync } = require('child_process')

module.exports = function (fastify, options, done) {
  // a hook to deploy new scripts to Glitch.com
  fastify.post('/deploy', { schema: { query: { secret: { type: 'string' } } } }, (request, reply) => {
    if (request.query.secret !== process.env.SECRET) {
      reply.code(401).send()
      return
    }

    if (request.body.ref !== 'refs/heads/glitch') {
      reply.send('Push was not to glitch branch, so did not deploy.')
      return
    }

    const repoUrl = request.body.repository.git_url

    console.log('Fetching latest changes.')
    const output = execSync(
      `git checkout -- ./ && git pull -X theirs ${repoUrl} glitch && refresh`
    ).toString()
    console.log(output)
    reply.send() // sends 200 by default
  })

  done()
}
