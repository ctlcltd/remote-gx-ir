/**
 * remote-gx-ir/src/js/remote/zap.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.zap = function(checked) {
  console.log('zap()', checked);

  if (typeof checked === 'undefined') {
    this.infobar.querySelector('#zap input[type="checkbox"]').checked = this.storage.t_zap;

    return;
  }

  if (this.storage.t_zap) {
    this.storage.removeItem('t_zap');
  } else {
    this.storage.setItem('t_zap', 1);
  }
}

export { remote };
