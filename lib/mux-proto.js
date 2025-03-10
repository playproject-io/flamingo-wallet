module.exports = {
  make_protocol,
  create_and_open_channel
}

async function make_protocol ({ mux, opts, cb }) {
  // mux.pair(opts, cb) only saves that "cb" function in a Map just to be called when there is a pair incoming, like a notification
  // so if channel is closed but stream is still connected, then it can re-open the protocol due to mux.pair still triggering the callback
  mux.pair(opts, cb) 
  // mux.unpair when you want to close the channel
  const opened = await mux.stream.opened
  if (opened) cb()
}

function create_and_open_channel ({ mux, opts }) {
  const channel = mux.createChannel(opts)
  if (!channel) return
  channel.open()
  return channel
}