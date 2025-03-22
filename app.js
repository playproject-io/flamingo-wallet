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


async function start () {
  var swarm
  var store
  var cores
  var mydrive 
  var db
  var one
  var mux
  const opts = { 
    namespace: 'noisekeys', 
    seed: crypto.randomBytes(32), 
    name: 'noise' 
  }
  const { publicKey, secretKey } = create_noise_keypair (opts)
  const keyPair = { publicKey, secretKey }
  console.log('My profile', publicKey.toString('hex'))
  store = new Corestore('./storage')
  swarm = new Hyperswarm({ keyPair })
  swarm.on('connection', async (socket, info) => {
    socket.on('error', (err) => console.log('socket error', err))
    socket.on('close', () => console.log('Socket closed'))
    console.log({conn: 'onconnection', pubkey: info.publicKey.toString('hex')})
    //protomux
    const replicationStream = Hypercore.createProtocolStream(socket, { ondiscoverykey: () => {
      console.log('peer is a server')
    } })
    mux = Hypercore.getProtocolMuxer(replicationStream)
    make_protocol({ mux, opts: { protocol: 'flamingo/alpha' }, cb })
    console.log('🚀 Attempting to start store replication...')
    store.replicate(replicationStream)
    console.log('✅ Store replication started!')
    async function cb () {
      const channel = create_and_open_channel ({ mux, opts: { protocol: 'flamingo/alpha' } })
      one = channel.addMessage({ encoding: c.string, onmessage: (message) => onmessage(message, replicationStream) })
      // var codes = await db.get('codes')
      // if (!codes) codes = []
      // else codes = JSON.parse(codes.value.toString('utf8'))
      // if (codes.includes(code)) {
      //   console.log('invite codes match')
      // }
    }
  })
  await swarm.listen()

  mydrive = new Hyperdrive(store)
  await mydrive.ready()
  const file = await mydrive.get('/profile/name')
  if (!file) {
    await mydrive.put('/profile/name', b4a.from('Nina Breznik'))
    await mydrive.put('/profile/pubkey', b4a.from(publicKey.toString('hex')))
    const imageBuffer = fs.readFileSync('./assets/avatar.jpg');
    await mydrive.put('/profile/avatar', imageBuffer)
    const name = await mydrive.get('/profile/name')
    const pubkey = await mydrive.get('/profile/pubkey')
    const key = mydrive.core.key
    await mydrive.put('/feedkey', key)
    console.log('get profile/name', name.toString(), key.toString('hex'))
    console.log('get profile/pubkey', pubkey.toString())
  }

  swarm.join(mydrive.discoveryKey, { server: true, client: false })
  await swarm.flush()

  if (!db) {
    cores = store.namespace('cores')
    const core = cores.get({ name: 'bee-1' })
    db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await db.ready()
    window.db = db
  }
  document.querySelector('button.refresh').addEventListener('click', (e) => { 
    e.stopPropagation()
    location = location 
  })
  console.log('Hello Pear', {Pear})
  // console.log({worker: Pear.config.links.worker})
  // const pipe = Pear.worker.run(Pear.config.links.worker)

  // START CORE_LIGHTNING WORKER
  // const pipe = start_worker('./core-lightning/index.js', 'core lightning node')

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
  const my_name = await mydrive.get('/profile/name')
  name.innerHTML = `${my_name.toString()}`

  const add_contact = document.querySelector('.add-new-contact')
  add_contact.addEventListener('click', async (e) => { 
    e.stopPropagation()
    const invite_code = document.querySelector('input.new-contact').value
    const pk = invite_code.split('?pk=')[1]
    const code = invite_code.split('?pk=')[0]
    var contacts = await db.get('contacts')
    if (!contacts) contacts = []
    else contacts = JSON.parse(contacts.value.toString())
    contacts.push(pk)
    await db.put('contacts', b4a.from(JSON.stringify(contacts)))
    swarm.joinPeer(b4a.from(pk, 'hex'))
    await swarm.flush()
    one.send(JSON.stringify({ type: 'invite', data: code }))
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
  var codes = await db.get('codes')
  if (!codes) codes = []
  else codes = JSON.parse(codes.value.toString('utf8'))
  const el = document.createElement('div')
  for (const code of codes) {
    el.innerHTML = `
      <div class="invite">
        <div class="name">${code}</div>
      </div>`
    invite_codes_list.append(el)
  }

  const add_invite = document.querySelector('.add-new-invite')
  add_invite.addEventListener('click', async (e) => { 
    e.stopPropagation()
    // generate invite
    const code = crypto.randomBytes(4).toString('hex') 
    const new_invite = code + '?pk=' + publicKey.toString('hex')
    codes.push(code)
    await db.put('codes', b4a.from(JSON.stringify(codes)))
    const el = document.createElement('div')
    el.innerHTML = `
    <div class="invite">
      <div class="name">${new_invite}</div>
    </div>`
    invite_codes_list.append(el)
  })

  async function onmessage (message, replicationStream) { //protomux
    console.log({ message })
    const { type, data } = JSON.parse(message)
    if (type === 'invite') {
      var codes = await db.get('codes')
      if (!codes) codes = []
      else codes = JSON.parse(codes.value.toString('utf8'))
      if (codes.includes(data)) {
        console.log('invite codes match')
        one.send(JSON.stringify({ type: 'accepted', data: mydrive.core.key.toString('hex') }))
      }
    } 
    else if (type === 'accepted') {
      const clonedDrive = await replicate_drive(data, replicationStream)
      const { profileName, pubkey } = await get_and_append_profile(clonedDrive)
      console.log({pubkey})
      // const core = cores.get({ name: pubkey })
      // console.log('core created')
      // await core.ready()
      // await core.append('hello world')
      // one.send(JSON.stringify({ type: 'core', data: { name: profileName, key:core.key.toString('hex') } }))
      one.send(JSON.stringify({ type: 'profile', data: mydrive.core.key.toString('hex') }))
    } 
    else if (type === 'profile') {
      // one.send(JSON.stringify({ type: 'profile', data: mydrive.core.key.toString('hex') }))
      const clonedDrive = await replicate_drive(data, replicationStream)
      const { profileName, pubkey } = await get_and_append_profile(clonedDrive)
      console.log({pubkey})
      // const core = cores.get({ name: pubkey })
      // console.log('core created')
      // await core.ready()
      // await core.append('hello world')
      // one.send(JSON.stringify({ type: 'core', data: { name: profileName, key:core.key.toString('hex') } }))
    }
    else if (type === 'core') {
      const { pubkey, key } = data
      const clonedCore = cores.get(b4a.from(key, 'hex'))
      const block = await clonedCore.get(0)
      console.log({block: block.toString()})
    }
  }

  async function replicate_drive(data, replicationStream) {
    const key = data;
    console.log("📡 Attempting to replicate drive with key:", key);

    // Create namespaced store
    const clonedStore = store.namespace('profile');
    const clonedDrive = new Hyperdrive(clonedStore, b4a.from(key, 'hex'));
    
    await clonedDrive.ready();
    
    console.log("🔄 Joining swarm for", clonedDrive.discoveryKey.toString('hex'));
    swarm.join(clonedDrive.discoveryKey, { server: false, client: true });

    // Replicate the namespaced store (not the main store)
    clonedStore.replicate(replicationStream);

    console.log("⏳ Finding peers...");
    const timeout = new Promise((resolve) => setTimeout(resolve, 10000)); // 10s timeout
    await Promise.race([clonedDrive.findingPeers(), timeout]);

    console.log("✅ Replication started!");
    return clonedDrive;
  }

  async function get_and_append_profile(clonedDrive) {
    return new Promise (async (resolve, reject) => {
      await clonedDrive.ready();
      console.log("🔄 Waiting for profile data...");
  
      // Retry mechanism for slow replication
      clonedDrive.core.on('append', async () => {
        console.log("📥 New data received!");
  
        const profileName = await clonedDrive.get('/profile/name');
        if (profileName) {
          console.log("✅ Successfully fetched profile:", profileName.toString());
  
          const imageBuffer = await clonedDrive.get('/profile/avatar').catch((err) => console.log({ err }));
          if (imageBuffer) {
            const blob = new Blob([imageBuffer]);
            const url = URL.createObjectURL(blob);
  
            const el = document.createElement('div');
            el.innerHTML = `
              <div class="contact">
                <img class="avatar" src=${url}></img>
                <div class="name">${profileName.toString()}</div>
              </div>`;
            document.querySelector('.contact-list').append(el);
          }
          const pubkey = await clonedDrive.get('/profile/pubkey')
          resolve({ profileName, pubkey: pubkey.toString('hex') })
        } else {
          console.log("❌ Profile still missing...")
          reject()
        }
      });
    })
  }

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