const { spawn, spawnSync } = require('bare-subprocess')
const fs = require('bare-fs')
const Bare = require('bare')
const b4a = require('b4a')

async function start () {
const network = 'bitcoin'
// const network = 'regtest'
const all_processes = []
const pipe = Pear.worker.pipe()
const platform = Bare.platform
const arch = Bare.arch
// pipe.write(`{ type: 'info', data: ${platform}/${arch} }`)
pipe.on('data', (msg) => {
  msg = JSON.parse(b4a.toString(msg, 'utf-8'))
  if (msg.type === 'stop all') kill_processes(all_processes, network)
  else if (msg.type === 'new wallet') create_wallet(msg.data)
  else if (msg.type === 'load wallet') load_wallet(msg.data)
  else if (msg.type === 'send btc') send_btc(msg.data)
  else if (msg.type === 'listwallets') listwallets()
  else if (msg.type === 'selected') show_addresses(msg.data)
  else if (msg.type === 'create addr') create_addr() // lightning
  else if (msg.type === 'create invoice') create_invoice(msg.data) // lightning
  else if (msg.type === 'pay invoice') pay_invoice(msg.data) // lightning
})
pipe.on('close', (data) => {
  kill_processes(all_processes, network)
})


////////////////////////////////////////////////////////////////////

// INSTALLING BTC NODE - CORE LIGHTNING

///////////////////////////////////////////////////////////////////

/*
// SETUP/INSTALLATION
// if on Linux Mint
sudo rm /etc/apt/preferences.d/nosnap.pref
apt update
apt install snapd

sudo apt-get install -y software-properties-common
sudo snap install bitcoin-core
sudo snap refresh --hold bitcoin-core        # To prevent automated update of bitcoin-core
sudo ln -s /snap/bitcoin-core/current/bin/bitcoin{d,-cli} /usr/local/bin/

// download c-lightning https://sourceforge.net/projects/c-lightning.mirror/
sudo tar -xvf clightning-v24.08.1-Ubuntu-20.04.tar.xz -C /usr/local --strip-components=2

sudo apt-get install libpq-dev
*/

/*
spawn('rm /etc/apt/preferences.d/nosnap.pref')
spawn('apt update')
spawn('apt install snapd')
spawn('apt-get', ['install', '-y', 'software-properties-common'])
spawn('snap', ['install', 'bitcoin-core'])
spawn('snap', ['refresh', '--hold', 'bitcoin-core'])
spawn('ln', ['-s', '/snap/bitcoin-core/current/bin/bitcoin{d,-cli}', '/usr/local/bin/'])
spawn('apt-get', ['install', 'libpq-dev'])

*/

// -------------- CLBOSS plugin -------------
/*

installation for Linux Mint

sudo apt update
sudo apt install -y git automake autoconf-archive libtool

git clone https://github.com/ZmnSCPxj/clboss.git
cd clboss

*/

////////////////////////////////////////////////////////////////////

// RUNNING BITCOIN DEAMON & CORE LIGHTNING NODE (LIGHTNING CLI)

///////////////////////////////////////////////////////////////////

// ------------ 1. BITCOIN DEAMON -------------

// -------------- bitcoin network -------------

/* 
add $HOME/.bitcoin/bitcoin.conf file

# Global RPC settings
server=1
rpcuser=testuser
rpcpassword=testpassword
rpcallowip=127.0.0.1

# Mainnet-specific settings (default network)
rpcport=8332
rpcbind=127.0.0.1

# Optional: Ensure compatibility for regtest if switching is needed
[regtest]
rpcport=18443
rpcbind=127.0.0.1
*/

// const btc_deamon = spawn('bitcoind', ['-daemon']) // creates .bitcoin in $HOME
// all_processes.push(btc_deamon)

// -------------- test network -----------------
/* 
add $HOME/.bitcoin/bitcoin.conf file

# Bitcoin Core configuration for regtest mode

# Operate in regtest mode
regtest=1

# Global RPC settings
server=1
rpcuser=testuser
rpcpassword=testpassword
rpcallowip=127.0.0.1

# [regtest] section for network-specific settings
[regtest]
rpcport=18443
rpcbind=127.0.0.1

*/
var btc_deamon
if (network === 'regtest') {
  btc_deamon = spawn('bitcoind', [`-${network}`, '-daemon'])
} else {
  btc_deamon = spawn('bitcoind', ['-daemon']) // creates .bitcoin in $HOME
}

all_processes.push(btc_deamon)

btc_deamon.stdout.on('data', data => {
  pipe.write(JSON.stringify({ type: 'info', data: `${data.toString()}` }))
})
btc_deamon.stderr.on('data', data => {
  pipe.write(JSON.stringify({ type: 'err', data: `${data.toString()}` }))
})

// bitcoin cli rpc https://developer.bitcoin.org/reference/rpc/ 

function create_wallet (name) {
  pipe.write(JSON.stringify({ type: 'wallet', data: `starting to create ${name}` }))
  if (!name) name = 'my wallet'
  var create_wallet
  if (network === 'regtest') {
    create_wallet = spawn('bitcoin-cli', [`-${network}`, 'createwallet', `${name}`]) // create wallet  
  } else {
    create_wallet = spawn('bitcoin-cli', ['createwallet', `${name}`]) // create wallet  
  }
  create_wallet.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'new wallet', data: `${data.toString()}` }))
    // in test mode
    var generate_blocks
    if (network === 'regtest') {
      generate_blocks = spawn('bitcoin-cli', [`-${network}`, `-rpcwallet=${name}`, '-generate', '101']) // generate blocks = creates test funds
    } else {
      generate_blocks = spawn('bitcoin-cli', [`-rpcwallet=${name}`, '-generate', '101']) // generate blocks = creates test funds
    }
    generate_blocks.stdout.on('data', data => {
      // pipe.write(JSON.stringify({ type: 'blocks', data: `${data.toString()}` }))
      // pipe.write(JSON.stringify({ type: 'blocks', data: `blocks generated}` }))
  })
  })
}

