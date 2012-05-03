// Buffer for Firefox
;(function() {
  self.port.on("buffer_click", function(postData) {
      bufferData(self.port, postData);
  });
}());