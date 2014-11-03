var events = require('events')

var meg = function(s){
  return parseInt(s / 100000) / 10 + 'm'
}

module.exports.AsciiReporter = new events.EventEmitter() // Ironically, uses unicode symbols...
  
var HANDLERS = {
  'browser-error': 'e'
, 'zombie-started': '*'
, 'resource-response': '.'
, 'link-encountered' : '+'
, 'checking': ','
, 'zombie-died': '☠'
}

Object.keys(HANDLERS).forEach(function(k){
  module.exports.AsciiReporter.on(k, function(){
    process.stdout.write(HANDLERS[k])
  })
})


var vr = module.exports.VerboseReporter = new events.EventEmitter()

vr.on('browser-error', function(err, url){
  console.log("browser error on ", url, ":", err)
})

vr.on('memory-usage', function(pid, rss, heapTotal, heapUsed){
  console.log("Memory Usage", pid,":", meg(rss), meg(heapTotal), meg(heapUsed))
})

vr.on('resource-response', function(r, source){
  console.log("response from ", r.url, r.statusCode, " linked from ", source)
})

vr.on('zombie-started', function(processes){
  console.log("Starting a zombie - now running ", processes)
})

vr.on('link-encountered', function(link, source){
  console.log('encountered link ', link, ' on page ', source)
})

vr.on('zombie-died', function(){
  console.log('zombie died')
})

vr.on('checking', function(k, d, s, q, r, p){
  console.log("# Checking ", k
                , "depth:", d
                , "source:", s
                , " (in queue:", q
                , ", checked:", r, ")"
                )
})



var lc = module.exports.LinkReporter = new events.EventEmitter()

lc.results = {}

lc.on('resource-response', function(r, source){
  if (!lc.results[r.url]){
    console.log(r.statusCode, r.url, ' <- ', source)
    lc.results[r.url] = r.statusCode
  }
})

