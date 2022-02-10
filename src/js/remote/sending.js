/**
 * remote-gx-ir/src/js/remote/sending.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.sending = function() {
  const self = this;

  console.info('sending()');

  this.sender.removeAttribute('hidden');

  function hide() {
    self.sender.setAttribute('hidden', '');

    this.clearTimeout();
  }

  setTimeout(hide, 250);
}

export { remote };
