/**
 * remote-gx-ir/src/js/remote/prech.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.prech = function() {
  const self = this;

  console.log('prech()');

  this.control('recall');

  setTimeout(function() {
    self.control('ok', false, true);

    this.clearTimeout();
  }, 100);
}

export { remote };
