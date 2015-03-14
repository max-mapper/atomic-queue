var test = require('tape')
var createQueue = require('./')

test('process 6 normal items', function test (t) {
  var queue = createQueue(doWork, {concurrency: 1})
  var pending = 6

  queue.write('a')
  queue.write('b')
  queue.write('c')
  queue.write('d')
  queue.write('e')
  queue.write('f')
  queue.end()

  queue.on('finish', function end () {
    t.equal(pending, 0, 'pending is 0')
    t.end()
  })

  function doWork (data, cb) {
    setTimeout(function randomDelay () {
      console.error('processing', data)
      pending--
      cb()
    }, Math.random() * 100)
  }
})

test('handle error', function test (t) {
  var queue = createQueue(doWork, {concurrency: 1})
  var pending = 6

  queue.write('a')
  queue.write('b')
  queue.write('c')
  queue.write('d')
  queue.write('e')
  queue.write('f')
  queue.end()

  queue.on('error', function error (err) {
    t.equals(err.message, 'oh god the humanity', 'got error')
    t.end()
  })

  function doWork (data, cb) {
    console.error('processing', data)
    pending--
    if (pending === 3) return cb(new Error('oh god the humanity'))
    cb()
  }
})
