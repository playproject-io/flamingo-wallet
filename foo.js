const b4a = require('b4a')
const Hyperdrive = require('hyperdrive')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const fs = require('fs')

async function start () {
  const swarm = new Hyperswarm()
  const store = new Corestore('./foo_storage')
  const drive = new Hyperdrive(store)
  await drive.put('/profile/name', b4a.from('Yuna Sky Berlin'))
  const imageBuffer = fs.readFileSync('./assets/avatar.jpg');
  await drive.put('/profile/avatar', imageBuffer)
  const key = drive.core.key
  console.log('Yuna Sky', key.toString('hex'))
  console.log('Swarm', drive.discoveryKey.toString('hex'))
  swarm.join(drive.discoveryKey, { server: true, client: false})
  swarm.on('connection', async (socket, info) => {
    store.replicate(socket)
  })
}

start()