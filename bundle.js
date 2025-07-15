(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

module.exports = button

async function button (opts = {}, protocol) {
  const { id, sdb } = await get(opts.sid)

  const {drive} = sdb

  const on = {
    style: inject,
    data: ondata
  }

  const el = document.createElement('div')
  const shadow =  el.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <button class="button-container">
      <span class="button-text">${opts.text || 'Button'}</span>
    </button>
    <style></style>
  `

  const style = shadow.querySelector('style')
  const buttonEl = shadow.querySelector('.button-container')

  // Add click event listener
  buttonEl.addEventListener('click', (event) => {
    if (opts.onclick && typeof opts.onclick === 'function') {
      opts.onclick(event)
    }
  })

  await sdb.watch(onbatch)

  return el

  function fail(data, type) { throw new Error('invalid message', { cause: { data, type } }) }

  async function onbatch (batch) {
    for (const { type, paths } of batch){
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      const func = on[type] || fail
      func(data, type)
    }
  }

  function inject (data) {
    style.replaceChildren((() => {
      return document.createElement('style').textContent = data[0]
    })())
  }

  function ondata(data) {
    updateButton(data[0]?.value || {})
  }


  function updateButton({ text, disabled = false }) {
    if (text) {
      shadow.querySelector('.button-text').textContent = text
    }
    buttonEl.disabled = disabled
    if (disabled) {
      buttonEl.classList.add('disabled')
    } else {
      buttonEl.classList.remove('disabled')
    }
  }
}

// ============ Fallback Setup for STATE ============

function fallback_module () {
  return {
    api: fallback_instance
  }

  function fallback_instance (opts = {}) {
    return {
      drive: {
        'style/': {
          'button.css': {
           '$ref':'button.css'
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
}).call(this)}).call(this,"/lib/node_modules/button/button.js")
},{"STATE":1}],3:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

module.exports = total_wealth

async function total_wealth (opts = {}, protocol) {
  const { id, sdb } = await get(opts.sid)
  
  const {drive} = sdb

  const on = {
    style: inject,
    data: ondata
  }
  
  const el = document.createElement('div')
  const shadow =  el.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <div class="total-wealth-container">
      <div class="total-wealth-header">Total wealth</div>
      <div class="total-wealth-value">
        <span>₿ 0.0000</span>
        <div class="total-wealth-usd">= $0</div>
      </div>
      <div class="wallet-row">
        Lightning Wallet <span>0.0000</span>
      </div>
      <div class="wallet-row">
        Bitcoin Wallet <span>0.0000</span>
      </div>
    </div>
    <style></style>
  `

  const style = shadow.querySelector('style')
  
  await sdb.watch(onbatch)

  return el

  function fail(data, type) { throw new Error('invalid message', { cause: { data, type } }) }

  async function onbatch (batch) {
    for (const { type, paths } of batch){
      const data = await Promise.all(paths.map(path => drive.get(path).then(file => file.raw)))
      const func = on[type] || fail
      func(data, type)
    }
  }

  function inject (data) {
    style.replaceChildren((() => {
      return document.createElement('style').textContent = data[0]
    })())
  }

  function ondata(data) {
    renderValues(data[0]?.value || {})
  }
  

  function renderValues({ total = 0, usd = 1000, lightning = 0, bitcoin = 0 }) {
    shadow.querySelector('.total-wealth-value span').textContent = `₿ ${total.toFixed(4)}`
    shadow.querySelector('.total-wealth-usd').textContent = `= $${usd.toLocaleString()}`
    shadow.querySelectorAll('.wallet-row')[0].querySelector('span').textContent = lightning.toFixed(4)
    shadow.querySelectorAll('.wallet-row')[1].querySelector('span').textContent = bitcoin.toFixed(4)
  }
}

// ============ Fallback Setup for STATE ============

function fallback_module () {
  return {
    api: fallback_instance
  }

  function fallback_instance (opts = {}) {
    return {
      drive: {
        'style/': {
          'total_wealth.css': {
           '$ref':'total_wealth.css'
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

}).call(this)}).call(this,"/lib/node_modules/total_wealth/total_wealth.js")
},{"STATE":1}],4:[function(require,module,exports){
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
},{"./page":5}],5:[function(require,module,exports){
(function (__filename){(function (){
const STATE = require('../lib/node_modules/STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

const totalWealth = require('../lib/node_modules/total_wealth') // Imports src/index.js
const button = require('../lib/node_modules/button') // Import button component

const state = {}

function protocol (message, notify) {
  const { from } = message
  state[from] = { notify }
  return listen
}

function listen (message) {
  console.log('Protocol message received:', message)
}

const on = {
  style: injectStyle,
  value: handleValue
}

function injectStyle (data) {
  console.log('Injecting shared style (if needed)', data)
}

function handleValue (data) {
  console.log(`"${data.id}" value:`, data.value)
}



function onbatch (batch) {
  console.log(' Watch triggered with batch:', batch)
  for (const { type, data } of batch) {
    if (on[type]) {
      on[type](data)
    }
  }
}

console.log(" Before main()")



async function main () {
  console.log(" main() started")

  const subs = await sdb.watch(onbatch)


  const component = await totalWealth(subs[0], protocol)
  console.log("🔧 totalWealth returned component:", component)

  // Create button component with testing text and popup on click
  const testButton = await button({
    text: 'Test Button',
    onclick: (event) => {
      alert('Hello! This is a test button click popup!')
      console.log('Button clicked!', event)
    }
  }, protocol)
  console.log("🔧 button returned component:", testButton)

  const page = document.createElement('div')
  page.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; padding: 20px;">
      <container></container>
      <button-container></button-container>
    </div>
  `

  page.querySelector('container').replaceWith(component)
  page.querySelector('button-container').replaceWith(testButton)
  document.body.append(page)

  console.log("Page mounted")
}

main()

// ============ Fallback Setup ============
function fallback_module () {
  return {
    drive: {},
    _: {
      '../lib/node_modules/total_wealth': {
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
      },
      '../lib/node_modules/button': {
        $: '',
        0: {
          value: {
            text: 'Test Button',
            disabled: false
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
},{"../lib/node_modules/STATE":1,"../lib/node_modules/button":2,"../lib/node_modules/total_wealth":3}]},{},[4]);
