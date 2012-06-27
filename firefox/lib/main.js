/*

Buffer for Firefox

Authors: Joel Gascoigne         Tom Ashworth
         joel@bufferapp.com     tom.a@bufferapp.com

*/

// Plugin APIs
var widgets     = require("widget");
var tabs        = require("tabs");
var self        = require("self");
var pageMod     = require("page-mod");
var selection   = require("selection");
var ss          = require("simple-storage");
var { Hotkey }  = require('hotkeys');
var cm          = require("context-menu");
var { Cc, Ci }  = require('chrome');
var mediator    = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);

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
    version: "2.2.4",
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
        },
    },
    overlay: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'),
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
            self.data.url('shared/libs/jquery-1.7.2.min.js'), 
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('firefox/buffer-firefox-data-wrapper.js'),
            self.data.url('shared/embeds/buffer-twitter.js')
        ]
    },
    hn: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'), 
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('firefox/buffer-firefox-data-wrapper.js'),
            self.data.url('shared/embeds/buffer-hn.js')
        ]
    },
    reader: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'),
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('firefox/buffer-firefox-data-wrapper.js'),
            self.data.url('shared/embeds/buffer-google-reader.js')
        ]
    },
    reddit: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'),
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('firefox/buffer-firefox-data-wrapper.js'),
            self.data.url('shared/embeds/buffer-reddit.js')
        ]
    },
    facebook: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'),
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('firefox/buffer-firefox-data-wrapper.js'),
            self.data.url('shared/embeds/buffer-facebook.js')
        ]
    },
    hotkey: {
        scripts: [
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('shared/embeds/buffer-hotkey.js')
        ]
    },
    scraper: {
        scripts: [
            self.data.url('shared/libs/jquery-1.7.2.min.js'),
            self.data.url('firefox/buffer-firefox-port-wrapper.js'),
            self.data.url('shared/embeds/buffer-overlay-scraper.js')
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
};
var listenForDetailsRequest = function (worker) {

    if( ! overlayWorker ) return;

    scraperWorker = worker;

    overlayWorker.port.on("buffer_details", function (data) {
        scraperWorker.port.emit("buffer_details", data);
    });

    scraperWorker.port.on("buffer_details_request", function () {
        overlayWorker.port.emit("buffer_details_request")
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

    // Inform overlay that click has occurred
    worker.port.emit("buffer_click", data);
};

// Show guide on first run
if( ! ss.storage.run ) {
    ss.storage.run = true;
    tabs.open({
      url: config.plugin.guide
    });
}

// Buffer this page

var button = widgets.Widget({
    id: 'buffer-button',
    label: config.plugin.label,
    contentURL: config.plugin.icon.static,
    onMouseover: function () {
        if( this.contentURL !== config.plugin.icon.loading) {
            this.contentURL = config.plugin.icon.hover;
        }
    },
    onMouseout: function () {
        if( this.contentURL !== config.plugin.icon.loading) {
            this.contentURL = config.plugin.icon.static;
        }
    }
})
button.on('click', function () {
    prev = config.plugin.icon.loading;
    button.contentURL = config.plugin.icon.loading;
    attachOverlay({placement: 'toolbar'}, function() {
        button.contentURL = config.plugin.icon.static;
    });
})

// Context menu
var menu = {}
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

var embedHandler = function (worker, scraper) {

    listenForDataRequest(worker);
    
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

// Navigation bar icon
// exports.main is called when extension is installed or re-enabled
exports.main = function(options, callbacks) {
    // this document is an XUL document
    var document = mediator.getMostRecentWindow('navigator:browser').document;      
    var navBar = document.getElementById('nav-bar');
    if (!navBar) {
        return;
    }
    var btn = document.createElement('toolbarbutton');  
    btn.setAttribute('id', 'buffer-button');
    btn.setAttribute('type', 'button');
    // the toolbarbutton-1 class makes it look like a traditional button
    btn.setAttribute('class', 'toolbarbutton-1');
    btn.setAttribute('width', 'auto');
    btn.setAttribute('image', config.plugin.icon.small);
    // this text will be shown when the toolbar is set to text or text and icons
    btn.setAttribute('label', config.plugin.label);
    btn.addEventListener('click', function() {
        // Go go go
        attachOverlay({placement: 'toolbar'});
    }, false)
    navBar.appendChild(btn);
};
 
// exports.onUnload is called when Firefox starts and when the extension is disabled or uninstalled
exports.onUnload = function(reason) {
    // this document is an XUL document
    var document = mediator.getMostRecentWindow('navigator:browser').document;      
    var navBar = document.getElementById('nav-bar');
    var btn = document.getElementById('buffer-button');
    if (navBar && btn) {
        navBar.removeChild(btn);
    }
};

// Embeds
pageMod.PageMod({
    include: '*',
    contentScriptFile: config.plugin.hotkey.scripts,
    onAttach: embedHandler
});

pageMod.PageMod({
    include: '*.bufferapp.com',
    contentScriptFile: config.plugin.scraper.scripts,
    onAttach: function(worker) {
        embedHandler(worker, true);
    }
});

pageMod.PageMod({
    include: '*.twitter.com',
    contentScriptFile: config.plugin.twitter.scripts,
    onAttach: embedHandler
});

pageMod.PageMod({
    include: '*.facebook.com',
    contentScriptFile: config.plugin.facebook.scripts,
    onAttach: embedHandler
});

pageMod.PageMod({
    include: '*.google.com',
    contentScriptFile: config.plugin.reader.scripts,
    onAttach: embedHandler
});

pageMod.PageMod({
    include: '*.reddit.com',
    contentScriptFile: config.plugin.reddit.scripts,
    onAttach: embedHandler
});

pageMod.PageMod({
    include: ['*.ycombinator.com', '*.ycombinator.org'],
    contentScriptFile: config.plugin.hn.scripts,
    onAttach: embedHandler
});