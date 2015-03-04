var sublevel = require('subleveldown')
var changes = require('changes-feed')
var changesdown = require('changesdown')

module.exports = function (opts) {
  var feed = changes(sublevel(opts.data, 'feed'))
  var db = changesdown(sublevel(opts.data, 'db', opts), feed, opts)
  return {
    feed: feed,
    db: db
  }
}
