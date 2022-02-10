/**
 * remote-gx-ir/src/js/remote/connect.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.connect = function(connected) {
  const self = this;
  const button = this.infobar.querySelector('#connect button');
  let pressed = false;

  if (typeof connected === 'undefined') {
    connected = parseInt(this.storage.connected);
    pressed = true;
  }

  console.log('connect()', connected, pressed);

  function disconnect() {
    console.log('connect()', 'disconnect()');

    self.routine.apply(self, self.rs.disconnect_routine.split(','));
  }

  function reconnect() {
    console.log('connect()', 'reconnect()');

    self.remote.setAttribute('data-loading', '');

    self.session(loaded);
  }

  function loaded() {
    console.log('connect()', 'loaded()');

    setTimeout(function() {
      self.remote.removeAttribute('data-loading');

      this.clearTimeout();
    }, 300);
  }

  if (connected) {
    this.locked = false;
    this.cnt.classList.remove('no-session');

    button.querySelector('.connect-icon-disconnect').removeAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').removeAttribute('hidden', '');

    button.querySelector('.connect-icon-reconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-reconnect').setAttribute('hidden', '');

    if (pressed) {
      disconnect();
    }
  } else {
    this.locked = true;
    this.cnt.classList.add('no-session');

    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');
    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');

    button.querySelector('.connect-icon-disconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').setAttribute('hidden', '');

    if (pressed) {
      reconnect();
    }
  }
}

export { remote };
