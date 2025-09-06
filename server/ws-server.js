const WebSocket = require('ws');
const wallet = require('../lib/node_modules/wallet'); 
const fs = require('fs');
const path = require('path');

const PORT = process.env.WS_PORT || 8080;
const MESSAGE_STORE = path.join(__dirname, 'message-store.json');

let persisted = loadStore();
const subscribers = {};

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(` WS server running on ws://localhost:${PORT}`);
});

wss.on('connection', (ws) => {
  console.log('🔌 client connected');
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ head: null, refs: null, type: 'error', data: { error: 'invalid JSON' } }));
      return;
    }
    if (msg.head) persistMessage(msg);
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    console.log('client disconnected');
    Object.keys(subscribers).forEach((ev) => subscribers[ev].delete(ws));
  });

  ws.send(JSON.stringify({ head: null, refs: null, type: 'welcome', data: { msg: 'connected' } }));
});


function loadStore() {
  try {
    if (fs.existsSync(MESSAGE_STORE)) {
      const raw = fs.readFileSync(MESSAGE_STORE, 'utf8');
      return JSON.parse(raw) || [];
    }
  } catch (e) {
    console.error('loadStore error', e);
  }
  return [];
}

function saveStore() {
  try {
    fs.writeFileSync(MESSAGE_STORE, JSON.stringify(persisted, null, 2));
  } catch (e) {
    console.error('saveStore error', e);
  }
}

function persistMessage(m) {
  const idx = persisted.findIndex((p) => p.head === m.head);
  if (idx === -1) {
    persisted.push({ ...m, ts: Date.now(), status: 'stored' });
  } else {
    persisted[idx] = { ...persisted[idx], ...m, status: 'updated' };
  }
  saveStore();
}


async function handleMessage(ws, m) {
  const { type, head, refs, data } = m;

  try {
    switch (type) {
      case 'echo':
        ws.send(JSON.stringify({ head, refs, type: 'echo-response', data }));
        break;

      case 'getinfo-lightning': {
        const result = await wallet.getInfoLightning();
        ws.send(JSON.stringify({ head, refs, type: 'getinfo-lightning-response', data: result }));
        break;
      }

      case 'getinfo-bitcoin': {
        const result = await wallet.getInfoBitcoin();
        ws.send(JSON.stringify({ head, refs, type: 'getinfo-bitcoin-response', data: result }));
        break;
      }

      case 'subscribe': {
        const ev = data && data.event ? data.event : 'node-status';
        subscribers[ev] = subscribers[ev] || new Set();
        subscribers[ev].add(ws);
        ws.send(JSON.stringify({ head, refs, type: 'subscribe-response', data: { subscribed: ev } }));
        break;
      }

      case 'unsubscribe': {
        const ev = data && data.event ? data.event : 'node-status';
        if (subscribers[ev]) subscribers[ev].delete(ws);
        ws.send(JSON.stringify({ head, refs, type: 'unsubscribe-response', data: { unsubscribed: ev } }));
        break;
      }

      case 'resume': {
        const sinceHead = data && data.sinceHead;
        let toSend;
        if (sinceHead) {
          const sinceMsg = persisted.find((p) => p.head === sinceHead);
          const sinceTs = sinceMsg ? sinceMsg.ts : 0;
          toSend = persisted.filter((p) => p.ts > sinceTs);
        } else {
          toSend = persisted;
        }
        toSend.forEach((item) => {
          ws.send(JSON.stringify({ head: item.head, refs: item.refs, type: 'resume-item', data: item.data || item }));
        });
        ws.send(JSON.stringify({ head, refs, type: 'resume-complete', data: { count: toSend.length } }));
        break;
      }

      default:
        ws.send(JSON.stringify({ head, refs, type: 'error', data: { error: 'unknown type: ' + type } }));
    }
  } catch (err) {
    ws.send(JSON.stringify({ head, refs, type: 'error', data: { error: err.message || String(err) } }));
  }
}


setInterval(async () => {
  try {
    const [bInfo, lInfo] = await Promise.all([
      wallet.getInfoBitcoin(),
      wallet.getInfoLightning(),
    ]);
    const payload = {
      timestamp: Date.now(),
      bitcoin: bInfo,
      lightning: lInfo,
    };
    const s = Array.from(subscribers['node-status'] || []);
    s.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const head = 'srv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const msg = { head, refs: null, type: 'node-status', data: payload };
        ws.send(JSON.stringify(msg));
        persistMessage(msg);
      }
    });
  } catch (e) {
    console.error('node-status ticker error', e);
  }
}, 10000);


setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
