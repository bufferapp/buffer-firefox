/* jshint node:true, esnext:true */
/*
 * Two files are appended at the end of main.js at build time: data/shared/buffermetrics-bg-shim.js and data/shared/buffermetrics.js
 * This allows to reuse buffermetrics.js throughout buffer-web and extensions and still work with Firefox's module system.
 * isFirefox = true; is a global shared with those scripts.
 */
var isFirefox = true;

/* globals _bmq */
/*

Buffer for Firefox

Authors: Joel Gascoigne         Tom Ashworth
         joel@bufferapp.com     tom.a@bufferapp.com

*/

// Plugin APIs
var system      = require('sdk/system');
var buttons     = require('sdk/ui/button/action');
var tabs        = require('sdk/tabs');
var tabsUtils   = require('sdk/tabs/utils');
var self        = require('sdk/self');
var pageMod     = require('sdk/page-mod');
var ss          = require('sdk/simple-storage');
var cm          = require('sdk/context-menu');

var selection   = require('sdk/selection');
var config      = require('config');
var bufferSrc   = require('bufferSrc');
var prefs       = require('prefs');
var legacy      = require('legacy');

var tpc_disabled = false;
var extensionUserData;

const FIREFOX_VERSION = parseInt(system.version.split('.')[0]);
const BUFFER_BUTTON_ID = 'buffer-button';


/**
 * Workers
 */
var overlayWorker;
var scraperWorker;

var listenForDataRequest = function (worker) {
  worker.port.on("buffer_get_data", function (file) {
    worker.port.emit("buffer_data_url", self.data.url(file));
  });

  worker.port.emit("buffer_options", prefs.buildOptions());
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

/**
 * Attach the iframe overlay
 */
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

  // Listen to overlay asking to open a popup from privileged code
  // to bypass CSP on some sites
  worker.port.on('buffer_open_popup', function(url) {
    tabs.open({
      url: url,
      inNewWindow: true,

      onLoad: function(tab) {
        var worker = tab.attach({
          contentScriptFile: config.plugin.popup.scripts
        });

        worker.port.on("buffer_close_popup", function() {
          tab.close();
        })
      }
    });
  });

  // Map content script _bmq calls to the real _bmq here
  worker.port.on('buffer_tracking', function(payload) {
    _bmq[payload.methodName].apply(_bmq, payload.args);
  });

  // Send cached user data to overlay when it opens up
  if (extensionUserData) {
    worker.port.on('buffer_overlay_open', function() {
      worker.port.emit('buffer_user_data', extensionUserData);
    });
  }

  // Listen for user data from buffer-overlay, and cache it here
  worker.port.on('buffer_user_data', function(userData) {
    extensionUserData = userData;
    worker.port.emit('buffer_user_data', extensionUserData);
  });
};

// Show guide on first run
if( ! ss.storage.run ) {
  ss.storage.run = true;
  tabs.open({
    url: config.plugin.guide
  });
}

/**
 * Context menu
 */
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
menu.pablo = cm.Item({
  label: 'Create Image With Pablo',
  image: config.plugin.icon.static,
  context: cm.SelectionContext(),
  contentScriptFile: config.plugin.menu.page.scripts,
  contentScriptWhen: 'start',
  onMessage: function (data) {
    if(data == 'buffer_click') {
      tabs.open('https://buffer.com/pablo?text=' + encodeURIComponent(selection.text));
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

menu.pablo_image = cm.Item({
  label: config.plugin.menu.pablo_image.label,
  image: config.plugin.icon.static,
  context: cm.SelectorContext('img'),
  contentScriptFile: config.plugin.menu.image.scripts,
  contentScriptWhen: 'start',
  onMessage: function(src) {
    tabs.open('https://buffer.com/pablo?image=' + encodeURIComponent(src));
  }
});


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


var addNavBarButton = function() {

  if (FIREFOX_VERSION >= 29) {

    var button = buttons.ActionButton({
      id: BUFFER_BUTTON_ID,
      label: 'Buffer ' + FIREFOX_VERSION,
      icon: {
        '16': './icons/icon-16.png',
        '32': './icons/icon-32.png',
        '64': './icons/icon-64.png'
      },
      onClick: function() {
        attachOverlay({ placement: 'toolbar' });
      }
    });

  } else {

    legacy.addNavBarButton(function onButtonClick() {
      attachOverlay({ placement: 'toolbar' });
    });

  }
};


addNavBarButton();

// exports.onUnload is called when Firefox starts and when the extension is disabled or uninstalled
exports.onUnload = function(reason) {
  if (FIREFOX_VERSION < 29) {
    legacy.addNavBarButton();
  }
};


var settingsHandler = function(worker) {

  worker.port.on('buffer_open_settings', function() {
    tabs.open('about:addons');
  });

};

// Injecting scripts breaks Firefox's XML file viewer
var excludeXMLPattern = /.*\.xml/;

// Embeds
pageMod.PageMod({
  include: '*',
  exclude: [excludeXMLPattern],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.hotkey.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: [excludeXMLPattern],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.hoverButton.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: [excludeXMLPattern],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.tpccheck.scripts,
  contentScriptWhen: "ready",
  onAttach: tpcEmbedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: [excludeXMLPattern],
  attachTo: ['existing', 'top'],
  contentStyleFile: config.plugin.overlay.styles
});

//NOTE - Scraper is currently disabled - MAR 2015
pageMod.PageMod({
  include: ['*.buffer.com', '*.bufferapp.com'],
  contentScriptFile: config.plugin.scraper.scripts,
  contentScriptWhen: "ready",
  onAttach: function(worker) {
    embedHandler(worker, true);
  }
});

pageMod.PageMod({
  include: '*.twitter.com',
  exclude: ['*.tweetdeck.twitter.com'],
  contentScriptFile: config.plugin.twitter.scripts,
  contentScriptWhen: "ready",
  contentStyleFile: config.plugin.twitter.styles,
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.tweetdeck.twitter.com',
  contentScriptFile: config.plugin.tweetdeck.scripts,
  contentScriptWhen: "ready",
  contentStyleFile: config.plugin.tweetdeck.styles,
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.pinterest.com',
  contentScriptFile: config.plugin.pinterest.scripts,
  contentScriptWhen: "ready",
  contentStyleFile: config.plugin.pinterest.styles,
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*.facebook.com',
  contentScriptFile: config.plugin.facebook.scripts,
  contentScriptWhen: "ready",
  contentStyleFile: config.plugin.facebook.styles,
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
  include: ['*.buffer.com', '*.bufferapp.com'],
  contentScriptFile: config.plugin.bufferapp.scripts,
  contentScriptWhen: "ready",
  contentScript: 'bufferMarkOurSite("' + config.plugin.version + '")',
  contentStyleFile: [ self.data.url('shared/buffer-extension-detection.css') ],
  onAttach: settingsHandler
});
