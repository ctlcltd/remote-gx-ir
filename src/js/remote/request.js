/**
 * remote-gx-ir/src/js/remote/request.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

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


function status(refresh) {
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

export { remote };
