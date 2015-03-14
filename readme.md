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

### events

in addition to standard stream events you can also listen to the following:

#### queue.on('ready')

emitted after startup when the queue state has been read from disk and the queue is now ready to start working

#### queue.on('error')

when a catastrophic error has occurred. you **must** handle this. receiving this also means the queue stream has been destroyed.

#### queue.on('idle')

when the number of pending jobs reaches 0. may be called multiple times

#### queue.on('finish')

when the writable side of the queue has been ended *and* all jobs have finished processing

#### queue.on('update-start')

when the queue starts flushing its state to disk

#### queue.on('update-end')

when the queue finishes flushing its state to disk

#### queue.pool.on('start')

when a job starts working

#### queue.pool.on('finish')

when a job finishes working
