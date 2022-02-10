/**
 * remote-gx-ir/src/js/remote/routine.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.routine = function() {
  const self = this;
  let nums = false;

  console.log('routine()', arguments);

  for (const arg of arguments) {
    if (arg.indexOf('num_') != -1) {
      this._req = new Date().getTime();

      nums = true;

      setTimeout(function() {
        self._req += 25;

        self.control(arg);

        this.clearTimeout();
      }, 25);
    } else {
      self.control(arg);
    }
  }

  if (nums) {
    setTimeout(function() {
      self._req = 0;

      self.control('ok');

      this.clearTimeout();
    }, 100);

    setTimeout(function() {
      new self.refresh(true);

      this.clearTimeout();
    }, 150);
  }
}

export { remote };
