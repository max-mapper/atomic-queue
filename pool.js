var events = require('events')
var inherits = require('inherits')
var createWorker = require('./worker.js')

module.exports = Pool

function Pool (workFn, opts) {
  if (!(this instanceof Pool)) return new Pool(workFn, opts)
  if (!opts) opts = {}
  this.workFn = workFn
  this.working = 0
  this.limit = opts.concurrency || 1
  this.workers = this.createWorkers()
  events.EventEmitter.call(this)
}

inherits(Pool, events.EventEmitter)

Pool.prototype.createWorkers = function createWorkers () {
  var self = this
  var workers = []
  for (var i = 0; i < this.limit; i++) {
    var worker = createWorker(this.workFn)

    // consolidate events
    worker.on('start', function onStart () {
      self.emit('start', worker)
    })
    worker.on('finish', function onFinish () {
      self.emit('finish', worker)
    })

    workers.push(worker)
  }
  return workers
}

Pool.prototype.getFree = function getFree (cb) {
  var self = this

  // try to get a free worker
  for (var i = 0; i < this.workers.length; i++) {
    var worker = this.workers[i]
    if (worker.working) continue
    return cb(worker)
  }

  // otherwise wait for one to finish
  wait()

  function wait () {
    self.once('finish', function finish (worker) {
      // handle case where getFree is waiting on multiple workers
      process.nextTick(function next () {
        if (worker.working) return wait()
        cb(worker)
      })
    })
  }
}
