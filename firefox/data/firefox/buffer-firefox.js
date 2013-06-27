// Buffer for Firefox
;(function() {
  self.port.on("buffer_click", function(postData) {
      bufferData(self.port, postData);
  });

  self.port.on("buffer_message_bind", function(postData) {
      // Bind close listener
      // Listen for when the overlay has closed itself
      bufferpm.bind("buffermessage", function(overlaydata) {
          var temp = document.getElementById('buffer_overlay');
          document.body.removeChild(temp);
          bufferpm.unbind("buffermessage");
          setTimeout(function () {
              self.port.emit('buffer_done', overlaydata)
          }, 0);
          window.focus();
      });
  });

}());
