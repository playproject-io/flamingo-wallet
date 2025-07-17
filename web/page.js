const STATE = require('../lib/node_modules/STATE')
const statedb = STATE(__filename)
const { sdb, get } = statedb(fallback_module)

const totalWealth = require('../lib/node_modules/total_wealth') 
const generalButton = require('../lib/node_modules/general_button') 

const state = {}

function protocol (message, notify) {
  const { from } = message
  state[from] = { notify }
  return listen
}

function listen (message) {
  console.log('Protocol message received:', message)
   // Handle button clicks
  if (message.type === 'button_click') {
    console.log(`Button "${message.text}"`)
  }
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

  // Create components
  const wealthComponent = await totalWealth(subs[0], protocol)
  console.log('subss[1]',subs[2])
  const sendButton = await generalButton(subs[2], protocol) 
  const page = document.createElement('div')
  page.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; padding: 20px;">
      <div id="wealth-container"></div>
      <div id="send-container"></div>
    </div>
  `

  // Mount components
  page.querySelector('#wealth-container').appendChild(wealthComponent)
  page.querySelector('#send-container').appendChild(sendButton)  
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
      '../lib/node_modules/general_button': {
        $: '',
        0: {
          value: {
            text: 'Send',
            disabled: false,
            action: 'send_bitcoin'
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
