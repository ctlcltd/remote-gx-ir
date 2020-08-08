/*!
 * remote-gx-ir/script.js
 * 
 * @author Leonardo Laureti <https://loltgt.ga>
 * @version 2020-08-08
 * @license MIT License
 */

function remote() {
  this.defaults = {
    'address': window.location.origin + '/service',
    'refresh': '100000',
    'dlna': '1',
    'ftp': '0',
    'stream': '0',
    'fav': 'tv:1',
    'disconnect_routine': 'green,exit',
    'f1': '',
    'f2': '',
    'f3': '',
    'f4': ''
  };
  this.sts = {
    'server': {
      'label': 'Server',
      'fields': {
        'address': {
          'label': 'Address'
        },
        'refresh': {
          'label': 'Update time',
          'type': 'number'
        },
        'dlna': {
          'label': 'DLNA',
          'type': 'checkbox'
        },
        'ftp': {
          'label': 'FTP',
          'type': 'checkbox'
        },
        'stream': {
          'label': 'Stream',
          'type': 'checkbox'
        }
      }
    },
    'defaults': {
      'label': 'Default settings',
      'fields': {
        'fav': {
          'label': 'Default favourite',
          'type': 'select',
          'relationship': 'chlist',
          'filter': 'lamedb|tv'
        },
        'disconnect_routine': {
          'label': 'Routine to disconnect'
        }
      }
    },
    'funcs': {
      'label': 'Function buttons',
      'fields': {
        'f1': {
          'label': 'Red button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f2': {
          'label': 'Green button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f3': {
          'label': 'Yellow button',
          'type': 'select',
          'relationship': 'funcs'
        },
        'f4': {
          'label': 'Blue button',
          'type': 'select',
          'relationship': 'funcs'
        },
      }
    }
  };
  this.sfv = {};
  this.locked = true;
  this.storage = window.sessionStorage;

  try {
    this.storage.setItem('test', 1);

    if (this.storage.test != '1') {
      throw 0;
    }
  } catch (err) {
    this.error(err, 'storage test');
  }

  try {
    if ('settings' in this.storage === false) {
      this.storage.setItem('settings', JSON.stringify(this.defaults));
    }

    this.rs = JSON.parse(this.storage.settings);
  } catch (err) {
    this.error(err, 'storage settings');
  }

  this._req = 0;

  this.cnt = document.getElementById('cnt');
  this.remote = document.getElementById('remote');
  this.infobar = document.getElementById('infobar');
  this.sender = document.getElementById('sending');
  this.setup = document.getElementById('settings');
  this.display = document.getElementById('display');
  this.controls = document.getElementById('controls');
  this.channels = document.getElementById('chlist');
  this.stream = document.getElementById('mirror');

  this.session();
  this.zap();
  this.livetv();
}

remote.prototype.request = function(service, uri) {
  if (service) {
    service = '/' + service.toString();
  } else {
    throw 'Missing "service" argument.';
  }

  uri = uri ? uri.toString() : '';

  const xhr = new XMLHttpRequest();
  let url = this.rs.address + service + uri;

  if (this._req) {
    url += url.indexOf('?') === -1 ? '?t=' + this._req : '&t=' + this._req;
  }

  xhr.open('get', url);
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send();

  return new Promise(function(resolve, reject) {
    xhr.onload = function() { resolve(xhr); };
    xhr.onerror = function() { reject(xhr); };
  });
}

remote.prototype.status = function(refresh) {
  const self = this;

  console.log('status()', refresh);

  if (refresh) {
    for (const arg of arguments) {
      if (arg in self && typeof self[arg] === 'function') {
        self[arg]();
      }
    }

    return;
  }

  this.currentChannel();
  this.currentSignal();
  this.currentVolume();
}

remote.prototype.routine = function() {
  const self = this;
  let nums = false;

  console.log('routine()', arguments);

  for (const arg of arguments) {
    if (arg.indexOf('num_') != -1) {
      this._req = new Date().getTime();

      nums = true;

      setTimeout(function() {
        self._req += 25;

        self.control(arg);

        this.clearTimeout();
      }, 25);
    } else {
      self.control(arg);
    }
  }

  if (nums) {
    setTimeout(function() {
      self._req = 0;

      self.control('ok');

      this.clearTimeout();
    }, 100);

    setTimeout(function() {
      new self.refresh(true);

      this.clearTimeout();
    }, 150);
  }
}

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

      const chid = obj.e2servicelist.e2service.e2servicereference.substr(6, (obj.e2servicelist.e2service.e2servicereference.length - 13));

      self.storage.setItem('currentChannel', chid);

      if (fav === 'lamedb' && chlist['lamedb']['list'][chid]) {
        chnum.innerText = chlist['lamedb']['list'][chid].num;
      } else if (chlist[fav]['list'][chid]) {
        chnum.innerText = chlist[fav]['list'][chid].num;
      } else {
        chnum.innerText = '?';
      }

      chcas.innerText = '';

      if (parseInt(self.rs.dlna) && self.storage.livetv) {
        const livetv = JSON.parse(self.storage.livetv);
        let dnum;

        if (chlist['lamedb']['list'][chid]) {
          dnum = chlist['lamedb']['list'][chid].num;
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

remote.prototype.return = function() {
  const self = this;
  var count = 0;

  console.log('return()');

  function command() {
    self._req = new Date().getTime();

    self.control('exit');

    if (count++ === 5) {
      self._req = 0;

      clearInterval(timer);
    }
  }

  var timer = setInterval(command, 75);
}

remote.prototype.prech = function() {
  const self = this;

  console.log('prech()');

  this.control('recall');

  setTimeout(function() {
    self.control('ok', false, true);

    this.clearTimeout();
  }, 100);
}

remote.prototype.parser = function(xml) {
  const parser = new DOMParser();
  const docXml = parser.parseFromString(xml, 'text/xml');

  return xmlToJson(docXml);
}

remote.prototype.error = function(xhr, err) {
  console.log('error()', xhr, err);
}

remote.prototype.control = function(cmd, wait, refresh) {
  const self = this;
  const action = this.request('command', '/irkey?action=' + cmd);
  const chdigits = this.display.querySelector('.chdigits');

  var timer;

  console.info('control()', cmd, wait, refresh);

  function command(xhr) {
    console.log('control()', 'command()', xhr);

    try {
      if (xhr.response === 'OK') {
        self.sending();

        if (wait) {
          digits(cmd);

          timer = setTimeout(elapsed, 5000);
        } else {
          new self.refresh(refresh);
        }
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('control()', 'command()');

      self.error(xhr, err);
    }
  }

  function elapsed() {
    new self.refresh(true);

    if (wait) {
      chdigits.setAttribute('hidden', '');
      chdigits.innerText = '';
    }
  }

  function digits(cmd) {
    console.log('control()', 'digits()', cmd);

    chdigits.removeAttribute('hidden');
    chdigits.innerText += cmd.replace('num_', '');

    if (chdigits.innerText.length === 4 && ! timer) {
      elapsed();
    }
  }

  action.then(command).catch(this.error);
}

remote.prototype.sending = function() {
  const self = this;

  console.info('sending()');

  this.sender.removeAttribute('hidden');

  function hide() {
    self.sender.setAttribute('hidden', '');

    this.clearTimeout();
  }

  setTimeout(hide, 250);
}

remote.prototype.refresh = function(refresh) {
  console.log('refresh()', refresh);

  if (typeof refresh === 'string') {
    this[refresh]();
  } else if (refresh) {
    this.currentChannel();
    this.currentSignal();
  }
}

remote.prototype.refresh.prototype.currentChannel = function() {
  setTimeout(function() {
    _remote.status('currentChannel');

    this.clearTimeout();
  }, 500);
}

remote.prototype.refresh.prototype.currentSignal = function() {
  setTimeout(function() {
    _remote.status('currentSignal');

    this.clearTimeout();
  }, 3000);
}

remote.prototype.refresh.prototype.currentVolume = function() {
  setTimeout(function() {
    _remote.status('currentVolume');

    this.clearTimeout();
  }, 500);
}

remote.prototype.connect = function(connected) {
  const self = this;
  const button = this.infobar.querySelector('#connect button');
  let pressed = false;

  if (typeof connected === 'undefined') {
    connected = parseInt(this.storage.connected);
    pressed = true;
  }

  console.log('connect()', connected, pressed);

  function disconnect() {
    console.log('connect()', 'disconnect()');

    self.routine.apply(self, self.rs.disconnect_routine.split(','));
  }

  function reconnect() {
    console.log('connect()', 'reconnect()');

    self.remote.setAttribute('data-loading', '');

    self.session(loaded);
  }

  function loaded() {
    console.log('connect()', 'loaded()');

    setTimeout(function() {
      self.remote.removeAttribute('data-loading');

      this.clearTimeout();
    }, 300);
  }

  if (connected) {
    this.locked = false;
    this.cnt.classList.remove('no-session');

    button.querySelector('.connect-icon-disconnect').removeAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').removeAttribute('hidden', '');

    button.querySelector('.connect-icon-reconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-reconnect').setAttribute('hidden', '');

    if (pressed) {
      disconnect();
    }
  } else {
    this.locked = true;
    this.cnt.classList.add('no-session');

    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');
    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');

    button.querySelector('.connect-icon-disconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').setAttribute('hidden', '');

    if (pressed) {
      reconnect();
    }
  }
}

remote.prototype.chlist = function(close) {
  const self = this;
  const form = this.channels.querySelector('form');
  const select = form.querySelector('#fav');
  const table = this.channels.querySelector('table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  var livetv;

  if (parseInt(self.rs.dlna)) {
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
    var optgroup, last_group;

    for (const idx in data) {
      if (Object.keys(data[idx]['list']).length < 2) {
        continue;
      }

      let current_group = idx === 'lamedb' ? idx : idx.split(':')[0];

      if (current_group != last_group) {
        optgroup = document.createElement('optgroup');
        optgroup.setAttribute('label', current_group.toUpperCase());

        select.append(optgroup);
      }

      const option = document.createElement('option');
      option.value = idx;
      option.innerText = data[idx]['name'];

      optgroup.append(option);

      last_group = current_group;
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

      tr.firstElementChild.innerText = data[current]['list'][chid].num;
      tr.firstElementChild.nextElementSibling.innerText = data[current]['list'][chid].name;
      tr.lastElementChild.innerText = '';

      tr.dataset.fav = current;
      tr.dataset.dnum = '';
      tr.dataset.res = '';

      if (livetv) {
        let dnum;

        if (data['lamedb']['list'][chid]) {
          dnum = data['lamedb']['list'][chid].num;
        }
        if (dnum && livetv['channels'][dnum]) {
          tr.dataset.dnum = dnum;
          tr.dataset.res = livetv['channels'][dnum].res;
          tr.lastElementChild.innerText = livetv['channels'][dnum]['cas'] ? '$' : '';
        } else {
          tr.setAttribute('disabled', '');
        }
        if (self.storage.t_livetv && current.indexOf('tv') === -1) {
          tr.setAttribute('disabled', '');
        }
      }

      tr.dataset.chnum = data[current]['list'][chid].num;
      tr.dataset.idx = current;
      tr.onclick = channelChange;
      tr.removeAttribute('hidden');

      tbody.append(tr);

      i++;
    }

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
      self.storage.setItem('currentFav', 'lamedb');
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

remote.prototype.update = function(rehydrate) {
  const self = this;
  const path_force = rehydrate ? '/' : '/update';

  console.log('update()', rehydrate);

  chlist();

  if (parseInt(this.rs.dlna)) {
    livetv();
  }

  function download_chlist(xhr) {
    console.log('update()', 'download_chlist()', xhr);

    try {
      if (xhr.response != 'ERROR') {
        self.storage.setItem('chlist', xhr.response);

        self.status();
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('update()', 'download_chlist()');

      self.error(xhr, err);
    }
  }

  function download_livetv(xhr) {
    console.log('update()', 'download_livetv()', xhr);

    try {
      if (xhr.response != 'ERROR') {
        self.storage.setItem('livetv', xhr.response);

        self.status();
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('update()', 'download_livetv()');

      self.error(xhr, err);
    }
  }

  function chlist() {
    const channels = self.request('chlist', path_force);
    channels.then(download_chlist).catch(self.error);
  }

  function livetv() {
    const livetv = self.request('dlna', '/livetv' + path_force);
    livetv.then(download_livetv).catch(self.error);
  }
}

remote.prototype.mirror = function(close) {
  const self = this;
  const form = this.stream.querySelector('form');

  console.log('mirror()', close);

  function stream(xhr) {
    console.log('mirror()', 'stream()', xhr);

    try {
      if (xhr.response != 'ERROR') {
        data = JSON.parse(xhr.response);

        links(data);
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('mirror()', 'stream()');

      self.error(xhr, err);
    }
  }

  function show() {
    console.log('mirror()', 'show()');

    self.stream.removeAttribute('hidden');
    self.stream.classList.add('in');

    if (! form.rendered) {
      render();
      start();
    }

    setTimeout(function() {
      self.stream.classList.remove('in');

      this.clearTimeout();
    }, 50);
  }

  function hide() {
    console.log('mirror()', 'hide()');

    self.stream.classList.add('out');

    setTimeout(function() {
      self.stream.setAttribute('hidden', '');
      self.stream.classList.remove('out');

      this.clearTimeout();
    }, 50);
  }

  function render() {
    console.log('mirror()', 'render()');

    form.querySelector('#streamurl').onclick = open;
    form.querySelector('#dlnaurl').onclick = open;

    form.lastElementChild.firstElementChild.onclick = copy;
    form.lastElementChild.lastElementChild.onclick = stop;

    form.rendered = true;
  }

  function clear() {
    console.log('mirror()', 'clear()');

    form.querySelector('#ftp').setAttribute('hidden', '');
    form.querySelector('#dlna').setAttribute('hidden', '');
    form.querySelector('#stream').setAttribute('hidden', '');

    form.reset();

    form.querySelector('#streamurl').onclick = null;
    form.querySelector('#dlnaurl').onclick = null;
    form.lastElementChild.firstElementChild.onclick = null;
    form.lastElementChild.lastElementChild.onclick = null;

    form.rendered = false;
  }

  function links(data) {
    console.log('mirror()', 'links()', data);

    if ('ftpurl' in data) {
      form.querySelector('#ftp').removeAttribute('hidden');
      form.querySelector('#ftpurl').value = data.ftpurl;
    }
    if ('dlnaurl' in data) {
      form.querySelector('#dlna').removeAttribute('hidden');
      form.querySelector('#dlnaurl').value = data.dlnaurl;
    }
    if ('streamurl' in data) {
      form.querySelector('#stream').removeAttribute('hidden');
      form.querySelector('#streamurl').value = data.streamurl;
    }
  }

  function copy(event) {
    event.preventDefault();

    console.log('mirror()', 'copy()');

    var clipb = document.createElement('TEXTAREA');

    clipb.style = 'position: absolute; top: 0; right: 0; width: 0; height: 0; z-index: -1; overflow: hidden;';
    clipb.value = form.querySelector('input[type="text"]').value

    document.body.appendChild(clipb);

    if (navigator.userAgent.match(/(iPad|iPhone|iPod)/i)) {
      var range = document.createRange();
      range.selectNodeContents(clipb);

      var selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      clipb.setSelectionRange(0, 999999);
    } else {
      clipb.focus();
      clipb.select();
    }

    document.execCommand('copy');
    document.body.removeChild(clipb);
  }

  function open(event) {
    event.preventDefault();

    console.log('mirror()', 'open()');

    if (this.value) {
      window.open(this.value);
    }
  }

  function start() {
    console.log('mirror()', 'start()');

    var chnum = '';

    try {
      const chlist = JSON.parse(self.storage.chlist);
      const chid = self.storage.currentChannel;

      if (chid && chlist['lamedb']['list'][chid]) {
        chnum = chlist['lamedb']['list'][chid].num;
      }
    } catch (err) {
      console.error('mirror()', 'start()');

      self.error(xhr, err);
    }

    if (parseInt(self.rs.dlna) && ! (parseInt(self.rs.ftp) || parseInt(self.rs.stream))) {
      const mirror = self.request('mirror', '/' + chnum);

      mirror.then(stream).catch(self.error);
    } else {
      self.routine('playpause');

      setTimeout(function() {
        self.control('stop');

        this.clearTimeout();
      }, 100);

      setTimeout(function() {
        const mirror = self.request('mirror', '/' + chnum);

        mirror.then(stream).catch(self.error);

        this.clearTimeout();
      }, 3e2);
    }
  }

  function stop(event) {
    event.preventDefault();

    console.log('mirror()', 'stop()');

    if (parseInt(self.rs.dlna) && ! (parseInt(self.rs.ftp) || parseInt(self.rs.stream))) {
      self.control('stop');
    } else {
      self.routine('stop', 'channelup', 'channeldown');

      setTimeout(function() {
        self.status('currentChannel');

        this.clearTimeout();
      }, 500);

      setTimeout(function() {
        self.status('currentSignal');

        this.clearTimeout();
      }, 3000);
    }

    const mirror = self.request('mirror', '/close');

    mirror.then(clear).catch(self.error);

    this.blur();
  }

  if (close) {
    return hide();
  }

  if (this.storage.t_zap) {
    return window.alert('ZAP\u2026');
  }

  if (this.setup.hasAttribute('hidden')) {
    show();
  } else {
    hide();
  }
}

remote.prototype.fav = function() {
  console.log('fav()');

  this.control('fav');
}

remote.prototype.tv_radio = function() {
  console.log('tv_radio()');

  this.control('tv_radio', false, true);
}

remote.prototype.zap = function(checked) {
  console.log('zap()', checked);

  if (typeof checked === 'undefined') {
    this.infobar.querySelector('#zap input[type="checkbox"]').checked = this.storage.t_zap;
    this.sfv['chlist'] = {'lamedb': 'ALL'};

    try {
      const chlist = JSON.parse(this.storage.chlist);

      for (const idx in chlist) {
        if (Object.keys(chlist[idx]['list']).length < 2) {
          continue;
        }

        this.sfv['chlist'][idx] = chlist[idx]['name'];
      }
    } catch (err) {
      console.error('zap()');

      this.error(null, err);
    }

    return;
  }

  if (this.storage.t_zap) {
    this.storage.removeItem('t_zap');
  } else {
    this.storage.setItem('t_zap', 1);
  }
}

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

remote.prototype.settings = function(close) {
  const self = this;
  const form = this.setup.querySelector('form');
  const form_ph = form.firstElementChild;
  const form_lt = form.lastElementChild;
  const fieldset_ph = form.firstElementChild.nextElementSibling;

  console.log('settings()', close);

  function show() {
    console.log('settings()', 'show()');

    self.setup.removeAttribute('hidden');
    self.setup.classList.add('in');

    setup();

    setTimeout(function() {
      self.setup.classList.remove('in');

      this.clearTimeout();
    }, 50);
  }

  function hide() {
    console.log('settings()', 'hide()');

    self.setup.classList.add('out');

    setTimeout(function() {
      self.setup.setAttribute('hidden', '');
      self.setup.classList.remove('out');

      this.clearTimeout();
    }, 50);
  }

  function setup() {
    console.log('settings()', 'setup()');

    if (form.rendered) {
      return;
    }

    try {
      if (self.storage.settings) {
        const settings = JSON.parse(self.storage.settings);

        render(settings);
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('settings()', 'setup()');

      self.error(null, err);
    }
  }

  function render(data) {
    console.log('settings()', 'render()');

    for (const s in self.sts) {
      const fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.innerText = self.sts[s]['label'];

      fieldset.append(legend);

      for (const f in self.sts[s]['fields']) {
        const row = data[f];
        const field = self.sts[s]['fields'][f];

        const div = document.createElement('div');
        const label = document.createElement('label');

        label.innerText = field['label'];
        div.append(label);

        if (field['type'] === 'select') {
          const select = document.createElement('select');
          let values = {};
          if ('relationship' in field) {
            if ('filter' in field) {
              for (const v in self.sfv[field['relationship']]) {
                if (new RegExp(field['filter']).test(v)) {
                  values[v] = self.sfv[field['relationship']][v];
                }
              }
            } else {
              values = self.sfv[field['relationship']];
            }
          } else if ('values' in field) {
            values = field['values'];
          }
          for (const v in values) {
            const option = document.createElement('option');
            option.setAttribute('value', v); 
            option.innerText = values[v];
            select.append(option);
          }
          select.name = f;
          select.value = row;
          div.append(select);
        } else if (field['type'] === 'checkbox') {
          const input = document.createElement('input');
          input.name = f;
          input.setAttribute('type', 'checkbox');
          if (row) {
            input.checked = true;
          }
          div.append(input);
        } else if (field['type'] === 'number') {
          const input = document.createElement('input');
          input.name = f;
          input.setAttribute('type', 'number');
          input.min = field['min'];
          input.max = field['max'];
          input.value = row ? row.toString() : '';
          div.append(input);
        } else {
          const input = document.createElement('input');
          input.name = f;
          input.setAttribute('type', 'text');
          input.value = row ? row.toString() : '';
          div.append(input);
        }

        fieldset.append(div);

        form.insertBefore(fieldset, fieldset_ph);
      }
    }

    fieldset_ph.firstElementChild.lastElementChild.onclick = update;
    form.onsubmit = save;
    form.onreset = reset;

    form.rendered = true;
  }

  function save(event) {
    event.preventDefault();

    console.log('settings()', 'save()');

    var data = {};

    loading(this.elements);

    for (const el of this.elements) {
      if (el.tagName != 'FIELDSET' && el.tagName != 'BUTTON' && ! (el.type && el.type === 'button')) {
        if (el.type === 'checkbox') {
          data[el.name] = el.value === 'on' ? '1' : '0';
        } else {
          data[el.name] = el.value;
        }
      }
    }

    if (Object.keys(data).length) {
      self.storage.setItem('settings', JSON.stringify(data));
      self.rs = JSON.parse(self.storage.settings);
    } else {
      error(null, 'Error handling data.');
    }

    loaded(this.elements);
  }

  function reset(event) {
    event.preventDefault();

    loading(this.elements);

    console.log('settings()', 'reset()');

    self.stora.removeItem('settings');
    self.storage.setItem('settings', JSON.stringify(self.defaults));
    self.storage.setItem('session', new Date().toJSON());
    self.rs = JSON.parse(self.storage.settings);

    self.session();
    self.zap();
    self.livetv();

    loaded(this.elements);
  }

  function update(event) {
    event.preventDefault();

    loading([this]);

    console.log('settings()', 'update()');

    self.update(true);

    loaded([this]);
  }

  function loading(elements) {
    for (const el of elements) {
      if (el != form_ph && el != form_lt) {
        el.setAttribute('data-loading', '');
      }
    }
  }

  function loaded(elements) {
    setTimeout(function() {
      for (const el of elements) {
        if (el != form_ph && el != form_lt) {
          el.removeAttribute('data-loading');
        }
      }

      this.clearTimeout();
    }, 300);
  }

  if (close) {
    return hide();
  }

  if (this.setup.hasAttribute('hidden')) {
    show();
  } else {
    hide();
  }
}

remote.prototype.session = function(callback) {
  const self = this;
  const session = this.request('command', '/web/session');
  const timestamp = new Date(self.storage.session);
  let expired = false;

  if (self.storage.session) {
    const expires = new Date(new Date().getTime() + (60 * 60 * 24 * 1e3));

    expired = timestamp.getTime() > expires.getTime();
  } else {
    self.storage.setItem('session', new Date().toJSON());
  }

  console.log('session()', timestamp.toJSON(), expired);

  function check(xhr) {
    console.log('session()', 'check()', xhr);

    try {
      if (xhr.response === 'OK') {
        self.storage.setItem('connected', 1);
        self.connect(true);

        if (! self.storage.chlist) {
          self.update(false);
        } else if (expired) {
          self.update(true);
        } else {
          self.status();
        }

        if (! self.storage.currentFav) {
          self.storage.setItem('currentFav', self.rs.fav);
        }

        if (! self.tick && self.rs.refresh != '0') {
          self.tick = setInterval(self.session.bind(self), parseInt(self.rs.refresh));
        }

        if (callback && typeof callback === 'function') {
          callback();
        }
      } else {
        if (self.tick) {
          clearInterval(self.tick);
        }

        throw 0;
      }
    } catch (err) {
      console.error('session()', 'check()');

      self.storage.setItem('connected', 0);
      self.connect(false);

      self.error(xhr, err);

      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  }

  session.then(check).catch(this.error);
}

const _remote = new remote();

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
ir.prototype.return = _proxy('return');
ir.prototype.prech = _proxy('prech');

const _ir = window.ir = new ir();


/**
 * Changes XML to JSON
 * @link https://davidwalsh.name/convert-xml-json
 */
function xmlToJson(xml) {
  var obj = {};

  if (xml.nodeType == 1) {
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) {
    obj = xml.nodeValue;
  }

  if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        if (nodeName === '#text') {
          obj = item.nodeValue;
        } else {
          obj[nodeName] = xmlToJson(item);
        }
      } else {
        if (typeof(obj[nodeName].push) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }

  return obj;
}
