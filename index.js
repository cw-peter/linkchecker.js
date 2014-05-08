/*
 * Test website links for valid HTTP Response codes.
 */

var zombie = require('zombie')
  , assert = require('assert')
  , url = require('url')

  , FAIL_CODES = [404, 500]
  , CHROME_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/53i" + 
                "7.36 (KHTML, like Gecko) Chrome/36.0.1944.0 Safari/537.36")



var testUrls = function(startUrl, opts, cb){

  // Sane Defaults
  opts = opts || {}
  opts.depth = opts.depth || 1
  opts.domains = opts.domains || ["localhost:3000"]

  var queue = [ [startUrl, 0, startUrl] ] // url, depth, source
    , results = {}

  var testUrlIter = function(){
    if (queue.length < 1){
      return cb.apply(this, arguments)
    }
    createTest(queue.pop(), queue, results, opts, testUrlIter)
  }

  testUrlIter()
}





var createTest = function(item, queue, results, opts, cb){
  var url = item[0]
    , depth = item[1]
    , source = item[2]

  var browser = new zombie({silent:true, userAgent : CHROME_UA})

  browser.on('response', function(req, res){
    if (matchDomainWhitelist(res.url, opts.domains)){
      results[res.url] = [res.statusCode, source]
      if (opts.emitter) {
        opts.emitter.emit('resource-response', res, source)    
      }

    }
  })

  browser.on('error', function(err){
    if (opts.emitter){
      opts.emitter.emit('browser-error', err, url)
    }
  })

  browser.visit(url, function(e){
    if (matchDomainWhitelist(url, opts.domains)){

      if (browser.error){
        console.log(browser.error)
        if (opts.emitter){
          opts.emitter.emit('browser-error', err, url)
        }
      } 

      browser.wait(function(){
        parseLinks(url, queue, results, browser, depth, opts.depth)
        browser.close()
        return cb(null, results)
      })

    } else {
        browser.close()
        return cb(null, results)
    }

  })
}


var parseLinks = function(url, queue, results, browser, depth, maxdepth){
  // Parse out links
  var links = browser.document.querySelectorAll('a')

  // links is NodeList, not array, can't forEach()
  for (var i = 0; i< links.length; i++){
    var href = links[i].href
    if (href.indexOf("javascript:")!= 0 && href.indexOf("mailto:") !=0 && !results[href] && depth+1 < maxdepth) {
      results[href] = 'pending'
      queue.push([href, depth+1, url])
    }
  }
}

var matchDomainWhitelist = function(domain, whitelist){
  var host = url.parse(domain).host
  return whitelist.indexOf(host) > -1
}



