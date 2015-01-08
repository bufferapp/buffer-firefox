/* globals self */
/**
 * Currently all static files referenced in a firefox extension must be added
 * to the images/extensions folder in the buffer-web repo.
 * In the future, possibly refactor this so we can pass the proper file url
 * as in: http://stackoverflow.com/questions/11551467/how-to-reference-a-file-in-the-data-directory-of-a-firefox-extension
 */

var DataWrapper = function () {
  var config = {};
  config.endpoint = {
    http: 'http://static.bufferapp.com/images/extensions/',
    https: 'https://d389zggrogs7qo.cloudfront.net/images/extensions/',
  };

  // Keep reference to all handlers so we can remove them
  var handlers = {};

  return function (file, callback) {

    // If not async method, use the CDN
    if (typeof callback !== 'function') {
      file = file.replace(/data\/shared\//i, '');
      var protocol = document.location.protocol.replace(':', '');
      return config.endpoint[protocol] + file;
    }

    file = file.replace(/data\//i, '');
    var key = file + Math.floor(Math.random()* 1000);

    handlers[key] = function(url) {
      callback(url);
      self.port.removeListener('buffer_file_url', handlers[key]);
    };

    self.port.on('buffer_file_url', handlers[key]);
    self.port.emit('buffer_get_file', file);

  };
};

if( ! xt ) var xt = {};
xt.data = {
  get: DataWrapper()
};
