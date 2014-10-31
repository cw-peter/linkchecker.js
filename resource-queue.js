


// Transactional Queue
module.exports = function(){

  var items = {}
    , queue = [] // List of keys to 'items'


  var res = {

    // Add a URI to the queue
    push: function(uri, meta){
      //console.log("QUEUE push", uri, meta)

      if (items.hasOwnProperty(uri)){
        // Existing URL
        //console.log("QUEUE contains ", uri)
        items[uri].references++;
        return
      }

      items[uri] = {
        meta: meta
      , stat: 'queued' 
      , references: 1
      , attempts : 0
      }
      queue.push(uri)
    }

    // Pop a URI from the queue
  , pop: function(){
      var uri = queue.pop()
        , data = items[uri]
      data.stat = 'pending'
      data.attempts ++
      //console.log("QUEUE pop", uri, JSON.stringify(data))
      return [uri, data.meta];
    }

    // Resolve a URI as complete, or incomplete (repushed)
  , resolve: function(uri, success){
      //console.log("QUEUE resolve", uri, success ? 'success' : 'failure')
      if (success){
        items[uri].stat = 'resolved'
      } else {
        items[uri].stat = 'pending'
        queue.push(uri)
      }
    }

  // Reolved items
  , resolved: function(){
    return res.filter('resolved')
  }

  , queued: function(){
    return res.filter('queued')
  }

  // Length of 'queued' resources
  , len: function(){
    return res.queued().length
  }

  , filter: function(stat){
     var out = Object.keys(items)
        .filter(function(uri){
          return items[uri].stat === stat
        })
        .map(function(x){
          return [x, items[x].meta]
        })
      //console.log("QUEUE filter", stat, out.length)
      return out
    }


    , summary: function(){
      return items
    }
  }




  return res

}
