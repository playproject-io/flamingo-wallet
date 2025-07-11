const STATE = require('../src/node_modules/STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

const totalWealth = require('../src/node_modules/total_wealth') // Imports src/index.js

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
      '../src/node_modules/total_wealth': {
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
