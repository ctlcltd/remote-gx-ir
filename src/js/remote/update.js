/**
 * remote-gx-ir/src/js/remote/update.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.update = function(rehydrate, callback) {
  const self = this;
  const path_force = rehydrate ? '/' : '/update';
  let x = 1, c = 1;

  console.log('update()', rehydrate);

  chlist();

  if (parseInt(this.rs.dlna)) {
    livetv();
  }

  function filter_chlist(data) {
    console.log('update()', 'filter_chlist()');

    let names = [];
    let chdata = {};

    chdata['channels'] = data['channels'];

    for (const bouquet in data) {
      if (bouquet === 'channels') {
        continue;
      }
      if (bouquet.indexOf(':0') === -1 && names.indexOf(data[bouquet]['name']) != -1 || Object.keys(data[bouquet]['list']).length < 1) {
        continue;
      } else {
        chdata[bouquet] = data[bouquet];
        names.push(data[bouquet]['name']);
        self.sfv['chlist'][bouquet] = data[bouquet]['name'];
      }
    }

    chdata['tv:0']['name'] = 'All';
    chdata['radio:0']['name'] = 'All';

    return chdata;
  }

  function download_chlist(xhr) {
    console.log('update()', 'download_chlist()', xhr);

    try {
      if (xhr.response != 'ERROR') {
        var data;

        if (parseInt(self.rs.filter_chlist)) {
          data = JSON.parse(xhr.response);
          data = filter_chlist(data);
        } else {
          data = xhr.response;
        }
        self.storage.setItem('chlist', JSON.stringify(data));

        cb(c++);

        self.status();
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('update()', 'download_chlist()');

      cb();

      self.error(xhr, err);
    }
  }

  function download_livetv(xhr) {
    console.log('update()', 'download_livetv()', xhr);

    try {
      if (xhr.response != 'ERROR') {
        self.storage.setItem('livetv', xhr.response);

        cb(c++);

        self.status();
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('update()', 'download_livetv()');

      cb();

      self.error(xhr, err);
    }
  }

  function chlist() {
    const channels = self.request('chlist', path_force);
    channels.then(download_chlist).catch(self.error);
  }

  function livetv() {
    const livetv = self.request('dlna', '/livetv' + path_force);
    livetv.then(download_livetv).catch(self.error);
    x++;
  }

  function cb(c) {
    if ((x === c || ! c) && typeof callback === 'function') {
      callback();
    }
  }
}

export { remote };
