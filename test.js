var createQueue = require('./')

var queue = createQueue(doWork, {concurrency: 4})

queue.changes.db.put('a', 'a', function done () {})
queue.changes.db.put('b', 'b', function done () {})
queue.changes.db.put('c', 'c', function done () {})
queue.changes.db.put('d', 'd', function done () {})
queue.changes.db.put('e', 'e', function done () {})
queue.changes.db.put('f', 'f', function done () {})
queue.changes.db.put('g', 'g', function done () {})

function doWork (data, cb) {
  setTimeout(function () {
    cb()
  }, Math.random() * 5000)
}
