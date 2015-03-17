var events = require('events')
var inherits = require('inherits')
var debug = require('debug')('atomic-queue-worker')

module.exports = Worker

function Worker (workFn) {
  if (!(this instanceof Worker)) return new Worker(workFn)
  this.available = true
  this.workFn = workFn
  events.EventEmitter.call(this)
}

inherits(Worker, events.EventEmitter)

Worker.prototype.work = function work (data, cb, change) {
  var self = this
  self.available = false
  this.emit('start', data, change)
  debug('start', change.change)
  this.workFn(data, function done (err, output) {
    self.available = true
    debug('finish', change.change)
    self.emit('finish', output, data, change)
    cb(err)
  }, change)
}
