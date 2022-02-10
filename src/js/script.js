/**
 * remote-gx-ir/src/js/script.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote/index.js';

window._remote = new remote();

function _proxy(callee, nolock) {
  return function(event) {
    const currentTarget = event.currentTarget;

    event.preventDefault();

    if (! nolock && _remote.locked) {
      return false;
    }

    _remote[callee].apply(_remote, Object.values(arguments).slice(1));

    setTimeout(function() {
      currentTarget.blur();

      this.clearTimeout();
    }, 150);

    return false;
  }
}

function ir() {}
ir.prototype.connect = _proxy('connect', true);
ir.prototype.settings = _proxy('settings', true);
ir.prototype.chlist = _proxy('chlist');
ir.prototype.mirror = _proxy('mirror');
ir.prototype.fav = _proxy('fav');
ir.prototype.tv_radio = _proxy('tv_radio');
ir.prototype.zap = _proxy('zap');
ir.prototype.livetv = _proxy('livetv');
ir.prototype.control = _proxy('control');
ir.prototype.return = _proxy('rback');
ir.prototype.prech = _proxy('prech');

window.ir = new ir();
