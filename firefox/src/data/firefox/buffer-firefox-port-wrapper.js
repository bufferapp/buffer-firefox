if( !xt ) var xt = {};
xt.port = self.port;


xt.port.on('buffer_options', function (options) {
  xt.options = options;
});