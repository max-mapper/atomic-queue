var createQueue = require('./')

var queue = createQueue(doWork, {concurrency: 4})

queue.put('a', 'a', noop)
queue.put('b', 'b', noop)
queue.put('c', 'c', noop)
queue.put('d', 'd', noop)
queue.put('e', 'e', noop)
queue.put('f', 'f', noop)
queue.put('g', 'g', noop)

function doWork (data, cb) {
  setTimeout(function () {
    console.log('processing', data)
    cb()
  }, Math.random() * 5000)
}

function noop () {}
