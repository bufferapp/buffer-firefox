/* jshint node:true, esnext:true */
/* global CustomizableUI */
/*

Buffer for Firefox

Authors: Joel Gascoigne         Tom Ashworth
         joel@bufferapp.com     tom.a@bufferapp.com

*/

// Plugin APIs
var widgets     = require("sdk/widget");
var tabs        = require("sdk/tabs");
var tabsUtils   = require("sdk/tabs/utils");
var self        = require("sdk/self");
var pageMod     = require("sdk/page-mod");
var selection   = require("sdk/selection");
var ss          = require("sdk/simple-storage");
var simplePrefs = require("sdk/simple-prefs");
var { Hotkey }  = require("sdk/hotkeys");
var cm          = require("sdk/context-menu");
var { Cc, Ci, Cu }  = require('chrome');
var mediator    = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var bufferSrc   = require('bufferSrc');
var tpc_disabled = false;

var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);

// Configuration
var config = {};
config.plugin = {
  label: "Buffer This Page",
  icon: {
    static:         self.data.url('firefox/img/buffer-icon.png'),
    hover:          self.data.url('firefox/img/buffer-icon-hover.png'),
    loading:        self.data.url('firefox/img/buffer-icon-loading.png'),
    small:          self.data.url('firefox/img/buffer-icon-small.png'),
    small_loading:  self.data.url('firefox/img/buffer-icon-small-loading.png')
  },
  guide: 'http://bufferapp.com/guides/firefox/installed',
  version: self.version,
  menu: {
    page: {
      label: "Buffer This Page",
      scripts: [self.data.url('firefox/menu/buffer-page.js')]
    },
    selection: {
      label: "Buffer Selected Text"
    },
    image: {
      label: "Buffer This Image",
      scripts: [self.data.url('firefox/menu/buffer-image.js')]
    }
  },
  overlay: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('shared/libs/postmessage.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-scraper.js'),
      self.data.url('shared/buffer-overlay.js'),
      self.data.url('firefox/buffer-firefox.js')
    ]
  },
  twitter: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-twitter.js')
    ],
    styles: [
      self.data.url('shared/embeds/buffer-twitter.css')
    ]
  },
  hn: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-hn.js')
    ]
  },
  reddit: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-reddit.js')
    ]
  },
  facebook: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-facebook.js')
    ]
  },
  quora: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-quora.js')
    ]
  },
  tpccheck: {
    scripts: [
      self.data.url('shared/libs/postmessage.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('shared/embeds/buffer-tpc-check.js')
    ]
  },
  hotkey: {
    scripts: [
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('shared/libs/keymaster.js'),
      self.data.url('shared/embeds/buffer-hotkey.js')
    ]
  },
  hoverButton: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-hover-button.js')
    ]
  },
  scraper: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('shared/embeds/buffer-overlay-scraper.js')
    ]
  },
  bufferapp: {
    scripts: [
      self.data.url('shared/buffer-install-check.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('shared/buffer-extension-settings.js')
    ]
  }
};

/**
 * Workers
 */
var overlayWorker, scraperWorker;

var listenForDataRequest = function (worker) {
  worker.port.on("buffer_get_data", function (file) {
    worker.port.emit("buffer_data_url", self.data.url(file));
  });

  worker.port.emit("buffer_options", buildOptions());
};

var listenForDetailsRequest = function (worker) {

  if( ! overlayWorker ) return;

  scraperWorker = worker;

  overlayWorker.port.on("buffer_details", function (data) {
    scraperWorker.port.emit("buffer_details", data);
  });

  scraperWorker.port.on("buffer_details_request", function () {
    overlayWorker.port.emit("buffer_details_request");
  });

};
// Overlay
var attachOverlay = function (data, cb) {

  if( typeof data === 'function' ) cb = data;
  if( ! data ) data = {};
  if( ! cb ) cb = function () {};
  if( ! data.embed ) data.embed = {};

  var worker = tabs.activeTab.attach({
    contentScriptFile: config.plugin.overlay.scripts
  });

  overlayWorker = worker;

  listenForDataRequest(worker);

  worker.port.on('buffer_done', function (overlayData) {
    worker.destroy();
    cb(overlayData);
  });

  // Pass statistic data
  data.version = config.plugin.version;
  if( data.embed.placement ) data.placement = data.embed.placement;

  var windows = tabsUtils.getAllTabContentWindows();
  var window  = windows[tabs.activeTab.index];

  if(tpc_disabled) {
    //trigger the popup instead of the iframe
    bufferSrc.bufferData(worker.port, data, window);
  }
  else {
     worker.port.emit('buffer_click', data);
  }

};

