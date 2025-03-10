const { WebSocketServer } = require('ws')
const b4a = require('b4a')
const fs = require('fs')
const Hyperdrive = require('hyperdrive')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const Hypercore = require('hypercore')
const Hyperswarm = require('hyperswarm')
const RAM = require('random-access-memory')
const sodium = require('sodium-universal')
const derive_seed = require('derive-key')
const crypto = require("hypercore-crypto")
const c = require('compact-encoding')
const {
  make_protocol,
  create_and_open_channel
} = require('./lib/mux-proto.js')

var swarm
var store
var drive 
var db

async function start () {
  const opts = { 
    namespace: 'noisekeys', 
    seed: crypto.randomBytes(32), 
    name: 'noise' 
   }
  const { publicKey, secretKey } = create_noise_keypair (opts)
  const keyPair = { publicKey, secretKey }
  console.log('My profile', publicKey.toString('hex'))
  swarm = new Hyperswarm({ keyPair })
  store = new Corestore('./storage')
  drive = new Hyperdrive(store)
  await drive.ready()
  const file = await drive.get('/profile/name')
  if (!file) {
    await drive.put('/profile/name', b4a.from('Nina Breznik'))
    const imageBuffer = fs.readFileSync('./assets/avatar.jpg');
    await drive.put('/profile/avatar', imageBuffer)
    const name = await drive.get('/profile/name')
    const key = drive.core.key
    await drive.put('/feedkey', key)
    console.log('get profile/name', name.toString(), key.toString('hex'))
  }

  if (!db) {
    const feed = store.get({ name: 'feed-1' })
    db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  }
  document.querySelector('button.refresh').addEventListener('click', (e) => { 
    e.stopPropagation()
    location = location 
  })
  console.log('Hello Pear', {Pear})
  // console.log({worker: Pear.config.links.worker})
  // const pipe = Pear.worker.run(Pear.config.links.worker)

  // START CORE_LIGHTNING WORKER
  const pipe = start_worker('./core-lightning/index.js', 'core lightning node')

  const wss = new WebSocketServer({ port: 8080 });
  wss.on('connection', async (ws) => {
    console.log('connected')
    ws.on('message', function message(data) {
      console.log('received: %s', data)
      const res = {
        type: 'message',
        text: 'Nice to meet you'
      }
      ws.send(JSON.stringify(res))
    });
  });
  
  const wsUri = 'ws://localhost:8080'

  const avatar = document.querySelector('.avatar')
  const imageBuffer = fs.readFileSync('./assets/avatar.jpg')
  const blob = new Blob([imageBuffer])
  const url = URL.createObjectURL(blob);
  avatar.src = url
  const name = document.querySelector('.name')
  const my_name = await drive.get('/profile/name')
  name.innerHTML = `${my_name.toString()}`

  const add_contact = document.querySelector('.add-new-contact')
  add_contact.addEventListener('click', async (e) => { 
    e.stopPropagation()
    const address = document.querySelector('input.new-contact').value
    const key = document.querySelector('input.hyperdrive').value
    var contacts = await db.get('contacts')
    if (!contacts) contacts = []
    else contacts = JSON.parse(contacts.value.toString())
    contacts.push(address)
    await db.put('contacts', b4a.from(JSON.stringify(contacts)))
    const list = document.querySelector('.contact-list')

    const store = new Corestore(RAM)
    const drive = new Hyperdrive(store, b4a.from(key, 'hex'))
    await drive.ready()
    const done = drive.findingPeers()
    
    swarm.on('connection', async (socket, info) => {
      socket.on('error', (err) => console.log('socket error', err))
      console.log({conn: 'onconnection', pubkey: info.publicKey.toString('hex')})
      if (info.publicKey.toString('hex') === address) {
        store.replicate(socket)
        const imageBuffer = await drive.get('/profile/avatar')
        const blob = new Blob([imageBuffer])
        const url = URL.createObjectURL(blob);
        const name = await drive.get('/profile/name')
        const el = document.createElement('div')
        el.innerHTML = `
          <div class="contact">
            <img class="avatar" src=${url}></img>
            <div class="name">${name.toString()}</div>
          </div>`
        list.append(el)
        //protomux
        const replicationStream = Hypercore.createProtocolStream(socket, { ondiscoverykey: () => {
          // peer is a server
          console.log('peer is a server')
        } })
        const mux = Hypercore.getProtocolMuxer(replicationStream)
        make_protocol({ mux, opts: { protocol: 'flamingo/alpha' }, cb })
        function cb () {
          const channel = create_and_open_channel ({ mux, opts: { protocol: 'flamingo/alpha' } })
          const one = channel.addMessage({ encoding: c.string, onmessage })
          one.send(JSON.stringify({ type: 'invite', data: 'a3fdjkvn32em'}))
        }
      }
    })
    await swarm.joinPeer(b4a.from(address, 'hex'))
    await swarm.flush()
  })

  const wss_btn = document.querySelector('button.wss')
  wss_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    wss_btn.innerHTML = `Copied ${wsUri}`
    navigator.clipboard.writeText(wsUri);
  })

  const new_wallet_btn = document.querySelector('button.new-wallet')
  new_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.new-wallet').value
    pipe.write(JSON.stringify({ type: 'new wallet', data: `${val}` }))
  })
  
  const load_wallet_btn = document.querySelector('button.load-wallet')
  load_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.load-wallet').value
    pipe.write(JSON.stringify({ type: 'load wallet', data: `${val}` }))
  })
  
  const send_wallet_btn = document.querySelector('button.send-btc-wallet')
  send_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const amount = document.querySelector('input.send-btc-amount-wallet').value
    const address = document.querySelector('input.send-btc-address-wallet').value
    const wallet = document.querySelector('.send-btc-wallets').selectedOptions[0].value
    const data = { amount, address, wallet }
    pipe.write(JSON.stringify({ type: 'send btc', data }))
  })

  const receive_btc_wallets = document.querySelector('.receive-btc-wallets')
  receive_btc_wallets.addEventListener('change', (e) => { 
    e.stopPropagation()
    const selection = document.querySelector('.receive-btc-wallets').selectedOptions[0].value
    pipe.write(JSON.stringify({ type: 'selected', data: selection }))
    const addr_dropdown = document.querySelector('.receive-dropdown-address')
    addr_dropdown.style.display = 'inline'
  })

  const addr_dropdown = document.querySelector('.receive-dropdown-address')
  addr_dropdown.addEventListener('click', (e) => {
    e.stopPropagation()
    const selection = document.querySelector('.receive-dropdown-address').selectedOptions[0]
    const val = selection.value
    const address = val.split(',')[0]
    console.log({ address })
    setTimeout(() => {
      navigator.clipboard.writeText(address)
    }, 0)
  })

  const create_addr = document.querySelector('.create-lightning-address')
  create_addr.addEventListener('click', (e) => { 
    e.stopPropagation()
    pipe.write(JSON.stringify({ type: 'create addr' }))
  })

  const create_invoice = document.querySelector('.create-invoice')
  create_invoice.addEventListener('click', (e) => { 
    e.stopPropagation()
    const amount = document.querySelector('input.invoice-amount').value
    const label = document.querySelector('input.invoice-label').value
    const desc = document.querySelector('input.invoice-desc').value
    const data = { amount, label, desc }
    console.log({data})
    pipe.write(JSON.stringify({ type: 'create invoice', data }))
  })

  const pay_invoice = document.querySelector('.pay-invoice')
  pay_invoice.addEventListener('click', (e) => { 
    e.stopPropagation()
    const ln = document.querySelector('input.ln-invoice').value
    pipe.write(JSON.stringify({ type: 'pay invoice', data: ln }))
  })

  const invite_codes_list = document.querySelector('.invite-codes-list')
  var invites = await db.get('invites')
  if (!invites) invites = []
  else invites = JSON.parse(invites.value.toString())
  const el = document.createElement('div')
  for (const invite of invites) {
    el.innerHTML = `
      <div class="invite">
        <div class="name">${invite}</div>
      </div>`
    invite_codes_list.append(el)
  }

  const add_invite = document.querySelector('.add-new-invite')
  add_invite.addEventListener('click', async (e) => { 
    e.stopPropagation()
    // generate invite
    const new_invite = crypto.randomBytes(8).toString('hex')
    invites.push(new_invite)
    await db.put('invites', b4a.from(JSON.stringify(invites)))
    const el = document.createElement('div')
    el.innerHTML = `
    <div class="invite">
      <div class="name">${new_invite}</div>
    </div>`
    invite_codes_list.append(el)
  })
}

