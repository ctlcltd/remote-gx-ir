/**
 * remote-gx-ir/src/js/remote/refresh.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.refresh = function(refresh) {
  console.log('refresh()', refresh);

  if (typeof refresh === 'string') {
    this[refresh]();
  } else if (refresh) {
    this.currentChannel();
    this.currentSignal();
  }
}

remote.prototype.refresh.prototype.currentChannel = function() {
  setTimeout(function() {
    _remote.status('currentChannel');

    this.clearTimeout();
  }, 500);
}

remote.prototype.refresh.prototype.currentSignal = function() {
  setTimeout(function() {
    _remote.status('currentSignal');

    this.clearTimeout();
  }, 3000);
}

remote.prototype.refresh.prototype.currentVolume = function() {
  setTimeout(function() {
    _remote.status('currentVolume');

    this.clearTimeout();
  }, 500);
}

export { remote };