// Show guide on first run
if( ! ss.storage.run ) {
  ss.storage.run = true;
  tabs.open({
    url: config.plugin.guide
  });
}

// Context menu
var menu = {};
menu.page = cm.Item({
  label: config.plugin.menu.page.label,
  image: config.plugin.icon.static,
  context: cm.PageContext(),
  contentScriptFile: config.plugin.menu.page.scripts,
  contentScriptWhen: 'start',
  onMessage: function (data) {
    if(data == 'buffer_click') {
      attachOverlay({placement: 'menu-page'});
    }
  }
});
menu.selection = cm.Item({
  label: config.plugin.menu.selection.label,
  image: config.plugin.icon.static,
  context: cm.SelectionContext(),
  contentScriptFile: config.plugin.menu.page.scripts,
  contentScriptWhen: 'start',
  onMessage: function (data) {
    if(data == 'buffer_click') {
      attachOverlay({placement: 'menu-selection'});
    }
  }
});

menu.image = cm.Item({
  label: config.plugin.menu.image.label,
  image: config.plugin.icon.static,
  context: cm.SelectorContext('img'),
  contentScriptFile: config.plugin.menu.image.scripts,
  contentScriptWhen: 'start',
  onMessage: function (src) {
    attachOverlay({placement: 'menu-image', image: src});
  }
});

// Options & Preferences

/**
 * Turns the preferences object into something useful for the content scripts
 */
var buildOptions = function () {

  var prefs = [{
    "name": "twitter",
    "title": "Twitter Integration",
    "type": "bool",
    "value": simplePrefs.prefs.twitter
  },
  {
    "name": "facebook",
    "title": "Facebook Integration",
    "type": "bool",
    "value": simplePrefs.prefs.facebook
  },
  {
    "name": "quora",
    "title": "Quora Integration",
    "type": "bool",
    "value": simplePrefs.prefs.quora
  },
  {
    "name": "reddit",
    "title": "Reddit Integration",
    "type": "bool",
    "value": simplePrefs.prefs.reddit
  },
  {
    "name": "hacker",
    "title": "Hacker News Integration",
    "type": "bool",
    "value": simplePrefs.prefs.hacker
  },
  {
    "name": "key-combo",
    "title": "Keyboard Shortcut",
    "type": "string",
    "value": simplePrefs.prefs['key-combo']
  },
  {
    "name": "key-enable",
    "title": "Enable Keyboard Shortcut?",
    "type": "bool",
    "value": simplePrefs.prefs['key-enable']
  },
  {
    "name": "image-overlays",
    "title": "Buffer \"Share Image\" Button",
    "type": "bool",
    "value": simplePrefs.prefs['image-overlays']
  }];

  var options = {}, pref;

  // Use "false" if false, and use the item name if true.
  // Stupid, yep, but it made sense in Chrome.
  // TODO: Make this less stupid.
  for( var i in prefs ) {
    if( prefs.hasOwnProperty(i) ) {
      pref = prefs[i];
      if( pref.name == 'key-combo' ) {
        options['buffer.op.key-combo'] = simplePrefs.prefs['key-combo'];
      } else {
        if( simplePrefs.prefs[pref.name] === false ) {
          options["buffer.op." + pref.name] = "false";
        } else {
          options["buffer.op." + pref.name] = pref.name;
        }
      }
      // console.log(pref.name, options["buffer.op." + pref.name]);
    }
  }

  return options;

};

var tpcEmbedHandler = function(worker) {
  worker.port.on('buffer_tpc_disabled', function() {
    tpc_disabled = true;
  });
};

var embedHandler = function (worker, scraper) {

  listenForDataRequest(worker);

  // Firefox get file async
  worker.port.on('buffer_get_file', function (file) {
    worker.port.emit('buffer_file_url', self.data.url(file));
  });

  if( scraper ) {
    scraperWorker = worker;
    listenForDetailsRequest(worker);
  }

  worker.port.on('buffer_click', function (embed) {
    // Buffer a tweet
    attachOverlay({embed: embed}, function (overlaydata) {
      if( !!overlaydata.sent ) {
        // Buffer was sent
        worker.port.emit("buffer_embed_clear");
      }
    });
  });
};

var buffer_button_id  = "buffer-button";

