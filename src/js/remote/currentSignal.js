/**
 * remote-gx-ir/src/js/remote/currentSignal.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.currentSignal = function() {
  const self = this;
  const signal = this.request('command', '/web/signal');

  function command(xhr) {
    console.log('currentSignal()', 'command()', xhr);

    const strength = self.display.querySelector('.signal-strength');
    const quality = self.display.querySelector('.signal-quality');

    try {
      const obj = self.parser(xhr.response);

      strength.style.setProperty('--level', obj.e2frontendstatus.e2acg);
      strength.innerText = obj.e2frontendstatus.e2acg;

      quality.style.setProperty('--level', obj.e2frontendstatus.e2snr);
      quality.innerText = obj.e2frontendstatus.e2snr;
    } catch (err) {
      console.error('currentSignal()', 'command()');

      self.error(xhr, err);
    }
  }

  signal.then(command).catch(this.error);
}

export { remote };
