import childProcess from 'child_process'

const ganache = childProcess.spawn('ganache-cli', ['--gasLimit', '8000000', '--port', '6545'])

const test = childProcess.spawn('truffle', ['test', '--network', 'test'])
test.stdout.pipe(process.stdout)
test.stderr.pipe(process.stderr)
test.on('exit', (code) => {
  ganache.kill()
  process.exit(code!)
})
