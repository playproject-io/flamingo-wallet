const { WebSocketServer } = require('ws')
const b4a = require('b4a')

async function start () {
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

  // console.log('request list of wallets')
  // pipe.write(JSON.stringify({ type: 'listwallets' }))

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
    pipe.write(JSON.stringify({ type: 'new_wallet', data: `${val}` }))
  })
  
  const load_wallet_btn = document.querySelector('button.load-wallet')
  load_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.load-wallet').value
    pipe.write(JSON.stringify({ type: 'load_wallet', data: `${val}` }))
  })
  
  const pay_wallet_btn = document.querySelector('button.pay-wallet')
  pay_wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const amount = document.querySelector('input.pay-amount-wallet').value
    const address = document.querySelector('input.pay-address-wallet').value
    const wallet = document.querySelector('select.dropdown').selectedOptions[0].value
    const data = { amount, address, wallet }
    pipe.write(JSON.stringify({ type: 'pay', data }))
  })
}

start()

function kill_processes (pipe) {
  pipe.destroy()
}

function start_worker (path, name) {
  const pipe = Pear.worker.run(path)
  pipe.on('data', (data) => {
    console.log(`data from ${name}:`, b4a.toString(data, 'utf-8'))
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

function parser (msg) {
  msg = b4a.toString(msg, 'utf-8')
  msg = JSON.parse(msg)
  console.log({type: msg.type})
  if (msg.type === 'wallets') {
    const data = JSON.parse(msg.data)
    console.log('wallets list', data)
    let wallets_select = document.querySelector('select.dropdown')
    for (const wallet of data) {
      const el = document.createElement('option')
      el.innerHTML = `<option>${wallet}</option>`
      wallets_select.appendChild(el)
    }
  }
  else if (msg.type === 'new wallet') {
    const data = JSON.parse(msg.data)
    let wallets_select = document.querySelector('select.dropdown')
    const el = document.createElement('option')
    el.innerHTML = `<option>${data.name}</option>`
    wallets_select.appendChild(el)
  }
  else if (msg.type === 'load wallet') {
    const data = JSON.parse(msg.data)
    const options = document.querySelectorAll('select.dropdown')
    const len = options.length
    console.log({name: data.name, msg})
    for (var i = 0; i < len; i++) {
      if (options[i].value === data.name) return
    }
    let wallets_select = document.querySelector('select.dropdown')
    const el = document.createElement('option')
    el.innerHTML = `<option>${data.name}</option>`
    wallets_select.appendChild(el)
  }
  // console.log({data})
}