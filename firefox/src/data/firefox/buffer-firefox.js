/* globals self, bufferpm, bufferData */
// Buffer for Firefox
;(function() {
  // In most cases we'll want to simply open the overlay when a Buffer button
  // is clicked. In some specific cases, we'll want to provide a more tailored
  // experience, e.g. retweeting a tweet when we're on a tweet's permalink page
  // and the Buffer toolbar button is clicked
  self.port.on("buffer_click", function(postData) {
    var isTweetPermalinkPage = /twitter\.com\/[^/]+\/status\/\d+/.test(window.location.href);
    var $retweetButton = $('.permalink-tweet .ProfileTweet-action--buffer');

    var shouldTriggerRetweetButtonClick = (
      isTweetPermalinkPage &&
      postData.placement === 'toolbar' &&
      $retweetButton.length > 0
    );

    if (shouldTriggerRetweetButtonClick) {
      $retweetButton.click();
    } else {
      // bufferData is a method in buffer-overlay that creates
      // the overlay and gives it data.
      bufferData(self.port, postData);
    }
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
