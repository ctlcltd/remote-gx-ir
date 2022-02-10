/**
 * remote-gx-ir/src/js/remote/livetv.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.livetv = function(checked) {
  console.log('livetv()', checked);

  if (typeof checked === 'undefined') {
    this.infobar.querySelector('#livetv input[type="checkbox"]').checked = this.storage.t_livetv;

    return;
  }

  if (this.storage.t_livetv) {
    this.storage.removeItem('t_livetv');

    //TODO
    if (this.storage.s_livetv) {
      this.storage.removeItem('s_livetv');

      this.routine('fav', 'down', 'ok', 'ok', 'exit');
    }
  } else {
    this.storage.setItem('t_livetv', 1);
  }
}

export { remote };
