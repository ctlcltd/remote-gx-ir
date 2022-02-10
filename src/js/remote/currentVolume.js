/**
 * remote-gx-ir/src/js/remote/currentVolume.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.currentVolume = function() {
  const self = this;
  const volume = this.request('command', '/web/vol');

  function command(xhr) {
    console.log('currentVolume()', 'command()', xhr);

    const cnt = self.display.querySelector('.volume');
    const label = self.display.querySelector('.volume-label');
    const level = self.display.querySelector('.volume-level');

    try {
      const obj = self.parser(xhr.response);

      if (obj.e2volume.e2ismuted === 'True') {
        cnt.classList.add('mute');
        label.innerText = 'MUTE';
      } else {
        cnt.classList.remove('mute');
        label.innerText = 'VOLUME';
      }

      level.innerText = obj.e2volume.e2current;
      level.style.setProperty('--level', obj.e2volume.e2current + '%');
    } catch (err) {
      console.error('currentVolume()', 'command()');

      self.error(xhr, err);
    }
  }

  volume.then(command).catch(this.error);
}


export { remote };
