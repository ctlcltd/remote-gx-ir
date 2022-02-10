/**
 * remote-gx-ir/src/js/remote/error.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.error = function(xhr, err) {
  console.log('error()', xhr, err);
}

export { remote };
