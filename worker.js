var events = require('events')
var inherits = require('inherits')

module.exports = Worker

function Worker (workFn) {
  if (!(this instanceof Worker)) return new Worker(workFn)
  this.working = false
  this.workFn = workFn
  events.EventEmitter.call(this)
}

inherits(Worker, events.EventEmitter)

Worker.prototype.work = function work (data, cb, change) {
  var self = this
  this.emit('start', data, change)
  this.working = true
  this.workFn(data, function done (err, output) {
    self.working = false
    if (err) self.emit('error', err)
    self.emit('finish', output, data, change)
    cb(err)
  }, change)
}
