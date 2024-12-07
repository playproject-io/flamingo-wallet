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
  const wss_btn = document.querySelector('button.wss')
  wss_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    wss_btn.innerHTML = `Copied ${wsUri}`
    navigator.clipboard.writeText(wsUri);
  })
  const wallet_btn = document.querySelector('button.wallet')
  wallet_btn.addEventListener('click', (e) => { 
    e.stopPropagation()
    const val = document.querySelector('input.wallet').value
    pipe.write(JSON.stringify({ type: 'create_wallet', data: `${val}` }))
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

function parser (data) {
  data = b4a.toString(data, 'utf-8')
  data = JSON.parse(data)
  console.log({type: data.type})
  // console.log({data})
}