# atomic-queue

a crash friendly queue that persists queue state and can restart. uses a worker pool and has configurable concurrency

[![NPM](https://nodei.co/npm/atomic-queue.png)](https://nodei.co/npm/atomic-queue/)

[![js-standard-style](https://raw.githubusercontent.com/feross/standard/master/badge.png)](https://github.com/feross/standard)

## API

for example usage see `test.js`

### `var queue = require('atomic-queue')(worker, opts)`

initialize a new queue with a `worker` function and optional options

`worker` must be a function that has this API:

```js
function work (data, done) {
  // do work, then call done with (err) if there was an error
}
```

`data` in the worker function will be a [`changesdown`](http://npmjs.org/changesdown) change event that looks like this:

```
{
 change: 1, // the local change number from the queue
 value: {
   type: 'get', // will be either get, put, del or batch
   key: 'foo', // the key you put
   value: 'bar' // the value you put
 }
}
```

note that if you use `.batch` to insert stuff into the queue you will receive the data as `type: 'batch'` so your worker code will need to be able to handle that if you choose to use batches (for e.g. atomicity reasons)

### `queue.put`, `queue.get`, `queue.del`, `queue.batch`

these four methods are for modifying data in the queue. most of the time you will most likely be using `put` to add jobs to the queue.

these methods are forwarded from a [`levelup`](http://npmjs.org/levelup) instance. if you need the full instance you can access it at `queue.change.db`

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
