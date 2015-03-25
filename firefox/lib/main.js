/* jshint node:true, esnext:true */
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

var config      = require('config');
var bufferSrc   = require('bufferSrc');
var prefs       = require('prefs');
var legacy      = require('legacy');

var tpc_disabled = false;

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
  exclude: ['*.xml'],
  attachTo: ["existing", "top"],
  contentScriptFile: config.plugin.hoverButton.scripts,
  contentScriptWhen: "ready",
  onAttach: embedHandler
});

pageMod.PageMod({
  include: '*',
  exclude: ['*.xml'],
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
