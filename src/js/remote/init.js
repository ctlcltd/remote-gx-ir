/**
 * remote-gx-ir/src/js/remote/init.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.init = function() {
  const self = this;

  console.log('init()');

  if (! this.storage.chlist) {
    return done();
  }

  function done() {
    self.status();
    self.zap();
    self.livetv();
  }

  try {
    const chlist = JSON.parse(this.storage.chlist);

    for (const idx in chlist) {
      this.sfv['chlist'][idx] = chlist[idx]['name'];
    }
  } catch (err) {
    console.error('zap()');

    this.error(null, err);
  }

  done();
}

export { remote };
