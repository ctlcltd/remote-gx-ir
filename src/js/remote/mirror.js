/**
 * remote-gx-ir/src/js/remote/mirror.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

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

      if (chid && chlist['channels'][chid]) {
        chnum = chlist['channels'][chid].index;
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

export { remote };
