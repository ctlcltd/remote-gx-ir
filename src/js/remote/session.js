/**
 * remote-gx-ir/src/js/remote/session.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.session = function(callback) {
  const self = this;
  const session = this.request('command', '/web/session');
  const timestamp = new Date(self.storage.session);
  let expired = false;

  if (self.storage.session) {
    const expires = new Date(new Date().getTime() + (60 * 60 * 24 * 1e3));

    expired = timestamp.getTime() > expires.getTime();
  } else {
    self.storage.setItem('session', new Date().toJSON());
  }

  console.log('session()', timestamp.toJSON(), expired);

  function check(xhr) {
    console.log('session()', 'check()', xhr);

    try {
      if (xhr.response === 'OK') {
        self.storage.setItem('connected', 1);
        self.connect(true);

        if (! self.storage.chlist) {
          self.update(false);
        } else if (expired) {
          self.update(true);
        } else {
          self.init();
        }

        if (! self.storage.currentFav) {
          self.storage.setItem('currentFav', self.rs.fav);
        }

        if (! self.tick && self.rs.refresh != '0') {
          self.tick = setInterval(self.session.bind(self), parseInt(self.rs.refresh));
        }

        if (typeof callback === 'function') {
          callback();
        }
      } else {
        if (self.tick) {
          clearInterval(self.tick);
        }

        throw 0;
      }
    } catch (err) {
      console.error('session()', 'check()');

      self.storage.setItem('connected', 0);
      self.connect(false);

      self.error(xhr, err);

      if (typeof callback === 'function') {
        callback();
      }
    }
  }

  session.then(check).catch(this.error);
}

export { remote };
