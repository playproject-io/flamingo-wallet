const b4a = require('b4a')
const Hyperdrive = require('hyperdrive')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const fs = require('fs')
const sodium = require('sodium-universal')
const derive_seed = require('derive-key')
const crypto = require("hypercore-crypto")

async function start () {
  const opts = { 
    namespace: 'noisekeys', 
    seed: crypto.randomBytes(32), 
    name: 'noise' 
  }
  const { publicKey, secretKey } = create_noise_keypair (opts)
  console.log({ publicKey: publicKey.toString('hex')})
  const keyPair = { publicKey, secretKey }
  swarm = new Hyperswarm({ keyPair })
  const store = new Corestore('./foo_storage')
  const drive = new Hyperdrive(store)
  await drive.ready()
  await drive.put('/profile/name', b4a.from('Yuna Sky Berlin'))
  const imageBuffer = fs.readFileSync('./assets/avatar.jpg');
  await drive.put('/profile/avatar', imageBuffer)
  const key = drive.core.key
  console.log('Hyperdrive key', key.toString('hex'))
  console.log('Swarm key', drive.discoveryKey.toString('hex'))
  swarm.on('connection', async (socket, info) => {
    socket.on('error', (err) => console.log('socket error', err))
    console.log({conn: 'onconnection', pubkey: info.publicKey.toString('hex')})
    store.replicate(socket)
  })
  await swarm.listen()
}

start()

///////////////////////

function create_noise_keypair ({ namespace, seed, name }) {
  const noiseSeed = derive_seed(namespace, seed, name)
  const publicKey = b4a.alloc(32)
  const secretKey = b4a.alloc(64)
  if (noiseSeed) sodium.crypto_sign_seed_keypair(publicKey, secretKey, noiseSeed)
  else sodium.crypto_sign_keypair(publicKey, secretKey)
  return { publicKey, secretKey }
}