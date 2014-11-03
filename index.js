/*
 * Test website links for valid HTTP Response codes.
 */

var child_process = require('child_process')
  , path = require('path')
  , resourceQueue = require('./resource-queue')
  , MAX_PROCESSES = process.env.LINK_TEST_MAX_PROCESSES || 5
  , MAX_PROCESS_HEAPSIZE = process.env.LINK_TEST_MAX_PROCESS_HEAPSIZE || 100000000


var testUrls = module.exports = function(startUrl, opts, cb){

  // Sane Defaults
  opts = opts || {}
  opts.depth = opts.depth || 1
  opts.domains = opts.domains || ["localhost:3000"]

  var queue = resourceQueue()
  queue.push(startUrl, {depth: 0, source:startUrl})

  startZombiePool(queue, opts, cb)

}

module.exports.reporters = require('./reporters')


var startZombiePool = function(queue, opts, cb){
  var zombies = 0

  var zombieTick = function(err){
    // Step 1. Check we aren't done.
    if (queue.len() < 1){
      if (zombies <= 0){
        cb(null, queue.summary())
      }

    } else {
      // Step 2. Check we have enough Zombies.
      for (var i = zombies; i < Math.min(MAX_PROCESSES, queue.len()); i++){ 
        var z = new Zombie(queue, opts, function(){
            zombies --;
            zombieTick()
          });
        process.nextTick(z.munch.bind(z));
        zombies ++

        if (opts.emitter){
          opts.emitter.emit('zombie-started', zombies)
        }
      }
    }
    setTimeout(zombieTick, 1000)
    return;
  }

  zombieTick();
}


var Zombie = function(queue, opts, done){

  this.uri = null
  this.cb = null

  this.z = child_process.fork(require.resolve('./zombie-process'), {silent:true})
  this.done = done
  this.queue = queue
  this.opts = opts
  this.emitter = this.opts.emitter

  // Bind Child process events
  this.z.on('message', this.handleMessage.bind(this));
  this.z.on('exit', this.handleExit.bind(this))
}

Zombie.prototype.isBusy = function(){
  return !!this.cb;
}

Zombie.prototype.handleMessage = function(msg){
  if (msg.stat === 'event'){
    return this.handleEvent(msg);
  }
  if (msg.stat == 'success'){
    return this.handleSuccess(msg);
  }
}

Zombie.prototype.handleEvent = function(ev){
  if (this.emitter)
    this.emitter.emit.apply(this.emitter, ev.args)

  if (ev.args[0] === 'memory-usage'){
    this.handleMemory.apply(this, ev.args)
  }
}

Zombie.prototype.handleMemory = function(ev, pid, rss, heapTotal, heapUsed){
  if (heapTotal > MAX_PROCESS_HEAPSIZE){
    if (this.emitter)
      this.emitter.emit('zombie-too-much-memory', heapTotal)
    this.die()
  }
}

Zombie.prototype.handleSuccess = function(res){
  // put into queue
  var q = res.results
    , self = this

  q.forEach(function(v){
    var url = v[0] 
      , depth = v[1]
      , source = v[2]

    self.queue.push(url, {depth:depth, source:source})
  })

  this.queue.resolve(this.uri, true)
  var cb = this.cb;
  this.uri = null
  this.cb = null;
  cb(null, res);
}


Zombie.prototype.handleExit = function(){
  if (this.emitter)
    this.emitter.emit('zombie-died')

  this.queue.resolve(this.uri, false)
  this.done(new Error("Unexpected exit"))
}


Zombie.prototype.die = function(){
  this.z.removeListener('exit', this.handleExit)
  this.z.kill("SIGTERM");
}

Zombie.prototype.munch = function(){
  if (this.queue.len() > 0) {
    var resource = this.queue.pop()
      , uri = resource[0]
      , data = resource[1]
    this.checkURI(uri, data.depth, data.source, this.munch.bind(this));
  } else {
    return this.done(null);
  }
}


Zombie.prototype.checkURI = function(uri, depth, source, cb){
  if (this.isBusy()){
    throw new Error("Zombie is busy")
  }
  
  if (this.emitter){
    this.emitter.emit('checking', uri, depth, source, this.queue.len(), this.queue.resolved().length);
  }

  this.cb = cb
  this.uri = uri
  this.z.send(JSON.stringify({
      url: uri
    , depth : depth
    , source : source
    , opts: this.opts
  }))
}





