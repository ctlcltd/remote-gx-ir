/**
 * remote-gx-ir/src/js/remote/remote.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

function remote() {
  this.defaults = {
    'address': window.location.origin + '/service',
    'refresh': '100000',
    'dlna': '1',
    'ftp': '0',
    'stream': '0',
    'fav': 'tv:1',
    'filter_chlist': '1',
    'disconnect_routine': 'green,exit',
    'f1': '',
    'f2': '',
    'f3': '',
    'f4': ''
  };
  this.sts = {
    'server': {
      'label': 'Server',
      'fields': {
        'address': {
          'label': 'Address'
        },
        'refresh': {
          'label': 'Update time',
          'type': 'number'
        },
        'dlna': {
          'label': 'DLNA',
          'type': 'checkbox'
        },
        'ftp': {
          'label': 'FTP',
          'type': 'checkbox'
        },
        'stream': {
          'label': 'Stream',
          'type': 'checkbox'
        }
      }
    },
    'defaults': {
      'label': 'Default settings',
      'fields': {
        'fav': {
          'label': 'Default favourite',
          'type': 'select',
          'relationship': 'chlist',
          'filter': 'tv'
        },
        'filter_chlist': {
          'label': 'Filters channel lists',
          'type': 'checkbox',
          'info': 'Remove list with name not unique or channels less then 2.'
        },
        'disconnect_routine': {
          'label': 'Routine to disconnect'
        }
      }
    },
    'funcs': {
      'label': 'Function buttons',
      'fields': {
        'f1': {
          'label': 'Red button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f2': {
          'label': 'Green button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f3': {
          'label': 'Yellow button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f4': {
          'label': 'Blue button',
          'type': 'select',
          'relationship': 'funcs'
        },
      }
    }
  };
  this.sfv = {
    'chlist': {},
    'funcs': {
      '': 'None',
      'iptv': 'IPTV in memory',
      'm3u': 'Autoget m3u playlist',
      'stalker1': 'Portal 1 Stalker',
      'stalker2': 'Portal 2 Stalker',
      'stalker3': 'Portal 3 Stalker',
      'stalker4': 'Portal 4 Stalker',
      'youtube': 'YouTube',
      'xtream': 'Xtream IPTV',
      'webtv': 'WebTV',
      'webradio': 'Internet radio',
      'wheater': 'Wheater',
      'redtube': 'RedTube',
      'dlna': 'DLNA',
      'kodi': 'KODI'
    }
  };
  this.locked = true;
  this.storage = window.sessionStorage;

  try {
    this.storage.setItem('test', 1);

    if (this.storage.test != '1') {
      throw 0;
    }
  } catch (err) {
    this.error(err, 'storage test');
  }
  if (this.storage.demo || /(\.io|\.com)$/.test(window.location.origin) || window.location.protocol === 'file:') {
    this.demo();
  }
  try {
    if ('settings' in this.storage === false) {
      this.storage.setItem('settings', JSON.stringify(this.defaults));
    }

    this.rs = JSON.parse(this.storage.settings);
  } catch (err) {
    this.error(err, 'storage settings');
  }

  this._req = 0;

  this.cnt = document.getElementById('cnt');
  this.remote = document.getElementById('remote');
  this.infobar = document.getElementById('infobar');
  this.sender = document.getElementById('sending');
  this.setup = document.getElementById('settings');
  this.display = document.getElementById('display');
  this.controls = document.getElementById('controls');
  this.channels = document.getElementById('chlist');
  this.stream = document.getElementById('mirror');

  this.session();
}

export { remote };
