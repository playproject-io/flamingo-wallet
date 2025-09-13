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

// Start daemons automatically
(async () => {
  try {
    console.log('Attempting to start Bitcoin daemon...');
    await wallet.startBitcoin();
    console.log('Bitcoin daemon started or was already running.');
  } catch (e) {
    // Ignore errors, it might be already running
    console.log('Could not start Bitcoin daemon (maybe already running).');
  }

  try {
    console.log('Attempting to start Lightning daemon...');
    await wallet.startLightning();
    console.log('Lightning daemon started or was already running.');
  } catch (e) {
    // Ignore errors, it might be already running
    console.log('Could not start Lightning daemon (maybe already running).');
  }
})();

async function gracefulShutdown() {
  console.log('\nGracefully shutting down...');

  try {
    console.log('Attempting to stop Lightning daemon...');
    await wallet.stopLightning();
    console.log('Lightning daemon stopped.');
  } catch (e) {
    console.log('Could not stop Lightning daemon (maybe not running or error).');
  }

  try {
    console.log('Attempting to stop Bitcoin daemon...');
    await wallet.stopBitcoin();
    console.log('Bitcoin daemon stopped.');
  } catch (e) {
    console.log('Could not stop Bitcoin daemon (maybe not running or error).');
  }

  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

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

  ws.send(JSON.stringify({ 
    head: createMessageHead(SERVER_ID, '*'),
    refs: {},
    type: 'welcome', 
    data: { msg: 'connected' } 
  }));
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


const SERVER_ID = 'ws_server';
let messageCounter = 0;

function createMessageHead(senderId, receiverId) {
  return [senderId, receiverId, messageCounter++];
}

function createResponse(originalMessage) {
  return {
    head: createMessageHead(SERVER_ID, originalMessage.head[0]),
    refs: { cause: originalMessage.head }
  };
}

const on = {
  echo: async (m, ws) => {
    const { data } = m;
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'echo-response', 
      data 
    }));
  },

  'new-lightning-address': async (m, ws) => {
    try {
      const result = await wallet.newLightningAddress();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'new-lightning-address-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'fund-lightning-node': async (m, ws) => {
    try {
      const { address, blocks } = m.data;
      if (!address || !blocks) {
        throw new Error('address and blocks are required');
      }
      const result = await wallet.fundLightningNode(address, blocks);
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'fund-lightning-node-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'list-lightning-funds': async (m, ws) => {
    try {
      const result = await wallet.listLightningFunds();
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'list-lightning-funds-response',
        data: result
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({
        ...response,
        type: 'error',
        data: { error: err.message || String(err) }
      }));
    }
  },

  'getinfo-lightning': async (m, ws) => {
    try {
      const result = await wallet.getInfoLightning();
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'getinfo-lightning-response', 
        data: result 
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'error', 
        data: { error: err.message || String(err) } 
      }));
    }
  },

  'getinfo-bitcoin': async (m, ws) => {
    try {
      const result = await wallet.getInfoBitcoin();
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'getinfo-bitcoin-response', 
        data: result 
      }));
    } catch (err) {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'error', 
        data: { error: err.message || String(err) } 
      }));
    }
  },

  subscribe: async (m, ws) => {
    const { data } = m;
    const ev = data && data.event ? data.event : 'node-status';
    subscribers[ev] = subscribers[ev] || new Set();
    subscribers[ev].add(ws);
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'subscribe-response', 
      data: { subscribed: ev } 
    }));
  },

  unsubscribe: async (m, ws) => {
    const { data } = m;
    const ev = data && data.event ? data.event : 'node-status';
    if (subscribers[ev]) subscribers[ev].delete(ws);
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'unsubscribe-response', 
      data: { unsubscribed: ev } 
    }));
  },

  resume: async (m, ws) => {
    const { data } = m;
    const sinceHead = data && data.sinceHead;
    let toSend;
    if (sinceHead) {
      const sinceMsg = persisted.find((p) => p.head[2] === sinceHead[2]);
      const sinceTs = sinceMsg ? sinceMsg.ts : 0;
      toSend = persisted.filter((p) => p.ts > sinceTs);
    } else {
      toSend = persisted;
    }
    
    // Send each item with a new message ID
    toSend.forEach((item) => {
      const response = createResponse(m);
      ws.send(JSON.stringify({ 
        ...response,
        type: 'resume-item', 
        data: item.data || item 
      }));
    });

    // Send completion message
    const finalResponse = createResponse(m);
    ws.send(JSON.stringify({ 
      ...finalResponse,
      type: 'resume-complete', 
      data: { count: toSend.length } 
    }));
  }
};

function fail(m, ws) {
  const response = createResponse(m);
  ws.send(JSON.stringify({ 
    ...response,
    type: 'fail', 
    data: { error: 'unknown type: ' + m.type } 
  }));
}

function handleMessage(ws, m) {
  try {
    (on[m.type] || fail)(m, ws);
  } catch (err) {
    const response = createResponse(m);
    ws.send(JSON.stringify({ 
      ...response,
      type: 'error', 
      data: { error: err.message || String(err) } 
    }));
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
        // For broadcasts, we set receiverId as '*'
        const msg = { 
          head: createMessageHead(SERVER_ID, '*', messageCounter++),
          refs: {},  // no cause for broadcast messages
          type: 'node-status', 
          data: payload 
        };
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
