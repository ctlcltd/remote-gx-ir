/**
 * remote-gx-ir/src/js/remote/rback.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.rback = function() {
  const self = this;
  var count = 0;

  console.log('rback()');

  function command() {
    self._req = new Date().getTime();

    self.control('exit');

    if (count++ === 5) {
      self._req = 0;

      clearInterval(timer);
    }
  }

  var timer = setInterval(command, 75);
}

export { remote };
