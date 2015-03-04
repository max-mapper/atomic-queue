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

Worker.prototype.work = function work (data, cb) {
  var self = this
  this.emit('start')
  this.working = true
  this.workFn(data, function done (err) {
    self.working = false
    if (err) self.emit('error', err)
    self.emit('finish')
    cb(err)
  })
}
