(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

module.exports = total_wealth

async function total_wealth (opts = {}, protocol) {
  console.log("🔧 total_wealth called with opts:", opts)
  const { id, sdb } = await get(opts.sid)
  console.log('sid:', opts.sid, '→ resolved id:', id)

  const on = {
    style: inject
  }
  // Simple fallback approach - create element directly
  const el = document.createElement('div')

  const config = await sdb.drive.get('data/opts.json')
  console.log('test', config)
  const { total = 0, usd = 1000, lightning = 0, bitcoin = 0 } = config?.raw?.value

  el.innerHTML = `
    <div style="border: 1px solid #ccc; border-radius: 10px; padding: 16px; width: 260px; background: white; font-family: Arial, sans-serif; color: black;">
      <div style="font-size: 13px; color: #555; margin-bottom: 6px;">Total wealth</div>
      <div style="font-size: 24px; font-weight: bold;">
        <span>₿ ${total.toFixed(4)}</span>
        <div style="font-size: 14px; color: #888; margin-top: 2px;">= $${usd.toLocaleString()}</div>
      </div>
      <div style="display: flex; align-items: center; margin-top: 12px; font-size: 14px;">
        <!-- <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Lightning_Network.png/480px-Lightning_Network.png" width="16" style="margin-right: 8px;"> -->
        Lightning Wallet <span style="margin-left: auto; font-weight: 500;">${lightning.toFixed(4)}</span>
      </div>
      <div style="display: flex; align-items: center; margin-top: 12px; font-size: 14px;">
        <!-- <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=029" width="16" style="margin-right: 8px;"> -->
        Bitcoin Wallet <span style="margin-left: auto; font-weight: 500;">${bitcoin.toFixed(4)}</span>
      </div>
    </div>
  `;
  
  await sdb.watch(onbatch)

  console.log("Returning element:", el)
  return el

  function inject(data) {
    console.log('Injecting style:', data)
    const sheet = new CSSStyleSheet()

    if (data?.raw) {
    sheet.replaceSync(data.raw || '') // ensure raw exists
    shadow.adoptedStyleSheets = [sheet]
    }
  }

  function onbatch (batch) {
    for (const { type, data } of batch) {
      on[type] && on[type](data)
    }
  }
}

// ============ Fallback Setup for STATE ============

function fallback_module () {
  return {
    drive: {},
    api: fallback_instance
  }

  function fallback_instance (opts = {}) {
    console.log('making opts--------------------', opts)
    return {
      drive: {
        'style/': {
          'theme.css': {
            raw: `
              :host {
                font-family: Arial, sans-serif;
              }
              .card {
                border: 1px solid #ccc;
                border-radius: 10px;
                padding: 16px;
                width: 260px;
                background: white;
                color: black;
              }
              .label {
                font-size: 13px;
                color: #555;
                margin-bottom: 6px;
              }
              .total {
                font-size: 24px;
                font-weight: bold;
              }
              .total .usd {
                font-size: 14px;
                color: #888;
                margin-top: 2px;
              }
              .wallet {
                display: flex;
                align-items: center;
                margin-top: 12px;
                font-size: 14px;
              }
              .wallet img {
                margin-right: 8px;
              }
              .wallet .amount {
                margin-left: auto;
                font-weight: 500;
              }
            `
          }
        },
        'data/': {
          'opts.json': {
            raw: opts
          }
        }
      }
    }
  }
}

}).call(this)}).call(this,"/src/node_modules/total_wealth/total_wealth.js")
},{"STATE":1}],3:[function(require,module,exports){
const prefix = 'https://raw.githubusercontent.com/alyhxn/playproject/main/'
const init_url = prefix + 'src/node_modules/init.js'

fetch(init_url, { cache: 'no-store' }).then(res => res.text()).then(async source => {
  const module = { exports: {} }
  const f = new Function('module', 'require', source)
  f(module, require)
  const init = module.exports
  await init(arguments, prefix)
  require('./page') // or whatever is otherwise the main entry of our project
})
},{"./page":4}],4:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('../src/node_modules/STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

const totalWealth = require('../src/node_modules/total_wealth/total_wealth') // Imports src/index.js

const state = {}

function protocol (message, notify) {
  const { from } = message
  state[from] = { notify }
  return listen
}

function listen (message) {
  console.log('📨 Protocol message received:', message)
}

const on = {
  style: injectStyle,
  value: handleValue
}

function injectStyle (data) {
  console.log('Injecting shared style (if needed)', data)
}

function handleValue (data) {
  console.log(`✅ "${data.id}" value:`, data.value)
}



function onbatch (batch) {
  console.log('📦 Watch triggered with batch:', batch)
  for (const { type, data } of batch) {
    if (on[type]) {
      on[type](data)
    }
  }
}

console.log("🟢 Before main()")



async function main () {
  console.log("⚙️ main() started")

  const subs = await sdb.watch(onbatch)


  const component = await totalWealth(subs[0], protocol)
  console.log("🔧 totalWealth returned component:", component)

  const page = document.createElement('div')
  page.innerHTML = `
    <container></container>
  `

  page.querySelector('container').replaceWith(component)
  document.body.append(page)

  console.log("✅ Page mounted")
}

main()

// ============ Fallback Setup ============
function fallback_module () {
  return {
    drive: {},
    _: {
      '../src/node_modules/total_wealth/total_wealth': {
        $: '',
        0: {
          value: {
            total: 1.999,
            usd: 105952,
            lightning: 0.9,
            bitcoin: 0.9862
          }
        },
        mapping: {
          style: 'style',
          data: 'data'
        }
      }
    }
  }
}

}).call(this)}).call(this,"/web/page.js")
},{"../src/node_modules/STATE":1,"../src/node_modules/total_wealth/total_wealth":2}]},{},[3]);
