var createQueue = require('./')

var queue = createQueue(doWork, {concurrency: 1})

queue.changes.db.batch([
    {
        type: 'put',
        key: 'hacker!1',
        value: { name: 'substack', hackerspace: 'sudoroom' }
    },
    {
        type: 'put',
        key: 'hacker!2',
        value: { name: 'mk30', hackerspace: 'sudoroom' }
    },
    {
        type: 'put',
        key: 'hacker!3',
        value: { name: 'mitch', hackerspace: 'noisebridge' }
    }
], function done () {})

function doWork (data, cb) {
  setTimeout(function () {
    console.log('processing', data)
    cb()
  }, Math.random() * 5000)
}
