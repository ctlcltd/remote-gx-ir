/**
 * remote-gx-ir/src/js/remote/chlist.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.chlist = function(close) {
  const self = this;
  const form = this.channels.querySelector('form');
  const select = form.querySelector('#fav');
  const table = this.channels.querySelector('table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  var livetv;

  if (parseInt(self.rs.dlna) && self.storage.livetv) {
    livetv = JSON.parse(self.storage.livetv);
  }

  console.log('chlist()', close);

  function show() {
    console.log('chlist()', 'show()');

    self.channels.removeAttribute('hidden');
    self.channels.classList.add('in');

    list();

    setTimeout(function() {
      self.channels.classList.remove('in');
    }, 50);
  }

  function hide() {
    console.log('chlist()', 'hide()');

    self.channels.classList.add('out');

    setTimeout(function() {
      self.channels.setAttribute('hidden', '');
      self.channels.classList.remove('out');
    }, 50);
  }

  function list(fav) {
    console.log('chlist()', 'list()', fav);

    try {
      if (self.storage.chlist) {
        const chlist = JSON.parse(self.storage.chlist);

        if (! form.rendered) {
          render_form(chlist);
        } else if (fav && fav in chlist) {
          render_table(chlist, fav);
        } else {
          if (self.storage.t_livetv != self.storage.p_livetv && self.storage.currentFav) {
            render_table(chlist, self.storage.currentFav);
          }
        }
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('chlist()', 'list()');

      self.error(null, err);
    }
  }

  function render_form(data) {
    console.log('chlist()', 'render_form()');

    const fav = self.storage.currentFav;
    var optgroup;

    optgroup = document.createElement('optgroup');
    optgroup.setAttribute('label', 'TV');
    select.append(optgroup);

    optgroup = document.createElement('optgroup');
    optgroup.setAttribute('label', 'RADIO');
    select.append(optgroup);

    for (const idx in data) {
      if (idx === 'channels') {
        continue;
      }
      if (idx.indexOf('tv') != -1) {
        optgroup = select.firstElementChild;
      } else {
        optgroup = select.lastElementChild;
      }

      const option = document.createElement('option');
      option.value = idx;
      option.innerText = data[idx]['name'];

      optgroup.append(option);
    }

    select.onchange = listChange;

    if (! self.storage.s_livetv) {
      select.value = fav;
    }

    render_table(data, fav);

    form.rendered = true;
  }

  function render_table(data, current) {
    console.log('chlist()', 'render_table()');

    const tr_tpl = tbody.firstElementChild;

    if (table.rendered) {
      const tr = tr_tpl.cloneNode(true);
      while (tbody.firstChild && tbody.removeChild(tbody.firstChild));
      tbody.append(tr);
    }

    var i = 0;

    for (const chid in data[current]['list']) {
      const tr = tr_tpl.cloneNode(true);

      tr.firstElementChild.innerText = data[current]['list'][chid];
      tr.firstElementChild.nextElementSibling.innerText = data['channels'][chid].channel;
      tr.lastElementChild.innerText = '';

      tr.dataset.fav = current;
      tr.dataset.dnum = '';
      tr.dataset.res = '';

      if (livetv) {
        let dnum;

        if (data['channels'][chid]) {
          dnum = data['channels'][chid].index;
        }
        if (dnum && livetv['channels'][dnum]) {
          tr.dataset.dnum = dnum;
          tr.dataset.res = livetv['channels'][dnum].res;
          tr.lastElementChild.innerText = livetv['channels'][dnum]['cas'] ? '$' : '';
        }
        if (self.storage.t_livetv && current.indexOf('tv') === -1) {
          tr.setAttribute('disabled', '');
        }
      }

      tr.dataset.chnum = data[current]['list'][chid];
      tr.dataset.idx = current;
      tr.onclick = channelChange;
      tr.removeAttribute('hidden');

      tbody.append(tr);

      i++;
    }

    const tr = document.createElement('tr');
    tr.append(document.createElement('td'));
    tr.append(document.createElement('td'));
    tbody.append(tr);

    table.rendered = true;

    self.storage.setItem('p_livetv', self.storage.t_livetv ? self.storage.t_livetv : false);
  }

  function _zap() {
    console.info('chlist()', '_zap()', this.dataset.chnum);

    self.storage.setItem('currentFav', this.dataset.fav);

    let cmds = this.dataset.chnum.split('').map(function(num) { return 'num_' + num; });
    self.routine.apply(self, cmds);
  }

  //TODO
  //- dlna trick
  //- fav
  function _livetv() {
    console.info('chlist()', '_livetv()', this.dataset.chnum);

    if (! self.storage.s_livetv) {
      self.storage.setItem('s_livetv', true);
      self.storage.setItem('currentFav', 'tv:0');
    }

    if (this.dataset.dnum && this.dataset.res) {
      window.open(this.dataset.res);
    }
  }

  function channelChange(event) {
    event.preventDefault();

    console.info('chlist()', 'channelChange()', this.dataset.chnum, this.dataset.dnum);

    if (self.storage.t_zap) {
      return window.alert('ZAP\u2026');
    } else if (parseInt(self.rs.dlna) && self.storage.t_livetv) {
      _livetv.call(this);
    } else {
      _zap.call(this);
    }

    setTimeout(function() {
      hide();

      this.clearTimeout();
    }, 100);
  }

  function listChange(event) {
    event.preventDefault();

    console.info('chlist()', 'listChange()', this.value);

    list(this.value);
  }

  if (close) {
    return hide();
  }

  if (this.channels.hasAttribute('hidden')) {
    show();
  } else {
    hide();
  }
}

export { remote };
