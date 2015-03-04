var events = require('events')
var inherits = require('inherits')
var memdown = require('memdown')
var through = require('through2')
var pump = require('pump')
var mutex = require('level-mutex')

module.exports = Queue

function Queue (worker, opts) {
  if (!(this instanceof Queue)) return new Queue(worker, opts)
  if (!opts) opts = {}

  this.worker = worker
  this.pending = {}
  this.concurrency = opts.concurrency || 1
  this.db = opts.db || memdown()
  this.opts = opts

  this.mutex = mutex(this.changes.db)

  this.initialize()
  events.EventEmitter.call(this)
}

inherits(Queue, events.EventEmitter)

Queue.prototype.initialize = function () {
  var pool = this.createPool()
  var splitStream = through.obj(function (data, enc, cb) {
    pool.getFree(function (proc) {
      proc.work(data, function () {
        cb(null, data)
      })
    })
  })
}

Queue.prototype.createPool = function () {
  var pool = {
    working: 0,
    limit: this.concurrency,
    workers: [],
    getFree: function getFree () {
      
    }
  }
}