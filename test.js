var createPool = require('./pool.js')

var pool = createPool(doWork, {concurrency: 10})

for (var i = 0; i < 10; i++) {
  pool.getFree(function (proc) {
    proc.work(i, function () {
      console.log('done')
    })
  })
}

function doWork (data, cb) {
  setTimeout(function () {
    cb()
  }, Math.random() * 5000)
}
