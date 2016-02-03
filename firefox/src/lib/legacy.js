/* jshint node:true, esnext:true */
/**
 * Legacy code for FF 28 and lower
 */

var config = require('./config');

const BUFFER_BUTTON_ID = 'buffer-button';

var getMediator = function() {
  var { Cc, Ci } = require('chrome');
  return Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
};

var getMostRecentWindow = function(mediator) {
  return mediator.getMostRecentWindow('navigator:browser');
};

var addNavBarButton = exports.addNavBarButton = function(onButtonClick) {

  var mediator = getMediator();
  var browserWindow = getMostRecentWindow(mediator);

  var widgets = require("sdk/widget");

  var button = widgets.Widget({
    id: BUFFER_BUTTON_ID,
    label: config.plugin.label,
    contentURL: config.plugin.icon.static
  });

  button.on('click', function () {
    onButtonClick();
  });

  var document = browserWindow.document;
  var navBar = document.getElementById('nav-bar');
  if (!navBar) {
    return;
  }
  var btn = document.createElement('toolbarbutton');
  btn.setAttribute('id', BUFFER_BUTTON_ID);
  btn.setAttribute('type', 'button');
  // the toolbarbutton-1 class makes it look like a traditional button
  btn.setAttribute('class', 'toolbarbutton-1');
  btn.setAttribute('image', config.plugin.icon.small);
  // this text will be shown when the toolbar is set to text or text and icons
  btn.setAttribute('label', config.plugin.label);
  btn.addEventListener('click', function() {
    // Go go go
    onButtonClick();
  }, false);
  navBar.appendChild(btn);

  // Add listeners
  mediator.addListener(windowListener);

};

var removeNavBarButton = exports.removeNavBarButton = function() {

  var mediator = getMediator();
  var browserWindow = getMostRecentWindow(mediator);
  var doc = browserWindow.document;
  if (!doc) return;
  var navBar = doc.getElementById('nav-bar');
  var btn = doc.getElementById(BUFFER_BUTTON_ID);
  if (navBar && btn) {
     navBar.removeChild(btn);
  }
  mediator.removeListener(windowListener);

};

// handle new windows
var windowListener = {
  onOpenWindow: function(aWindow) {
    var { Ci }  = require('chrome');
    // Wait for the window to finish loading
    var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    addNavBarButton(domWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      addNavBarButton(domWindow);
    }, false);
  },
  onCloseWindow: function(aWindow) {
    removeNavBarButton(aWindow);
  },
  onWindowTitleChange: function(aWindow, aTitle) { }
};