var addNavBarButton = function(browserWindow) {
  if(versionChecker.compare(appInfo.version, "29") >= 0) {
    CustomizableUI.createWidget({
      id : buffer_button_id,
      defaultArea : CustomizableUI.AREA_NAVBAR,
      label : "Buffer",
      tooltiptext : "Buffer This Page",
      onCommand : function(aEvent) {
        attachOverlay({placement: 'toolbar'});
      }
    });
  }
  else{
    var button = widgets.Widget({
      id: buffer_button_id,
      label: config.plugin.label,
      contentURL: config.plugin.icon.static
    });
    button.on('click', function () {
      var prev = config.plugin.icon.loading;
      button.contentURL = config.plugin.icon.loading;
      attachOverlay({placement: 'toolbar'}, function() {
        button.contentURL = config.plugin.icon.static;
      });
    });

    var document = browserWindow.document;
    var navBar = document.getElementById('nav-bar');
    if (!navBar) {
      return;
    }
    var btn = document.createElement('toolbarbutton');
    btn.setAttribute('id', buffer_button_id);
    btn.setAttribute('type', 'button');
    // the toolbarbutton-1 class makes it look like a traditional button
    btn.setAttribute('class', 'toolbarbutton-1');
    btn.setAttribute('image', config.plugin.icon.small);
    // this text will be shown when the toolbar is set to text or text and icons
    btn.setAttribute('label', config.plugin.label);
    btn.addEventListener('click', function() {
      // Go go go
      attachOverlay({placement: 'toolbar'});
    }, false);
    navBar.appendChild(btn);
  }
};

var removeNavBarButton = function(browserWindow, onunload) {
  // Only remove in versions bigger than 29 on onunload.
  if (versionChecker.compare(appInfo.version, "29") >= 0 && onunload) {
    CustomizableUI.destroyWidget(buffer_button_id);
  } else {
    var doc = browserWindow.document;
    if (!doc) return;
    var navBar = doc.getElementById('nav-bar');
    var btn = doc.getElementById(buffer_button_id);
    if (navBar && btn) {
       navBar.removeChild(btn);
    }
  }
};

// Navigation bar icon
// exports.main is called when extension is installed or re-enabled
exports.main = function(options, callbacks) {
  if(versionChecker.compare(appInfo.version, "29") >= 0) {
    Cu.import("resource:///modules/CustomizableUI.jsm");

    var io =
      Cc["@mozilla.org/network/io-service;1"].
      getService(Ci.nsIIOService);

    var style_sheet =
      Cc["@mozilla.org/content/style-sheet-service;1"].
      getService(Ci.nsIStyleSheetService);

    // the 'style' directive isn't supported in chrome.manifest for bootstrapped
    // extensions, so this is the manual way of doing the same.
    var _uri = io.newURI("chrome://buffer-button/skin/toolbar.css", null, null);
    style_sheet.loadAndRegisterSheet(_uri, style_sheet.USER_SHEET);
  }

  // for the current window
  var browserWindow = mediator.getMostRecentWindow('navigator:browser');
  addNavBarButton(browserWindow);

  // Add listeners
  mediator.addListener(windowListener);
};

// exports.onUnload is called when Firefox starts and when the extension is disabled or uninstalled
exports.onUnload = function(reason) {
  // this document is an XUL document
  var browserWindow = mediator.getMostRecentWindow('navigator:browser');
  removeNavBarButton(browserWindow, true);
  mediator.removeListener(windowListener);
};

// handle new windows
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
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

var settingsHandler = function(worker) {

  worker.port.on('buffer_open_settings', function() {
    tabs.open('about:addons');
  });

};

// Embeds
pageMod.PageMod({
  include: '*',
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.hotkey.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: ['.xml'],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.hoverButton.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: ['.xml'],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.tpccheck.scripts,
  contentScriptWhen: "ready",
  onAttach: tpcEmbedHandler
});

pageMod.PageMod({
  include: '*.bufferapp.com',
  contentScriptFile: config.plugin.scraper.scripts,
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    embedHandler(worker, true);
  }
});

pageMod.PageMod({
  include: '*.twitter.com',
  contentScriptFile: config.plugin.twitter.scripts,
  contentScriptWhen: "ready",
  contentStyleFile: config.plugin.twitter.styles,
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.facebook.com',
  contentScriptFile: config.plugin.facebook.scripts,
  contentScriptWhen: "ready",
  attachTo: ['existing', 'top'], //Attach to existing tabs + no frames (top document)
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.quora.com',
  contentScriptFile: config.plugin.quora.scripts,
  contentScriptWhen: 'ready',
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.reddit.com',
  contentScriptFile: config.plugin.reddit.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: ['*.ycombinator.com', '*.ycombinator.org'],
  contentScriptFile: config.plugin.hn.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.bufferapp.com',
  contentScriptFile: config.plugin.bufferapp.scripts,
  contentScriptWhen: "ready",
  contentScript: 'bufferMarkOurSite("' + config.plugin.version + '")',
  contentStyleFile: [ self.data.url('shared/buffer-extension-detection.css') ],
  onAttach: settingsHandler
});