function load_wallet (name) {
  pipe.write(JSON.stringify({ type: 'wallet', data: `starting to load ${name}` }))
  var list
  if (network === 'regtest') {
    list = spawn('bitcoin-cli', [`-${network}`, 'listwallets'])
  } else {
    list = spawn('bitcoin-cli', ['listwallets'])
  }
  list.stdout.on('data', data => {
    // const list = JSON.parse(data)
    pipe.write(JSON.stringify({ type: 'wallets list', data }))
  })
  if (!name) name = 'my wallet'
  var load_wallet
  if (network === 'regtest') {
    load_wallet = spawn('bitcoin-cli', [`-${network}`, 'loadwallet', `${name}`]) // load wallet  
  } else {
    load_wallet = spawn('bitcoin-cli', ['loadwallet', `${name}`]) // load wallet  
  }
  load_wallet.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'load wallet', data: data.toString() }))
  })
}

function send_btc (data) {
  // pipe.write(JSON.stringify({ type: 'payment started', data: data.toString() }))
  const { amount, address, wallet } = data
  
  // bitcoin-cli -regtest -rpcwallet=bar send '{"bcrt1qneakqhrlz844leqdnahwtetgkdhz5eqtnhzyqu":0.2}'
  const send_btc_args = JSON.stringify({ [address]:Number(amount) })
  var payment
  if (network === 'regtest') {
    payment = spawn('bitcoin-cli', [`-${network}`, `-rpcwallet=${wallet}`, 'send', send_btc_args])
  } else {
    payment = spawn('bitcoin-cli', [`-rpcwallet=${wallet}`, 'send', send_btc_args])
  }
  payment.stdout.on('data', data => {
    fs.writeFileSync('./logs', data)
    pipe.write(JSON.stringify({ type: 'btc sent', data: `${data.toString()}` }))
  })
}

function listwallets () {
  pipe.write(JSON.stringify({ type: 'wallet', data: `getting wallets` }))
  var listwallets
  if (network === 'regtest') {
    listwallets = spawn('bitcoin-cli', [`-${network}`, 'listwallets']) // list wallets  
  } else {
    listwallets = spawn('bitcoin-cli', ['listwallets']) // list wallets  
  }
  listwallets.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'wallets', data: `${data.toString()}` }))
  })
}

