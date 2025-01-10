# core lightning

## about

- blockstream's playlist https://www.youtube.com/playlist?list=PLseHpvCI1BjCCq250Wg2IjyIFmp7vYqN7
- setup: channel & liquidity management
- glossary: channels, liquidity, balancing, routing, gossip

## plugins

- plugin manager - reckless
- clboss (automatingkey management and operating of the node)
- liquidity ads (routing fees)

## non-custodial lightning wallets

- phoenix
- breeze
- blockstream green https://blockstream.com/green/

- greenlight - enables devs to integrate non-custodial lightning wallet into their apps

## lightning explorers / visualizers

- 1ML explorer https://1ml.com/
- clams - lightning ui in the browser https://clams.tech/
- bkpr - accounting, compatible with clams

## public nodes

- boltz 
    - info https://1ml.com/node/026165850492521f4ac8abd9bd8088123446d126f648ca35e60f88177dc149ceb2
    - atomic swap https://boltz.exchange/swap (lightning to liquid)


## umbrel cln setup

- https://youtu.be/M2asMhOUCiM?si=_hSideBu8Hrp8d6H&t=565 (adding liquidity to your node)


## dev

- polar - local app dev & testing

## channel 

- config https://youtu.be/qitmtFgMk-o?si=aYGC3CCv1SbbOMga&t=1826
- overview https://medium.com/blockstream/setting-up-liquidity-ads-in-c-lightning-54e4c59c091d

- channel amount
- channel opening fee (approx 1/2 of the channel amount)
- lease fee
- routing fee

## node

### greenlight 
- about https://www.youtube.com/watch?v=u4ovmbDFJcY
- free for single users
- node as a  service (keys for signing wit a user) https://blockstream.com/lightning/greenlight/
-  dev certificate for app developers https://blockstream.github.io/greenlight/getting-started/certs/
- how does it work: you register a lightning node, the service creates DB, watchtowers, compute node on wich your node is running; the lightning node doesn't have its own keys, they are on the app (with you, and you sign all actions). Works similarlyto hardware wallets

## peerswap

- for balancing channels
- uses lightning network
- free service
- enabled by commando plugin

## node management

- settings:
  - default fees
  - watch tower
    - watches other nodes to not do anything sketchy while your node is offline
- node examples & stats
  - https://terminal.lightning.engineering/explore/03423790614f023e3c0cdaa654a3578e919947e4c3a14bf5044e7c787ebd11af1a/
  - https://amboss.space/node/03423790614f023e3c0cdaa654a3578e919947e4c3a14bf5044e7c787ebd11af1a
  - zero fee routing https://stacker.news/items/22369
- opening channels & setting fees
  - base fee (always same, no matter how much funds is router through your node) - 0?
  - fee rate (% of funds routed through your node) - 100(=0,01%)
  - local balance (you can send transactions)
  - remote balance (you can receive and then route transactions)
- inbound liquidity (max 16 MIO (?))
  - loop out (ride the lightning)
  - self loop - pay self (send to lightning address and get funds back over your btc address - samo in loop out, but there you use a service)
  - ln big (buy inbound liquidity by buying a inbound channel from ln big)
- rebalancing (moving balance (liquidity?) between nodes)
- how to get ppl connect to you
  - onion address
- send & receive payments
- managing:
  - rebalancing
  - finding new connections
  - maintaining inbound/outbound liquidity
- closing channels
- reports
- backups
- tools: thunderhub, terminal lightning engineering, 1ML, amboss.space  

# API calls 

## bitcoin-cli

BITCOIN CLI https://developer.bitcoin.org/reference/rpc/

bitcoin-cli -regtest -rpcwallet=foo getwalletinfo

bitcoin-cli -regtest listwallets

bitcoin-cli -regtest loadwallet foo

bitcoin-cli -regtest -rpcwallet=foo listaddressgroupings 
// get addresses associated with your wallet
// shows addresses grouped by the transactions they are involved in, along with their associated balances.

bitcoin-cli -regtest -rpcwallet=sky listreceivedbyaddress 0 true
// addresses explicitly created in your wallet
// the true flag includes addresses with a zero balance

## lightning-cli

// run this after you've sent some funds to your lightning address from btc wallet on testnet
 bitcoin-cli -regtest generatetoaddress 1 <your_mining_address>

## regtest second node
- make ~/.lightning/secondnode folder and add a config file
- add this to config
# Connect to the shared Bitcoin daemon
bitcoin-rpcconnect=127.0.0.1
bitcoin-rpcport=18443
bitcoin-rpcuser=testuser
bitcoin-rpcpassword=testpassword
network=regtest

# Node-specific settings
alias=secondnode
addr=127.0.0.1:9736 

- run the second node with 
 lightningd --lightning-dir=/home/ninabreznik/.lightning/secondnode --log-file=/home/ninabreznik/.lightning/secondnode/log --daemon

- stop the node
lightningd --lightning-dir=/home/ninabreznik/.lightning/secondnode --shutdown

- test the connection of second node to bitcoind
lightning-cli --lightning-dir=/home/ninabreznik/.lightning/secondnode getinfo

- get info gives you a node id, which is used to connect
lightning-cli --lightning-dir=~/.lightning/secondnode connect <NODE1_ID> 127.0.0.1 <NODE1_PORTlightning>

- open channel from NODE1
lightning-cli fundchannel <NODE2_ID> <AMOUNT> // we used 50000

- if on regtest, we need to manually announce
(not sure which one)
lightning-cli dev-setchannel <channel-id> announce true
or
lightning-cli setchannelfee <peer-node-id> <base-fee> <ppm-fee>  //  This will set the fees for the channel
or 
lightningd --lightning-dir=/home/ninabreznik/.lightning --announce-addr=127.0.0.1:19846

- pay invoice through the new channel
lightning-cli pay <LN_INVOICE>

- if payment fails, check if there is a route between you and the node
lightning-cli getroute <NODE2_ID> <AMOUNT> 1

- on regtest we need to generate blocks to make funds move
bitcoin-cli -regtest -generate 30

