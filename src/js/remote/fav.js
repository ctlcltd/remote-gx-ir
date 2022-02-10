/**
 * remote-gx-ir/src/js/remote/fav.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.fav = function() {
  console.log('fav()');

  this.control('fav');
}

export { remote };
