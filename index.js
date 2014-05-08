/*
 * Test website links for valid HTTP Response codes.
 */

var child_process = require('child_process')
  , path = require('path')
  , MAX_PROCESSES = 20

var testUrls = module.exports = function(startUrl, opts, cb){

  // Sane Defaults
  opts = opts || {}
  opts.depth = opts.depth || 1
  opts.domains = opts.domains || ["localhost:3000"]

  var queue = {}
    , results = {} // Pages which have been searched (doesn't include scripts etc.)

  queue[startUrl] = [0, startUrl] // url, depth, source


  var currProcesses = 1

  var testUrlIter = function(){
    currProcesses -= 1

    if (Object.keys(queue).length < 1){
      if (currProcesses <= 0){
        return cb.apply(this, arguments)
      }
      return;
    }

    for (var i = currProcesses; i < Math.min(MAX_PROCESSES, Object.keys(queue).length); i++){ 
      spawnZombieProcess(queue, results, currProcesses, opts, testUrlIter)
      currProcesses ++;
    }
  }

  testUrlIter()
}



var spawnZombieProcess = function(queue, results, currProcesses, opts, done){
  var k = Object.keys(queue).pop()
    , d = queue[k][0]
    , s = queue[k][1]
    results[k] = 'pending' // Or we can get in cycles...
    delete queue[k]

  console.log("# Checking ", k
                , "depth:", d
                , "source:", s
                , " (in queue:", Object.keys(queue).length
                , ", checked:", Object.keys(results).length, ")"
                , "[processes:", currProcesses, "]")
  
  // ZombieJS is riddled with memory leaks. We'll just spawn a new one for each page... 
  var z = child_process.fork(path.join(__dirname, 'zombie-process.js'), {})

  z.on('message', function(res){

    if (res.stat == 'event' && opts.emitter){
      opts.emitter.emit.apply(opts.emitter, res.args)
    }
    
    if (res.stat == 'success'){
      // put into queue
      var q = res.results
      q.forEach(function(v){
        var url = v[0] 
          , depth = v[1]
          , source = v[2]
        
        if (results[url] != undefined || queue[url] != undefined){
          // Already searched...
        } else if (url) {
          queue[url] = [depth, source]
        }
      })
      
      z.removeListener('exit', exitListener)
      z.kill("SIGTERM");
      done()
    }
  })

  var exitListener = function(){
    // TODO - put item back in queue so we can retry
    console.log("# Unexpected Exit from Zombie")
    done()
  }
  z.on('exit', exitListener)

  z.send(JSON.stringify({
    url: k
  , depth : d
  , source : s
  , opts: opts
  }))
}
