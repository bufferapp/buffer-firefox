/* jshint node:true, esnext:true */
/**
 * Reading the user preferences
 */

var simplePrefs = require('sdk/simple-prefs');

/**
 * Turns the preferences object into something useful for the content scripts
 */
exports.buildOptions = function () {

  var prefs = [
    {
      name: 'twitter',
      title: 'Twitter Integration',
      type: 'bool',
      value: simplePrefs.prefs.twitter
    },
    {
      name: 'facebook',
      title: 'Facebook Integration',
      type: 'bool',
      value: simplePrefs.prefs.facebook
    },
    {
      name: 'quora',
      title: 'Quora Integration',
      type: 'bool',
      value: simplePrefs.prefs.quora
    },
    {
      name: 'reddit',
      title: 'Reddit Integration',
      type: 'bool',
      value: simplePrefs.prefs.reddit
    },
    {
      name: 'hacker',
      title: 'Hacker News Integration',
      type: 'bool',
      value: simplePrefs.prefs.hacker
    },
    {
      name: 'key-combo',
      title: 'Keyboard Shortcut',
      type: 'string',
      value: simplePrefs.prefs['key-combo']
    },
    {
      name: 'key-enable',
      title: 'Enable Keyboard Shortcut?',
      type: 'bool',
      value: simplePrefs.prefs['key-enable']
    },
    {
      name: 'image-overlays',
      title: 'Buffer "Share Image" Button',
      type: 'bool',
      value: simplePrefs.prefs['image-overlays']
    }
  ];
  var options = {};
  var pref;


  // Use "false" if false, and use the item name if true.
  // This follows how it was original done in the chrome extension

  prefs.forEach(function(pref) {

    if ( pref.name == 'key-combo' ) {
      options['buffer.op.key-combo'] = simplePrefs.prefs['key-combo'];
    } else {
      if ( simplePrefs.prefs[pref.name] === false ) {
        options['buffer.op.' + pref.name] = 'false';
      } else {
        options['buffer.op.' + pref.name] = pref.name;
      }
    }

  });


  // for( var i in prefs ) {
  //   if( prefs.hasOwnProperty(i) ) {
  //     pref = prefs[i];
  //     if( pref.name == 'key-combo' ) {
  //       options['buffer.op.key-combo'] = simplePrefs.prefs['key-combo'];
  //     } else {
  //       if( simplePrefs.prefs[pref.name] === false ) {
  //         options['buffer.op.' + pref.name] = 'false';
  //       } else {
  //         options['buffer.op.' + pref.name] = pref.name;
  //       }
  //     }
  //   }
  // }

  return options;

};
