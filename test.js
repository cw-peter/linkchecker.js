// Rather than unit tests (which would require a mock server etc.
// here is an example to be used as a smoke-test.

var linkchecker = require('./index') // require('linkchecker.js')

var opts = {
//  domains: ['www.example.com', 'example.com']
  domains: ['centralway.com', 'www.centralway.com']
, depth: 100
, emitter: linkchecker.reporters.LinkReporter
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
