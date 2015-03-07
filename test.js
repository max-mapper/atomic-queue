var createQueue = require('./')

var queue = createQueue(doWork, {concurrency: 3})

queue.write('a')
queue.write('b')
queue.write('c')
queue.write('d')
queue.write('e')
queue.write('f')

function doWork (data, cb) {
  setTimeout(function () {
    console.log('processing', data)
    cb()
  }, Math.random() * 5000)
}
