let ws;
const logEl = document.getElementById('log');
const urlEl = document.getElementById('url');

function log(...args) {
  const txt = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
  logEl.textContent += txt + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

document.getElementById('connect').addEventListener('click', () => {
  if (ws && ws.readyState === WebSocket.OPEN) { log('Already connected'); return; }
  const url = urlEl.value;
  ws = new WebSocket(url);

  ws.onopen = () => {
    log('Connected to', url);
    document.getElementById('connect').disabled = true;
    document.getElementById('disconnect').disabled = false;
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      log('RECV', msg);
      if (msg.type === 'new-lightning-address-response' && msg.data && msg.data.bech32) {
        document.getElementById('funding-address').value = msg.data.bech32;
      }
    } catch (e) {
      log('RECV (raw)', evt.data);
    }
  };

  ws.onclose = () => {
    log('Connection closed');
    document.getElementById('connect').disabled = false;
    document.getElementById('disconnect').disabled = true;
  };

  ws.onerror = (e) => {
    log('WebSocket error', e);
  };
});

document.getElementById('disconnect').addEventListener('click', () => {
  if (ws) ws.close();
});

document.getElementById('send').addEventListener('click', () => {
  sendFromInputs();
});

function sendFromInputs() {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const type = document.getElementById('type').value.trim();
  let dataStr = document.getElementById('data').value.trim();
  let data = dataStr ? (() => { try { return JSON.parse(dataStr); } catch (e) { log('Invalid JSON in data'); return null; } })() : {};
  if (data === null) return;
  const head = 'cli-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const msg = { head, refs: null, type, data };
  ws.send(JSON.stringify(msg));
  log('SENT', msg);
}

// helper buttons
document.getElementById('subscribe-status').addEventListener('click', () => {
  sendRaw({ type: 'subscribe', data: { event: 'node-status' } });
});
document.getElementById('unsubscribe-status').addEventListener('click', () => {
  sendRaw({ type: 'unsubscribe', data: { event: 'node-status' } });
});
document.getElementById('resume').addEventListener('click', () => {
  sendRaw({ type: 'resume', data: {} });
});
document.getElementById('getinfo-bitcoin').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-bitcoin', data: {} });
});
document.getElementById('getinfo-lightning').addEventListener('click', () => {
  sendRaw({ type: 'getinfo-lightning', data: {} });
});
document.getElementById('new-lightning-address').addEventListener('click', () => {
  sendRaw({ type: 'new-lightning-address', data: {} });
});

document.getElementById('fund-node').addEventListener('click', () => {
  const address = document.getElementById('funding-address').value.trim();
  const blocks = document.getElementById('funding-blocks').value.trim();
  if (!address) {
    log('Please generate an address first.');
    return;
  }
  if (!blocks || isNaN(parseInt(blocks, 10))) {
    log('Please enter a valid number of blocks.');
    return;
  }
  sendRaw({ type: 'fund-lightning-node', data: { address, blocks: parseInt(blocks, 10) } });
});

document.getElementById('list-funds').addEventListener('click', () => {
  sendRaw({ type: 'list-lightning-funds', data: {} });
});

function sendRaw({ type, data }) {
  if (!ws || ws.readyState !== WebSocket.OPEN) { log('Not connected'); return; }
  const head = 'cli-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  const msg = { head, refs: null, type, data };
  ws.send(JSON.stringify(msg));
  log('SENT', msg);
}
