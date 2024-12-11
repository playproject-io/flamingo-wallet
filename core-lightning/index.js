const { spawn, spawnSync } = require('bare-subprocess')
const Bare = require('bare')
const b4a = require('b4a')

async function start () {
  const all_processes = []
  const pipe = Pear.worker.pipe()
  const platform = Bare.platform
  const arch = Bare.arch
  // pipe.write(`{ type: 'info', data: ${platform}/${arch} }`)
  pipe.on('data', (msg) => {
    msg = JSON.parse(b4a.toString(msg, 'utf-8'))
    if (msg.type === 'stop all') kill_processes(all_processes)
    else if (msg.type === 'new_wallet') create_wallet(msg.data)
    else if (msg.type === 'load_wallet') load_wallet(msg.data)
  })
  pipe.on('close', (data) => {
    kill_processes(all_processes)
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
  sudo snap refresh --hold bitcoin-core	# To prevent automated update of bitcoin-core
  sudo ln -s /snap/bitcoin-core/current/bin/bitcoin{d,-cli} /usr/local/bin/
  
  sudo tar -xvf clightning-v24.08-Ubuntu-20.04.tar.xz -C /usr/local --strip-components=2
  
  sudo apt-get install libpq-dev
  */
  
  // spawn('rm /etc/apt/preferences.d/nosnap.pref')
  // spawn('apt update')
  // spawn('apt install snapd')
  // spawn('apt-get', ['install', '-y', 'software-properties-common'])
  // spawn('snap', ['install', 'bitcoin-core'])
  // spawn('snap', ['refresh', '--hold', 'bitcoin-core'])
  // spawn('ln', ['-s', '/snap/bitcoin-core/current/bin/bitcoin{d,-cli}', '/usr/local/bin/'])
  // spawn('apt-get', ['install', 'libpq-dev'])


////////////////////////////////////////////////////////////////////

// RUNNING BITCOIN DEAMON & CORE LIGHTNING NODE (LIGHTNING CLI)

///////////////////////////////////////////////////////////////////

// ------------ 1. BITCOIN DEAMON -------------

// -------------- bitcoin network -------------

  // const btc_deamon = spawn('bitcoind', ['-daemon']) // creates .bitcoin in $HOME
  // all_processes.push(btc_deamon)

// -------------- test network -----------------
  /* 
  add $HOME/.bitcoin/bitcoin.conf file

  network=regtest
  log-level=debug
  rpc-file=lightning-rpc
  bitcoin-rpcuser=testuser
  bitcoin-rpcpassword=testpassword
  bitcoin-rpcconnect=127.0.0.1
  bitcoin-rpcport=18443
  */
  // const btc_deamon = spawn('bitcoind', ['-regtest', '-deamon']) // creates .bitcoin in $HOME
  const btc_deamon = spawn('bitcoind', ['-regtest', '-daemon']) // creates .bitcoin in $HOME

  all_processes.push(btc_deamon)

  btc_deamon.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'info', data: `${data.toString()}` }))
  })
  btc_deamon.stderr.on('data', data => {
    pipe.write(JSON.stringify({ type: 'err', data: `${data.toString()}` }))
  })

  // bitcoin cli rpc https://developer.bitcoin.org/reference/rpc/ 

  function create_wallet (name) {
    pipe.write(JSON.stringify({ type: 'wallet', data: `starting to create` }))
    if (!name) name = 'my wallet'
    const create_wallet = spawn('bitcoin-cli', ['-regtest', 'createwallet', `${name}`]) // create wallet  
    create_wallet.stdout.on('data', data => {
      pipe.write(JSON.stringify({ type: 'new wallet', data: `${data.toString()}` }))
    })

    // in test mode

    const generate_blocks = spawn('bitcoin-cli', ['-regtest', 'generate', '101']) // generate blocks = creates test funds
    generate_blocks.stdout.on('data', data => {
      pipe.write(JSON.stringify({ type: 'blocks', data: `${data.toString()}` }))
    })
  
  }

  function load_wallet (name) {
    pipe.write(JSON.stringify({ type: 'wallet', data: `starting to load ${name}` }))
    const list = spawn('bitcoin-cli', ['-regtest', 'listwallets'])
    list.stdout.on('data', data => {
      if (data.includes('name')) return pipe.write(JSON.stringify({ type: 'load wallet', data: `${name} wallet is already loaded` }))
    })
    if (!name) name = 'my wallet'
    const load_wallet = spawn('bitcoin-cli', ['-regtest', 'loadwallet', `${name}`]) // load wallet  
    load_wallet.stdout.on('data', data => {
      pipe.write(JSON.stringify({ type: 'load wallet', data: `${data.toString()}` }))
    })

    // in test mode

    const generate_blocks = spawn('bitcoin-cli', ['-regtest', 'generate', '101']) // generate blocks = creates test funds
    generate_blocks.stdout.on('data', data => {
      pipe.write(JSON.stringify({ type: 'blocks', data: `${data.toString()}` }))
    })
  
  }


// ------------ 2. LIGHTNING CLI -------------

// -------------- bitcoin network -------------

  // const lightning_deamon = spawn('lightningd', ['--network=bitcoin', '--log-level=debug'])

// -------------- test network -----------------
  /*
  add $HOME/.lightning/config file

  network=regtest
  log-level=debug
  rpc-file=lightning-rpc
  bitcoin-rpcuser=testuser
  bitcoin-rpcpassword=testpassword
  bitcoin-rpcconnect=127.0.0.1
  bitcoin-rpcport=18443
  */

  const lightning_deamon = spawn('lightningd', ['--network=regtest'])

  all_processes.push(lightning_deamon)
  lightning_deamon.stdout.on('data', data => {
    // pipe.write(JSON.stringify({ type: 'info', data: ${data.toString()} }))
  })
  
  
  ////////////////////////////////////////////////////////////////////
  
  // INTERACT WITH THE NODE
  
  ///////////////////////////////////////////////////////////////////
  
  setTimeout(async () => {
    // const btc = spawn('bitcoin-cli', ['-regtest', 'getblockchaininfo'])
    // all_processes.push(btc)
    // btc.stdout.on('data', data => {
    //   pipe.write(JSON.stringify({ type: 'response', data: `${data.toString()}` }))
    // })
    await get_nodeinfo(all_processes, pipe)
    await make_newaddr(all_processes, pipe)
    await get_balance(all_processes, pipe)
    // await get_listaddresses(all_processes, pipe)
    await get_funds(all_processes, pipe)
  }, 3000)

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
async function make_newaddr (all_processes, pipe) {
  const addr = spawn('lightning-cli', ['newaddr'])
  addr.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'address', data: `${data.toString()}` }))
  })
}
async function get_listaddresses (all_processes, pipe) {
  const list = spawn('lightning-cli', ['listaddresses'])
  list.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'list', data: `${data.toString()}` }))
  })
}
async function get_funds (all_processes, pipe) {
  const funds = spawn('lightning-cli', ['listfunds'])
  funds.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'funds', data: `${data.toString()}` }))
  })
}
async function get_balance (all_processes, pipe) {
  const balance = spawn('lightning-cli', ['-regtest', 'getbalance'])
  all_processes.push(balance)
  balance.stdout.on('data', data => {
    pipe.write(JSON.stringify({ type: 'balance', data: `${data.toString()}` }))
  })
}

function kill_processes (all_processes) {
  spawn('bitcoin-cli', ['-regtest', 'stop'])
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
    if (msg === 'stop all') kill_processes(all_processes)
  })
  pipe.on('close', (data) => {
    kill_processes(all_processes)
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
