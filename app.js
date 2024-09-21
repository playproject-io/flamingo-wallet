const { WebSocketServer } = require('ws')
const b4a = require('b4a')

async function start () {
  document.querySelector('h1').addEventListener('click', (e) => { location = location })
  console.log({Pear})
  // console.log({worker: Pear.config.links.worker})
  // const pipe = Pear.worker.run(Pear.config.links.worker)
  const pipe = Pear.worker.run('../core-lightning/index.js')
  pipe.on('data', (data) => {
    console.log('pipe on data', b4a.toString(data, 'utf-8'))
  })
  pipe.on('err', (err) => {
    console.log('pipe on err', err)
  })
  console.log({pipe})
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
  const el = document.querySelector('h2')
  el.addEventListener('click', (e) => { 
    el.innerHTML = `Copied ${wsUri}`
    navigator.clipboard.writeText(wsUri);
  })
}

start()