/**
 * remote-gx-ir/src/js/remote/currentChannel.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.currentChannel = function() {
  const self = this;
  const subservices = this.request('command', '/web/subservices');

  function command(xhr) {
    console.log('currentChannel()', 'command()', xhr);

    const chcas = self.display.querySelector('.chcas');
    const chnum = self.display.querySelector('.chnum');
    const chname = self.display.querySelector('.chname');

    try {
      const obj = self.parser(xhr.response);
      const fav = self.storage.currentFav;
      const chlist = JSON.parse(self.storage.chlist);

      chname.innerText = obj.e2servicelist.e2service.e2servicename;

      let chid = obj.e2servicelist.e2service.e2servicereference.split(':');
      chid = chid[3] + ':' + chid[4] + ':' + chid[5] + ':' + chid[6];

      self.storage.setItem('currentChannel', chid);

      if (fav in chlist && chid in chlist[fav]['list']) {
        chnum.innerText = chlist[fav]['list'][chid];
      } else if (chid in chlist['channels']) {
        chnum.innerText = chlist['channels'][chid].index;
      } else {
        chnum.innerText = '?';
      }

      chcas.innerText = '';

      if (parseInt(self.rs.dlna) && self.storage.livetv) {
        const livetv = JSON.parse(self.storage.livetv);
        let dnum;

        if (chlist['channels'][chid]) {
          dnum = chlist['channels'][chid].index;
        }
        if (dnum && livetv['channels'][dnum]) {
          chcas.innerText = livetv['channels'][dnum]['cas'] ? '$' : '';
        }
      }
    } catch (err) {
      console.error('currentChannel()', 'command()');

      self.error(xhr, err);
    }
  }

  subservices.then(command).catch(this.error);
}

export { remote };
