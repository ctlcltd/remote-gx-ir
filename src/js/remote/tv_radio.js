/**
 * remote-gx-ir/src/js/remote/tv_radio.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.tv_radio = function() {
  console.log('tv_radio()');

  this.control('tv_radio', false, true);
}

export { remote };