start()

function kill_processes (pipe) {
  fs.rm('./storage', { recursive: true, force: true }, (err) => {
    if (!err) store = undefined
    fs.writeFileSync('./logs', err.toString())
  })
  fs.rm('./foo_storage', { recursive: true, force: true }, (err) => {
    if (!err) store = undefined
    fs.writeFileSync('./logs', err.toString())
  })
  store = undefined
  pipe.destroy()
}

function start_worker (path, name) {
  const pipe = Pear.worker.run(path)
  pipe.on('data', (data) => {
    console.log(`${name}:`, b4a.toString(data, 'utf-8'))
    parser(data)
  })
  pipe.on('err', (err) => {
    console.log(`err from ${name}:`, err)
  })

  process.on('SIGINT', () => kill_processes(pipe))
  process.on('SIGTERM', () => kill_processes(pipe))
  process.on('exit', () => kill_processes(pipe))
  
  return pipe
}

function create_noise_keypair ({ namespace, seed, name }) {
  const noiseSeed = derive_seed(namespace, seed, name)
  const publicKey = b4a.alloc(32)
  const secretKey = b4a.alloc(64)
  if (noiseSeed) sodium.crypto_sign_seed_keypair(publicKey, secretKey, noiseSeed)
  else sodium.crypto_sign_keypair(publicKey, secretKey)
  return { publicKey, secretKey }
}

