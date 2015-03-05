var events = require('events')

var inherits = require('inherits')
var memdb = require('memdb')
var through = require('through2')
var pump = require('pump')

var createPool = require('./pool.js')
var createChangeDB = require('./changedb.js')

module.exports = Queue

function Queue (worker, opts) {
  if (!(this instanceof Queue)) return new Queue(worker, opts)
  if (!opts) opts = {}

  this.worker = worker
  this.concurrency = opts.concurrency || 1
  this.db = opts.db || memdb()
  this.opts = opts
  this.pool = createPool(this.worker, opts)
  this.changes = createChangeDB({
    db: this.db,
    keyEncoding: 'json',
    valueEncoding: 'json'
  })

  this.initialize()
  events.EventEmitter.call(this)
}

inherits(Queue, events.EventEmitter)

Queue.prototype.initialize = function () {
  var self = this

  var changeStream = this.changes.db.createChangesStream({live: true})

  var flattenStream = through.obj(function (data, enc, cb) {
    if (data.value.type !== 'batch') return cb(null, data)
    data.value.batch.forEach(function (item) {
      flattenStream.push(item)
    })
    cb()
  })

  var splitStream = through.obj(function (data, enc, cb) {
    self.pool.getFree(function (proc) {
      proc.work(data, function () {
        cb(null, data)
      })
    })
  })

  var purgeStream = through.obj(function (data, enc, cb) {
    console.log('purge', data)
    cb()
  })

  pump(changeStream, flattenStream, splitStream, purgeStream, function done (err) {
    if (err) self.emit('error', err)
  })

}
