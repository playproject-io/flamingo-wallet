const { WebSocketServer } = require('ws')

async function start () {
  document.querySelector('h1').addEventListener('click', (e) => { location = location })
  
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