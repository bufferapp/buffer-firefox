// Piggyback on window.close to make sure the window gets closed,
// even if open from privileged code (which is prevented by Firefox).
// unsafeWindow is a reference to the window object in the page
// script, and cloneInto is used to pass objects to that less-
// privileged scope.
;(function() {
  var originalClose = unsafeWindow.close.bind(unsafeWindow);
  var close = function() {
    var didWindowClose = originalClose();

    if (!didWindowClose) self.port.emit("buffer_close_popup");
  };

  unsafeWindow.close = cloneInto(close, unsafeWindow, { cloneFunctions: true });
})();
