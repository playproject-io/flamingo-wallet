const b4a = require('b4a')
const Hyperdrive = require('hyperdrive')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const Hypercore = require('hypercore')
const fs = require('fs')
const sodium = require('sodium-universal')
const derive_seed = require('derive-key')
const crypto = require("hypercore-crypto")
const c = require('compact-encoding')
const {
  make_protocol,
  create_and_open_channel
} = require('./lib/mux-proto.js')

async function start () {
  const opts = { 
    namespace: 'noisekeys', 
    seed: crypto.randomBytes(32), 
    name: 'noise' 
  }
  const { publicKey, secretKey } = create_noise_keypair (opts)
  const new_invite = crypto.randomBytes(4).toString('hex') 
                          + '?pk=' + publicKey.toString('hex')
  console.log({ publicKey: publicKey.toString('hex')})
  console.log({ new_invite })
  const keyPair = { publicKey, secretKey }
  swarm = new Hyperswarm({ keyPair })
  const store = new Corestore('./foo_storage')
  var one
  
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
    //protomux
    const replicationStream = Hypercore.createProtocolStream(socket, { ondiscoverykey: () => {
      console.log('peer is a server')
    } })    
    const mux = Hypercore.getProtocolMuxer(replicationStream)
    make_protocol({ mux, opts: { protocol: 'flamingo/alpha' }, cb })
    function cb () {
      const channel = create_and_open_channel ({ mux, opts: { protocol: 'flamingo/alpha' } })
      one = channel.addMessage({ encoding: c.string, onmessage })
      one.send(JSON.stringify({ type: 'invite', data: '9de745be3f9b1207'}))
    }
  })
  await swarm.listen()

  async function onmessage (message) {
    console.log({ message })
    const { type, data } = JSON.parse(message)
    if (type === 'invite') {
    } else if (type === 'profile') {
      one.send(JSON.stringify({ type: 'profile', data: drive.core.key.toString('hex') }))
    } else if (type === '') {
    }
  }
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