function show_addresses (wallet) {
  var listwallets
  if (network === 'regtest') {
    listwallets = spawn('bitcoin-cli', [`-${network}`, `-rpcwallet=${wallet}`, 'listaddressgroupings']) // list wallets  
  } else {
    listwallets = spawn('bitcoin-cli', [`-rpcwallet=${wallet}`, 'listaddressgroupings']) // list wallets  
  }
  listwallets.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'addresses btc', data: `${data.toString()}` }))
  })
}

async function create_addr () {
  const addr = spawn('lightning-cli', ['newaddr'])
  addr.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'address lightning', data: `${data.toString()}` }))
  })
}

async function create_invoice (data) {
  const { amount, label, desc } = data
  const addr = spawn('lightning-cli', ['invoice', amount, label, desc ])
  addr.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'new invoice', data: `${data.toString()}` }))
  })
}

async function pay_invoice (data) {
  const addr = spawn('lightning-cli', ['pay', data ])
  addr.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'invoice paid', data: `${data.toString()}` }))
  })
}


// ------------ 2. LIGHTNING CLI -------------

// -------------- bitcoin network -------------
/*
add $HOME/.lightning/config file

log-level=debug
log-file=/home/ninabreznik/.lightning/bitcoin/debug.log
rpc-file=/home/ninabreznik/.lightning/bitcoin/lightning-rpc

# Bitcoin Core RPC credentials for mainnet
bitcoin-rpcuser=testuser
bitcoin-rpcpassword=testpassword
bitcoin-rpcconnect=127.0.0.1
bitcoin-rpcport=8332

# Node's bind and public announce addresses
bind-addr=0.0.0.0:9735
announce-addr=[2a04:4a43:8c0f:f185:43b9:7f16:8c80:3da4]:9735

# Plugins
plugin=/home/ninabreznik/.lightning/plugins/clboss

*/

// -------------- test network -----------------
/*
add $HOME/.lightning/config file

log-level=debug
log-file=/home/ninabreznik/.lightning/regtest/debug.log
rpc-file=/home/ninabreznik/.lightning/regtest/lightning-rpc
bitcoin-rpcuser=testuser
bitcoin-rpcpassword=testpassword
bitcoin-rpcconnect=127.0.0.1
bitcoin-rpcport=18443

plugin=/home/ninabreznik/.lightning/plugins/clboss

*/

const lightning_deamon = spawn('lightningd', [
  `--network=${network}`,
  '--lightning-dir=/home/ninabreznik/.lightning',
  '--daemon'
])

all_processes.push(lightning_deamon)
lightning_deamon.stdout.on('data', data => {
  // pipe.write(JSON.stringify({ type: 'info', data: ${data.toString()} }))
})


////////////////////////////////////////////////////////////////////

// INTERACT WITH THE NODE

///////////////////////////////////////////////////////////////////

// setTimeout(async () => {
//   // const btc = spawn('bitcoin-cli', [`-${network}`, 'getblockchaininfo'])
//   // all_processes.push(btc)
//   // btc.stdout.on('data', data => {
//   //   pipe.write(JSON.stringify({ type: 'response', data: `${data.toString()}` }))
//   // })
//   await get_nodeinfo(all_processes, pipe)
//   await make_newaddr(all_processes, pipe)
//   await get_balance(all_processes, pipe)
//   // await get_listaddresses(all_processes, pipe)
//   await get_funds(all_processes, pipe)
// }, 3000)

// TODO:  
// API: https://docs.corelightning.org/reference/lightning-newaddr
// FAQ: https://docs.corelightning.org/docs/faq
}

start()

async function get_nodeinfo (all_processes, pipe) {
  const nodeinfo = spawn('lightning-cli', ['getinfo'])
  nodeinfo.stdout.on('data', raw_data => {
    // pipe.write(JSON.stringify({ type: 'info', data: 'Got info' }))
    const data = JSON.parse(raw_data)
    const id = data['id']
    const dir = data['lightning-dir']
    const active_channels = data['num_active_channels']
    pipe.write(JSON.stringify({
      type: 'id',
      data: `${id}`
    }))
    // pipe.write(JSON.stringify({
    //   type: 'dir',
    //   data: `${dir}`
    // }))
    // pipe.write(JSON.stringify({
    //   type: 'active_channels',
    //   data: `${active_channels}`
    // }))
    // pipe.write(`{ type: 'nodeinfo', data: ${raw_data.toString()} }`)
  })
}

