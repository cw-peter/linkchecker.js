// Rather than unit tests (which would require a mock server etc.
// here is an example to be used as a smoke-test.

var linkchecker = require('./index') // require('linkchecker.js')
  , events = require('events')
  , emitter = new events.EventEmitter()
  , stdout = process.stdout


/*  
var meg = function(s){
  return parseInt(s / 100000) / 10 + 'm'
}

emitter.on('memory-usage', function(pid, rss, heapTotal, heapUsed){
  console.log("Memory Usage", pid,":", meg(rss), meg(heapTotal), meg(heapUsed))
})
*/

emitter.on('resource-response', function(r, source){
  //console.log("response from ", r.url, r.statusCode, " linked from ", source)
  stdout.write('.')
})

emitter.on('browser-error', function(err, url){
  console.log("browser error on ", url, ":", err)
  //stdout.write('e')
})

emitter.on('zombie-started', function(processes){
  //console.log("Starting a zombie - now running ", processes)
  stdout.write('.')
})

emitter.on('link-encountered', function(link, source){
  stdout.write('+')
  //console.log('encountered link ', link, ' on page ', source)
})


emitter.on('checking', function(k, d, s, q, r, p){
  stdout.write('.')
  /*console.log("# Checking ", k
                , "depth:", d
                , "source:", s
                , " (in queue:", q
                , ", checked:", r, ")"
                , "[processes:", p, "]")
  */
})

var opts = {
//  domains: ['www.example.com', 'example.com']
  domains: ['centralway.com', 'www.centralway.com']
, depth: 100
, emitter: emitter
}

linkchecker("http://" + opts.domains[1], opts, function(err, results){
  console.log("Linkchecker done!")
  var res = Object.keys(results).map(function(k){
    return [k, results[k].references, results[k]]
  })

  res = res.sort(function(x, y){x[1] - y[1]})

  res.forEach(function(r){
    console.log(r[0], 'linked to',  r[1], 'times. ', JSON.stringify(r[2].meta))
  })


})
