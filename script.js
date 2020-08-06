/*!
 * remote-gx-ir/script.js
 * 
 * @author Leonardo Laureti <https://loltgt.ga>
 * @version 2020-08-06
 * @license MIT License
 */

/**
 * Changes XML to JSON
 * @link https://davidwalsh.name/convert-xml-json
 */
function xmlToJson(xml) {
  
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
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
};

function remote() {
  this.defaults = {
    'address': window.location.origin + '/service',
    'refresh': '100000',
    'disconnect_routine': 'green,exit',
    'fav': 'tv:1',
    'dlna': '1',
    'f1': '',
    'f2': '',
    'f3': '',
    'f4': ''
  };

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

      if (self.rs.dlna) {
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

    self.session();
  }

  if (connected) {
    this.cnt.classList.remove('no-session');

    button.querySelector('.connect-icon-disconnect').removeAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').removeAttribute('hidden', '');

    button.querySelector('.connect-icon-reconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-reconnect').setAttribute('hidden', '');

    if (pressed) {
      disconnect();
    }
  } else {
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

        if (idx.indexOf('tv') != -1) {
          select.insertBefore(optgroup, select.lastElementChild);
        } else {
          select.append(optgroup);
        }
      }

      const option = document.createElement('option');
      option.value = idx;
      option.innerText = data[idx]['name'];

      optgroup.append(option);

      last_group = current_group;
    }

    select.onchange = listChange;

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
    var livetv;

    if (self.rs.dlna) {
      livetv = JSON.parse(self.storage.livetv);
    }

    for (const chid in data[current]['list']) {
      const tr = tr_tpl.cloneNode(true);

      tr.firstElementChild.innerText = data[current]['list'][chid].num;
      tr.firstElementChild.nextElementSibling.innerText = data[current]['list'][chid].name;
      tr.lastElementChild.innerText = '';

      if (livetv) {
        let dnum;

        if (data['lamedb']['list'][chid]) {
          dnum = data['lamedb']['list'][chid].num;
        }
        if (dnum && livetv['channels'][dnum]) {
          tr.lastElementChild.innerText = livetv['channels'][dnum]['cas'] ? '$' : '';
        }
      }

      tr.dataset.chnum = data[current]['list'][chid].num;
      tr.onclick = channelChange;
      tr.removeAttribute('hidden');

      tbody.append(tr);

      i++;
    }

    table.rendered = true;
  }

  function channelChange(event) {
    event.preventDefault();

    console.info('chlist()', 'channelChange()', this.dataset.chnum);

    let cmds = this.dataset.chnum.split('').map(function(num) { return 'num_' + num; });

    self.routine.apply(self, cmds);

    setTimeout(function() {
      hide();

      this.clearTimeout();
    }, 100);
  }

  function listChange(event) {
    event.preventDefault();

    console.info('chlist()', 'listChange()', this.value);

    self.storage.setItem('currentFav', this.value);

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

    form.lastElementChild.firstElementChild.onclick = copy;
    form.lastElementChild.lastElementChild.onclick = stop;

    form.rendered = true;
  }

  function clear() {
    console.log('mirror()', 'clear()');

    form.querySelector('#ftp').setAttribute('hidden', '');
    form.querySelector('#upnp').setAttribute('hidden', '');
    form.querySelector('#stream').setAttribute('hidden', '');

    form.reset();

    form.querySelector('#streamurl').onclick = null;
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
    if ('upnpurl' in data) {
      form.querySelector('#upnp').removeAttribute('hidden');
      form.querySelector('#upnpurl').value = data.ftpurl;
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

    self.routine('playpause');

    setTimeout(function() {
      self.control('stop');

      this.clearTimeout();
    }, 100);

    setTimeout(function() {
      const mirror = self.request('mirror');

      mirror.then(stream).catch(self.error);

      this.clearTimeout();
    }, 3e2);
  }

  function stop(event) {
    event.preventDefault();

    console.log('mirror()', 'stop()');

    self.routine('stop', 'channelup', 'channeldown');

    setTimeout(function() {
      self.status('currentChannel');

      this.clearTimeout();
    }, 500);

    setTimeout(function() {
      self.status('currentSignal');

      this.clearTimeout();
    }, 3000);

    const mirror = self.request('mirror', '/close');

    mirror.then(clear).catch(self.error);

    this.blur();
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


}

remote.prototype.settings = function(close) {
  const self = this;
  const form = this.setup.querySelector('form');

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

    const fieldset = document.createElement('fieldset');
    const fieldset_ph = form.firstElementChild;

    for (const field in data) {
      const row = data[field];

      const div = document.createElement('div');
      const label = document.createElement('label');
      const input = document.createElement('input');

      label.innerText = field;
      input.setAttribute('type', 'text');
      input.value = row ? row.toString() : '';

      div.append(label);
      div.append(input);

      fieldset.append(div);

      form.insertBefore(fieldset, fieldset_ph);
    }

    form.rendered = true;
  }

  function save() {
    console.log('settings()', 'save()');

    // var data = {};

    // self.rs = data;
  }

  function reset() {
    console.log('settings()', 'reset()');


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

remote.prototype.session = function() {
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
          self.tick = setInterval(self.status.bind(self), parseInt(self.rs.refresh));
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
    }
  }

  session.then(check).catch(this.error);
}

const _remote = new remote();

function _proxy(callee) {
  return function(event) {
    const currentTarget = event.currentTarget;

    event.preventDefault();

    _remote[callee].apply(_remote, Object.values(arguments).slice(1));

    setTimeout(function() {
      currentTarget.blur();

      this.clearTimeout();
    }, 150);

    return false;
  }
}

function ir() {}
ir.prototype.connect = _proxy('connect');
ir.prototype.update = _proxy('update');
ir.prototype.chlist = _proxy('chlist');
ir.prototype.mirror = _proxy('mirror');
ir.prototype.fav = _proxy('fav');
ir.prototype.tv_radio = _proxy('tv_radio');
ir.prototype.zap = _proxy('zap');
ir.prototype.settings = _proxy('settings');
ir.prototype.control = _proxy('control');
ir.prototype.return = _proxy('return');
ir.prototype.prech = _proxy('prech');

const _ir = window.ir = new ir();
