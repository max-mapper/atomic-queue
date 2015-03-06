var events = require('events')

var inherits = require('inherits')
var memdb = require('memdb')
var through = require('through2')
var pump = require('pump')

var createPool = require('./pool.js')
var createChangeDB = require('./changedb.js')

var debug = require('debug')('atomic-queue')

module.exports = Queue

function Queue (worker, opts) {
  var self = this
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

  this.inflight = {}

  this.pool.on('start', function start (data) {
    debug('start', data.change)
    self.inflight[data.change] = {change: data.change, finished: false}
  })

  this.pool.on('finish', function finish (data) {
    debug('finish', data.change)
    self.inflight[data.change] = {change: data.change, finished: true}
  })
  
  this.on('update-start', function(data) {
    debug('update-start', data)
    self.updatingInflight = true
  })
  
  this.on('update-end', function(data) {
    debug('update-end', data)
    self.updatingInflight = false
  })

  this.initialize()
  events.EventEmitter.call(this)
}

inherits(Queue, events.EventEmitter)

Queue.prototype.initialize = function initialize () {
  var self = this
  
  self.db.get('inflight', function doneGet (err, inflightData) {
    if (err && err.type !== 'NotFoundError') return self.emit('error', err)
    if (!inflightData) inflightData = {since: 0, inflight: {}}
    debug('inflight-load', inflightData)
    self.inflight = inflightData.inflight
    var opts = {live: true, since: inflightData.since}
    self.startQueueStream(opts)
  })
}

Queue.prototype.startQueueStream = function createQueueStream (opts) {
  var self = this
  
  var changeStream = this.changes.db.createChangesStream(opts)

  var splitStream = through.obj(function split (data, enc, cb) {
    self.pool.getFree(function gotWorker (proc) {
      // call cb so we get more data written to us
      cb()

      // also kick off the worker
      proc.work(data, doneWorking)
    })
    
    function doneWorking (err) {
      if (err) return splitStream.destroy(err)

      self.emit('finish', data.change)
  
      // TODO implement purging. should remove processed entries from the changes feed

      var inflight = self.inflightWorkers()

      update()
    
      function update () {
        if (self.updatingInflight) return self.once('update-end', update)
        self.emit('update-start', inflight)
        self.db.put('inflight', inflight, function updated (err) {
          self.emit('update-end', inflight)
          if (err) splitStream.destroy(err)
        })
      }
    }
  })

  pump(changeStream, splitStream, function done (err) {
    if (err) self.emit('error', err)
  })
}

Queue.prototype.inflightWorkers = function inflightWorkers () {
  var self = this
  
  var inflight = Object.keys(this.inflight)
    .map(function(el) {
      return self.inflight[el]
    })
    .sort(function changeSort (a, b) {
      return a.change > b.change
    })
  
  
  var startIndex, startChange
  for (var i = 0; i < inflight.length; i++) {
    var el = inflight[i]
    if (el.finished === false) {
      startIndex = i
      startChange = el.change
      break
    }
  }
  
  if (typeof startIndex === 'undefined') return {since: 0, inflight: {}} // all workers are done
  else inflight = inflight.slice(startIndex)
  
  // turn back into object
  var inflightObj = {}
  inflight.forEach(function(el) {
    inflightObj[el.change] = el
  })
  
  return {since: startChange, inflight: inflightObj}
}
