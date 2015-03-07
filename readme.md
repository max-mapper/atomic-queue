# atomic-queue

a crash friendly queue that persists queue state and can restart. uses a worker pool and has configurable concurrency

[![NPM](https://nodei.co/npm/atomic-queue.png)](https://nodei.co/npm/atomic-queue/)

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.png)](https://github.com/feross/standard)

## API

for example usage see `test.js`

### `var queue = require('atomic-queue')(worker, opts)`

initialize a new queue with a `worker` function and optional options. `queue` is a stream

you queue things by writing them to the queue stream:

```js
queue.write('hello')
queue.write('goodbye')
queue.write({name: 'bob'})
```

`worker` must be a function that has this API:

```js
function work (data, done) {
  // do work, then call done with (err) if there was an error
}
```

`data` in the worker function will be the data you wrote into the queue above

### queue.on

you can listen to the following events:

#### error

when a catastrophic error has occurred

#### start

when a job starts working

#### end

when a job finishes working

#### update-start

when the queue starts flushing its state to disk

#### update-end

when the queue finishes flushing its state to disk
