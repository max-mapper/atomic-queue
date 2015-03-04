var sublevel = require('subleveldown')
var changes = require('changes-feed')
var changesdown = require('changesdown')

module.exports = function (opts) {
  var feed = changes(sublevel(opts.db, 'feed'))
  var db = changesdown(sublevel(opts.db, 'db', opts), feed, opts)
  return {
    feed: feed,
    db: db
  }
}