function onmessage ({ message }) { //protomux
  const { type, data } = JSON.parse(message)
  if (type === 'invite') {

  } else if (type === '') {
  } else if (type === '') {
  }
}

function parser (msg) {
  msg = b4a.toString(msg, 'utf-8')
  msg = JSON.parse(msg)
  console.log({type: msg.type})
  if (msg.type === 'wallets') {
    console.log({ parser: msg.type, data: msg.data })
  } 
  if (msg.type === 'wallets') {
    const data = JSON.parse(msg.data)
    console.log('wallets list', data)
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')

    for (const wallet of data) {
      const el_1 = document.createElement('option')
      el_1.innerHTML = `${wallet}`
      send_btc_wallets.appendChild(el_1)
      const el_2 = document.createElement('option')
      el_2.innerHTML = `${wallet}`
      receive_btc_wallets.appendChild(el_2)
    }
  }
  else if (msg.type === 'new wallet') {
    const data = JSON.parse(msg.data)
    // send
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    const el_1 = document.createElement('option')
    el_1.innerHTML = `${data.name}`
    send_btc_wallets.appendChild(el_1)
    // receive
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')
    const el_2 = document.createElement('option')
    el_2.innerHTML = `${data.name}`
    receive_btc_wallets.appendChild(el_2)
  }
  else if (msg.type === 'load wallet') {
    const data = JSON.parse(msg.data)
    //send
    const options_1 = document.querySelectorAll('.send-btc-wallets')
    const len_1 = options_1.length
    for (var i = 0; i < len_1; i++) {
      if (options_1[i].value === data.name) return
    }
    let send_btc_wallets = document.querySelector('.send-btc-wallets')
    const el_1 = document.createElement('option')
    el_1.innerHTML = `${data.name}`
    send_btc_wallets.appendChild(el_1)
    // receive
    const options_2 = document.querySelectorAll('.receive-btc-wallets')
    const len_2 = options_2.length
    for (var i = 0; i < len_2; i++) {
      if (options_2[i].value === data.name) return
    }
    let receive_btc_wallets = document.querySelector('.receive-btc-wallets')
    const el_2 = document.createElement('option')
    el_2.innerHTML = `${data.name}`
    receive_btc_wallets.appendChild(el_2)
  }
  else if (msg.type === 'addresses btc') {
    const addr_dropdown = document.querySelector('.receive-dropdown-address')
    const arr = []
    for (const addr of JSON.parse(msg.data)) {
      const el = document.createElement('option')
      el.innerHTML = `${addr[0][0]}, (${addr[0][1]} BTC)`
      arr.push(el)
    }
    addr_dropdown.replaceChildren(...arr)
    // console.log({data})
  }
  else if (msg.type === 'address lightning') {
    const list = document.querySelector('.lightning-addr-list')
    const el = document.createElement('div')
    el.className = 'addr-list-item'
    const data = JSON.parse(msg.data).bech32
    el.innerHTML = data
    el.addEventListener("click", e => {
      e.stopPropagation()
      navigator.clipboard.writeText(data)
    })
    list.appendChild(el)
  }
  else if (msg.type === 'new invoice') {
    const data = JSON.parse(msg.data)
    console.log('New invoice', data)
    const list = document.querySelector('.invoices')
    const el = document.createElement('div')
    el.className = 'invoices-item'
    const ln = data.bolt11
    const len = ln.length
    const show = ln.substring(0,15) + `...` + ln.substring(len-15,len)
    el.addEventListener("click", e => {
      e.stopPropagation()
      navigator.clipboard.writeText(ln)
    })
    el.innerHTML = show
    list.appendChild(el)
  }
  else if (msg.type === 'invoice paid') {
    const data = JSON.parse(msg.data)
    console.log('Paid invoice', data)
    const list = document.querySelector('.receipts')
    const el = document.createElement('div')
    el.className = 'receipts-item'
    el.innerText = JSON.stringify(data, null, 2)
    list.appendChild(el)
  }
}