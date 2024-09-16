const { WebSocketServer } = require('ws')

async function start () {
  document.querySelector('h1').addEventListener('click', (e) => { location = location })
  
  const wss = new WebSocketServer({ port: 8080 });
  wss.on('connection', async (ws) => {
    console.log('connected')
    ws.on('message', function message(data) {
      console.log('received: %s', data);
    });
  });
  
  const wsUri = 'ws://localhost:8080'
  const clientsocket = new WebSocket(wsUri)
  clientsocket.onopen = async () => {
    console.log('socket opened')
    const msg = {
      type: 'message',
      text: 'hello there'
    }
    clientsocket.send('something');
  }




  // const wsUri = "http://192.168.1.182:9966/"
  // const wsUri = "http://localhost:9342/"
  // const websocket = new WebSocket(wsUri)
  // window.ws = websocket
  // console.log({websocket})
  // websocket.onopen = async () => {
  //   console.log('socket opened')
  //   const msg = {
  //     type: 'message',
  //     text: 'hello there'
  //   }
  //   websocket.send(JSON.stringify(msg))
  // }
  // websocket.onmessage = (e) => {
  //   console.log('onmessage')
  //   const msg = JSON.parse(e.data)
  //   console.log('new message', msg.type)
  // }
  // websocket.onerror = (err) => {
  //   console.log({err})
  // }
  // websocket.onclose = (err) => {
  //   console.log('socket closed')
  // }
}

start()