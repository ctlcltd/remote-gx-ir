/*!
 * remote-gx-ir/script.js
 * 
 * @author Leonardo Laureti <https://loltgt.ga>
 * @version 2020-07-25
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
  const defaults = {
    'address': 'http://localhost:8080/service'
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
      this.storage.setItem('settings', JSON.stringify(defaults));
    }

    this.rs = JSON.parse(this.storage.settings);
  } catch (err) {
    this.error(err, 'storage settings');
  }

  this.remote = document.getElementById('remote');
  this.info = document.getElementById('info');
  this.setup = document.getElementById('settings');
  this.display = document.getElementById('display');
  this.sender = document.getElementById('sending');
  this.controls = document.getElementById('controls');
  this.channels = document.getElementById('chlist');

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
  const url = this.rs.address + service + uri;

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

  console.log('routine()', arguments);

  for (const arg of arguments) {
    self.control(arg);
  }
}

remote.prototype.currentChannel = function() {
  const self = this;
  const subservices = this.request('command', '/web/subservices');

  function command(xhr) {
    console.log('currentChannel()', 'command()', xhr);

    const chnum = self.display.querySelector('.chnum');
    const chname = self.display.querySelector('.chname');

    try {
      const obj = self.parser(xhr.response);
      const chlist = JSON.parse(self.storage.chlist);

      chname.innerText = obj.e2servicelist.e2service.e2servicename;

      const chid = obj.e2servicelist.e2service.e2servicereference.substr(6, (obj.e2servicelist.e2service.e2servicereference.length - 13));

      if (chlist[chid]) {
        chnum.innerText = chlist[chid].num;
      } else {
        chnum.innerText = '?';
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

remote.prototype.prech = function() {
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
          new update(refresh);
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
    new update(true);

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

  function update(refresh) {
    console.log('control()', 'update()', refresh);

    if (typeof refresh === 'string') {
      this[refresh]();
    } else if (refresh) {
      this.currentChannel();
      this.currentSignal();
    }
  }

  update.prototype.currentChannel = function() {
    setTimeout(function() {
      self.status('currentChannel');

      this.clearTimeout();
    }, 500);
  }

  update.prototype.currentSignal = function() {
    setTimeout(function() {
      self.status('currentSignal');

      this.clearTimeout();
    }, 2000);
  }

  update.prototype.currentVolume = function() {
    setTimeout(function() {
      self.status('currentVolume');

      this.clearTimeout();
    }, 500);
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

remote.prototype.connect = function(connected) {
  const self = this;
  const button = this.controls.querySelector('.top-connect');

  if (typeof connected === 'undefined') {
    connected = parseInt(this.storage.connected);
  }

  console.log('connect()', connected);

  function disconnect() {
    console.log('connect()', 'disconnect()');

    self.control('F2');
    self.control('exit');
  }

  function reconnect() {
    console.log('connect()', 'reconnect()');

    self.session();
  }

  if (connected === true) {
    button.querySelector('.connect-icon-disconnect').removeAttribute('hidden', '');
    button.querySelector('.connect-label-disconnect').removeAttribute('hidden', '');

    button.querySelector('.connect-icon-reconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-reconnect').setAttribute('hidden', '');
  } else if (connected === false) {
    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');
    button.querySelector('.connect-label-reconnect').removeAttribute('hidden');

    button.querySelector('.connect-icon-reconnect').setAttribute('hidden', '');
    button.querySelector('.connect-label-reconnect').setAttribute('hidden', '');
  }
}

remote.prototype.chlist = function(close) {
  const self = this;

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

  function list() {
    console.log('chlist()', 'list()');

    try {
      if (self.storage.chlist) {
        const chlist = JSON.parse(self.storage.chlist);

        for (const chid in chlist) {
          console.info(chid, chlist[chid]);
        }
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('chlist()', 'list()');

      self.error(null, err);
    }
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

remote.prototype.update = function() {
  const self = this;
  const channels = this.request('chlist');

  console.log('update()');

  function download(xhr) {
    console.log('update()', 'download()', xhr);

    try {
      if (xhr.response != 'error') {
        self.storage.setItem('chlist', xhr.response);

        self.status();
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('update()', 'download()');

      self.error(xhr, err);
    }
  }

  channels.then(download).catch(self.error);
}

remote.prototype.mirror = function() {
  const self = this;
  const mirror = this.request('mirror');

  console.log('mirror()');

  function find(xhr) {
    console.log('mirror()', 'find()', xhr);

    try {
      if (xhr.response != 'error') {
        link(xhr.response);
      } else {
        throw 0;
      }
    } catch (err) {
      console.error('mirror()', 'find()');

      self.error(xhr, err);
    }
  }

  function link(url) {
    console.log('mirror()', 'link()', url);

    window.alert(url);
  }

  // this.routine('playpause', 'ff', 'ff', 'ff', 'play', 'exit');

  setTimeout(function() {
    mirror.then(find).catch(self.error);

    this.clearTimeout();
  }, 3e0);
}

remote.prototype.settings = function(close) {
  const self = this;

  console.log('settings()', close);

  function show() {
    console.log('settings()', 'show()');

    self.setup.removeAttribute('hidden');
    self.setup.classList.add('in');

    setTimeout(function() {
      self.setup.classList.remove('in');
    }, 50);
  }

  function hide() {
    console.log('settings()', 'hide()');

    self.setup.classList.add('out');

    setTimeout(function() {
      self.setup.setAttribute('hidden', '');
      self.setup.classList.remove('out');
    }, 50);
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

  function check(xhr) {
    console.log('session()', 'check()', xhr);

    try {
      if (xhr.response === 'OK') {
        self.storage.setItem('connected', true);
        self.connect(true);

        if (self.storage.chlist) {
          self.status();
        } else {
          self.update();
        }

        if (! self.tick) {
          // self.tick = setInterval(self.status.bind(self), 3e4);
        }
      } else {
        self.storage.setItem('connected', false);
        self.connect(false);

        if (self.tick) {
          clearInterval(self.tick);
        }

        throw 0;
      }
    } catch (err) {
      console.error('session()', 'check()');

      self.error(xhr, err);
    }
  }

  session.then(check).catch(this.error);
}

const ir = window.ir = new remote();