async function get_funds (all_processes, pipe) {
  const funds = spawn('lightning-cli', ['listfunds'])
  funds.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'funds', data: `${data.toString()}` }))
  })
}
async function get_balance (all_processes, pipe) {
  var balance
  if (network === 'regtest') {
    balance = spawn('lightning-cli', [`-${network}`, 'getbalance'])
  } else {
    balance = spawn('lightning-cli', ['getbalance'])
  }
  all_processes.push(balance)
  balance.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'balance', data: `${data.toString()}` }))
  })
}

function kill_processes (all_processes, network) {
  if (network === 'regtest') {
    spawn('bitcoin-cli', [`-${network}`, 'stop'])
  } else {
    spawn('bitcoin-cli', ['stop'])
  }
  for (var i = 0, len = all_processes.length; i < len; i++) {
    const child = all_processes[i]
    child.kill()
    // fs.writeFile('')
  }
}

////////////////////////////////////////////////////////////////////

// INSTALLING BTC NODE WITH NIX (doesn't work yet)

///////////////////////////////////////////////////////////////////
async function start_with_nix () {

// TODO: maybe https://docs.corelightning.org/docs/developers-guide#using-nix

const all_processes = []
const pipe = Pear.worker.pipe()
const platform = Bare.platform
const arch = Bare.arch
pipe.write(JSON.stringify({ type: 'info', data: `${platform}/${arch}` }))
pipe.on('data', (data) => {
  const msg = b4a.toString(data, 'utf-8')
  if (msg === 'stop all') kill_processes(all_processes, network)
})
pipe.on('close', (data) => {
  kill_processes(all_processes, network)
})

// SETUP/INSTALLATION
// NIX

// spawn('curl', ['-L https://hydra.nixos.org/job/nix/maintenance-2.14/buildStatic.x86_64-linux/latest/download-by-type/file/binary-dist > nix'])
// spawn('chmod', ['+x nix'])
// spawn('mkdir', ['-p ./mynixroot/var/nix'])
// spawn('bwrap', ['--unshare-user', '--uid $(id -u)', '--gid $(id -g)', '--proc /proc', '--dev /dev', '--tmpfs /tmp', 
//   '--ro-bind /bin/ /bin/', '--ro-bind /etc/ /etc/', '--ro-bind /lib/ /lib/', '--ro-bind /lib64/ /lib64/', '--ro-bind /run/ /run/', 
//   '--ro-bind /usr/ /usr/', '--ro-bind /var /var', '--bind $(pwd) $(pwd)', '--bind ~/.config/nix ~/.config/nix', 
//   '--bind ./mynixroot /nix', `./nix build 'nixpkgs#'`])
  
// const nix_v = spawn('nix', ['--version'])
// all_processes.push(nix_v)
// nix_v.stdout.on('data', data => {
//   pipe.write(`nix version: ${data.toString()}`)
// })
  
// BTC NODE
// spawn('nix', ['i', 'nix-bitcoin']
// spawn('git', ['clone', 'https://github.com/fort-nix/nix-bitcoin', 'nix-bitcoin'])
// spawn('cd', ['nix-bicoin/examples/nix-shell'])
// spawn('nix', ['run', 'github:fort-nix/nix-bitcoin/release'])
// RUN

// const btc_deamon = spawn('systemctl', ['status', 'bitcoind'])
// all_processes.push(btc_deamon)
// btc_deamon.stdout.on('data', data => {
//   pipe.write(`btc_deamon: ${data.toString()}`)
// })
// const btc_deamon = spawn('bitcoind', ['-daemon'])
// all_processes.push(btc_deamon)
// btc_deamon.stdout.on('data', data => {
//   pipe.write(`btc_deamon: ${data.toString()}`)
// })

// const lightning_deamon = spawn('lightningd', ['--network=bitcoin', '--log-level=debug'])
// all_processes.push(lightning_deamon)
// lightning_deamon.stdout.on('data', data => {
//   // pipe.write(`lightning_deamon: ${data.toString()}`)
// })

// setTimeout(() => {
//   const addr_cli = spawn('lightning-cli', ['newaddr'])
//   all_processes.push(addr_cli)
//   addr_cli.stdout.on('data', data => {
//     pipe.write(`addr_cli: ${data.toString()}`)
//   })
// }, 3000)
}

// start_with_nix()
