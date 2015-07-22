/* jshint node:true, esnext:true */
/**
 * Master configuration for extension
 */

var self = require('sdk/self');

exports.plugin = {
  label: 'Buffer This Page',
  icon: {
    static:         self.data.url('firefox/img/buffer-icon.png'),
    hover:          self.data.url('firefox/img/buffer-icon-hover.png'),
    loading:        self.data.url('firefox/img/buffer-icon-loading.png'),
    small:          self.data.url('firefox/img/buffer-icon-small.png'),
    small_loading:  self.data.url('firefox/img/buffer-icon-small-loading.png')
  },
  guide: 'http://buffer.com/guides/firefox/installed',
  version: self.version,
  menu: {
    page: {
      label: 'Buffer This Page',
      scripts: [self.data.url('firefox/menu/buffer-page.js')]
    },
    selection: {
      label: 'Buffer Selected Text'
    },
    image: {
      label: 'Buffer This Image',
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
  popup: {
    scripts: [
      self.data.url('firefox/buffer-firefox-popup-content-script.js')
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
  tweetdeck: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-tweetdeck.js')
    ],
    styles: [
      self.data.url('shared/embeds/buffer-tweetdeck.css')
    ]
  },
  pinterest: {
    scripts: [
      self.data.url('shared/libs/jquery-2.1.1.min.js'),
      self.data.url('firefox/buffer-firefox-port-wrapper.js'),
      self.data.url('firefox/buffer-firefox-data-wrapper.js'),
      self.data.url('shared/embeds/buffer-pinterest.js')
    ],
    styles: [
      self.data.url('shared/embeds/buffer-pinterest.css')
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
    ],
    styles: [
      self.data.url('shared/embeds/buffer-facebook.css')
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
