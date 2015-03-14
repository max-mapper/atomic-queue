var events = require('events')

var inherits = require('inherits')
var memdb = require('memdb')
var through = require('through2')
var pump = require('pumpify')
var duplex = require('duplexify')
var uuid = require('hat')

var createPool = require('./pool.js')
var createChangeDB = require('./changedb.js')

var debug = require('debug')('atomic-queue')

module.exports = Queue

function Queue (worker, opts) {
  var self = this
  if (!(this instanceof Queue)) return new Queue(worker, opts)
  if (!opts) opts = {}

  this.concurrency = opts.concurrency || 1
  this.db = opts.db || memdb()
  this.opts = opts
  this.pool = createPool(worker, opts)
  this.changes = createChangeDB({
    db: this.db,
    keyEncoding: 'json',
    valueEncoding: 'json'
  })

  this.inflight = {}
  this.pending = 0

  this.stream = this.createDuplexStream()
  this.stream._queue = this

  this.pool.on('start', function start (data, worker, change) {
    var changeNum = change.change
    debug('start', changeNum)
    self.inflight[changeNum] = {change: changeNum, finished: false}
  })

  this.pool.on('finish', function finish (output, data, worker, change) {
    var changeNum = change.change
    debug('finish', changeNum)
    self.latestChange = self.changes.db.db.change
    self.inflight[changeNum] = {change: changeNum, finished: true}
  })

  this.stream.on('update-start', function updateStart (data) {
    debug('update-start', data)
    self.updatingInflight = true
  })

  this.stream.on('update-end', function updateEnd (data) {
    if (self.pending === 0) self.emit('idle')
    debug('update-end', data)
    self.updatingInflight = false
  })

  events.EventEmitter.call(this)

  return this.stream
}

inherits(Queue, events.EventEmitter)

Queue.prototype.initialize = function initialize (cb) {
  var self = this

  self.db.get('inflight', function doneGet (err, inflightData) {
    if (err && err.type !== 'NotFoundError') return cb(err)
    if (!inflightData) inflightData = {since: 0, inflight: {}}
    debug('inflight-load', inflightData)
    self.inflight = inflightData.inflight
    cb(null)
  })
}

Queue.prototype.createDuplexStream = function createDuplexStream (opts) {
  var self = this

  this.initialize(function ready (err) {
    if (err) return self.stream.destroy(err)
    self.stream.emit('ready', self.inflight)
    var readStream = self.createWorkStream({since: self.inflight.since, live: true})
    duplexStream.setReadable(readStream)
  })

  var writeStream = through.obj(
    function write (obj, enc, cb) {
      self.changes.db.put(uuid(), obj, function stored (err) {
        cb(err)
      })
    },
    function end (done) {
      self.stream.on('update-end', function updateEnd (inflight) {
        if (self.pending === 0 && self.latestChange === inflight.since) {
          duplexStream.uncork()
          done()
        }
      })
    }
  )

  var duplexStream = duplex.obj(writeStream)

  // one weird trick from mafintosh (makes 'finish' wait for writable end)
  duplexStream.on('prefinish', function prefinish () {
    duplexStream.cork()
  })

  return duplexStream
}

Queue.prototype.createWorkStream = function createWorkStream (opts) {
  var self = this

  var changeStream = this.changes.db.createChangesStream(opts)

  var splitStream = through.obj(
    function split (data, enc, cb) {
      self.pending++

      self.pool.getFree(function gotWorker (proc) {
        // call cb so we get more data written to us
        cb()

        // also kick off the worker
        proc.work(data.value.value, doneWorking, data)
      })

      function doneWorking (err, output) {
        self.pending--

        if (err) return self.stream.destroy(err)

        // TODO implement purging. should remove processed entries from the changes feed

        var inflight = self.inflightWorkers()

        update()

        function update () {
          if (self.updatingInflight) return self.stream.once('update-end', update)
          self.stream.emit('update-start', inflight)
          self.db.put('inflight', inflight, function updated (err) {
            self.stream.emit('update-end', inflight)
            if (err) self.stream.destroy(err)
            if (output) splitStream.push(output)
          })
        }
      }
    }
  )

  var pipeline = pump(changeStream, splitStream)
  return pipeline
}

Queue.prototype.inflightWorkers = function inflightWorkers () {
  var self = this

  var inflight = Object.keys(this.inflight)
    .map(function expand (el) {
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

  if (typeof startIndex === 'undefined') return {since: self.latestChange, inflight: {}} // all workers are done
  else inflight = inflight.slice(startIndex)

  // turn back into object
  var inflightObj = {}
  inflight.forEach(function (el) {
    inflightObj[el.change] = el
  })

  return {since: startChange, inflight: inflightObj}
}
