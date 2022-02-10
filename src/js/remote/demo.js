/**
 * remote-gx-ir/src/js/remote/demo.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

remote.prototype.demo = function() {
  console.log('demo()');

  this.storage.setItem('demo', 1);
  this.storage.removeItem('settings');
  this.defaults.refresh = '0';
  this.defaults.dlna = '0';
  this.defaults.ftp = '0';
  this.defaults.stream = '0';
  this.defaults.fav = 'tv:3';

  const currentChannel = '0000:1111:2222:333333';
  const demo = {
    'storage': this.storage,
    'chid': currentChannel,
    'vol': 95,
    'acg': 100,
    'snr': 77,
    'mute': false, 
    'chlist': '{"channels":{"64:3264:13E:820000":"Kabelio 3+","65:3264:13E:820000":"Kabelio 4+","66:3264:13E:820000":"Kabelio 5+","69:3264:13E:820000":"Kabelio 6+","67:3264:13E:820000":"Kabelio TV24","68:3264:13E:820000":"Kabelio TV25","6A:3264:13E:820000":"Kabelio S1","6F:3264:13E:820000":"Kabelio RTL CH","70:3264:13E:820000":"Kabelio RTLZWEI CH","71:3264:13E:820000":"Kabelio VOX CH","D49:1450:13E:820000":"Rai 1 HD","D4A:1450:13E:820000":"Rai 2 HD","D4B:1450:13E:820000":"Rai 3 HD","7B:4B0:110:820000":"Rete4 HD","7A:4B0:110:820000":"Canale5 HD","79:4B0:110:820000":"Italia1 HD","4F:1770:110:820000":"LA7 HD","1C5C:1D4C:FBFF:820000":"TV8 HD","10E3:3E8:13E:820000":"Nove HD","11:2BC:13E:820000":"HotBird 4K1","0000:1111:2222:333333":"Channel DEMO","338C:1388:13E:820000":"Test GC 1","338D:1388:13E:820000":"Test GC 2","338E:1388:13E:820000":"Test GC 3","338F:1388:13E:820000":"Test GC 4","4267:2F44:13E:820000":"Eutelsat data 1","69A:2454:13E:820000":"Eutelsat Data 1","1F4B:319C:13E:820000":"MBS - Test 1","1F61:319C:13E:820000":"MBS - Test 2","1F62:319C:13E:820000":"MBS - Test 3","1F63:319C:13E:820000":"MBS - Test 4","1F64:319C:13E:820000":"MBS - Test 5","1F65:319C:13E:820000":"MBS - Test 6","421E:3DB8:13E:820000":"SCT","524:3D54:13E:820000":"SAT.TV - Hot Bird","32:2E18:B0:820000":"Agadir","2531:13EF:13E:820000":"AL SHARJAH RADIO","2CB:1B58:13E:820000":"Antena1","1413:5DC:13E:820000":"Antyradio","6D8:3138:13E:820000":"Bahai Radio","3347:1388:13E:820000":"BBC Arabic Radio","3348:1388:13E:820000":"BBC English (Europe)","3349:1388:13E:820000":"BBC English Mid_East","3346:1388:13E:820000":"BBC Horn of Africa","36:2E18:B0:820000":"Casablanca","4345:300C:13E:820000":"SRF 1","4358:300C:13E:820000":"SRF 1 AG SO","435A:300C:13E:820000":"SRF 1 BE FR VS","4359:300C:13E:820000":"SRF 1 BS","435E:300C:13E:820000":"SRF 1 GR","435B:300C:13E:820000":"SRF 1 LU","435C:300C:13E:820000":"SRF 1 SG","435D:300C:13E:820000":"SRF 1 ZH SH","4346:300C:13E:820000":"SRF 2 Kultur","4347:300C:13E:820000":"SRF 3"},"tv:0":0,"tv:1":{"name":"Swiss","list":["64:3264:13E:820000","65:3264:13E:820000","66:3264:13E:820000","69:3264:13E:820000","67:3264:13E:820000","68:3264:13E:820000","6A:3264:13E:820000","6F:3264:13E:820000","70:3264:13E:820000","71:3264:13E:820000"]},"tv:2":{"name":"Italy","list":["D49:1450:13E:820000","D4A:1450:13E:820000","D4B:1450:13E:820000","7B:4B0:110:820000","7A:4B0:110:820000","79:4B0:110:820000","4F:1770:110:820000","1C5C:1D4C:FBFF:820000","10E3:3E8:13E:820000","11:2BC:13E:820000"]},"tv:3":{"name":"Tests","list":["0000:1111:2222:333333","338C:1388:13E:820000","338D:1388:13E:820000","338E:1388:13E:820000","338F:1388:13E:820000","4267:2F44:13E:820000","69A:2454:13E:820000","1F4B:319C:13E:820000","1F61:319C:13E:820000","1F62:319C:13E:820000","1F63:319C:13E:820000","1F64:319C:13E:820000","1F65:319C:13E:820000","421E:3DB8:13E:820000","524:3D54:13E:820000"]},"radio:0":0,"radio:1":{"name":"Radio 13E","list":["32:2E18:B0:820000","2531:13EF:13E:820000","2CB:1B58:13E:820000","1413:5DC:13E:820000","6D8:3138:13E:820000","3347:1388:13E:820000","3348:1388:13E:820000","3349:1388:13E:820000","3346:1388:13E:820000","36:2E18:B0:820000"]},"radio:2":{"name":"Swiss","list":["4345:300C:13E:820000","4358:300C:13E:820000","435A:300C:13E:820000","4359:300C:13E:820000","435E:300C:13E:820000","435B:300C:13E:820000","435C:300C:13E:820000","435D:300C:13E:820000","4346:300C:13E:820000","4347:300C:13E:820000"]}}'
  };
  const irats = {
    'channelup': function() { this.acg = 80; todo() },
    'channeldown': function() { this.acg = 80; todo() },
    'volumeup': function() { this.vol != 100 && this.vol++ },
    'volumedown': function() { this.vol != 0 && this.vol-- },
    'mute': function() { this.mute = this.mute ? false : true },
    'menu': screen.bind('MENU'),
    'info': screen.bind('INFO'),
    'tv_radio': todo,
    'teletext': screen.bind('TELETEXT'),
    'epg': screen.bind('EPG')
  };
  const svcs = {
    '/command': {
      '/web/session': function() { return 'OK' },
      '/web/subservices': function() { return '<e2servicelist><e2service><e2servicename>' + JSON.parse(this.storage.chlist)['channels'][this.storage.currentChannel]['channel'] + '</e2servicename><e2servicereference>0:0:0:' + this.storage.currentChannel + ':0:0:0:</e2servicereference></e2service></e2servicelist>' },
      '/web/signal': function() { return '<e2frontendstatus><e2acg>' + this.acg + '%</e2acg><e2snr>' + this.snr + '%</e2snr></e2frontendstatus>' },
      '/web/vol': function() { return '<e2volume><e2current>' + this.vol + '</e2current><e2ismuted>' + (this.mute ? 'True' : 'False') + '</e2ismuted></e2volume>' },
      '/irkey': function() { return 'OK' }
    },
    '/chlist': {
      '/update': function() {
        let chlist = JSON.parse(this.chlist);
        let idx = {'channels': 1, 'tv:0': 1, 'radio:0': 1};
        chlist['tv:0'] = {'name': 0, 'list': {}};
        chlist['radio:0'] = {'name': 0, 'list': {}};

        for (const bouquet in chlist) {
          if (bouquet == 'channels') {
            continue;
          }
          let bgroup = bouquet.split(':')[0] + ':0';
          let list = {};

          for (const i in chlist[bouquet].list) {
            const chid = chlist[bouquet].list[i];
            chlist.channels[chid] = {'index': idx.channels++, 'channel': chlist.channels[chid]};
            list[chid] = parseInt(i) + 1;
            chlist[bgroup].list[chid] = idx[bgroup]++;
          }
          chlist[bouquet].list = list;
        }

        return JSON.stringify(chlist);
      }
    }
  };

  this.storage.setItem('currentChannel', currentChannel);

  function request(service, uri) {
    service = '/' + service.toString();
    uri = uri.split('?');

    const action = uri[1] && uri[1].split('=')[1] || false;
    const xhr = {};

    uri = uri[0];

    return new Promise(function(resolve, reject) {
      if (svcs[service] && svcs[service][uri] && typeof svcs[service][uri] === 'function') {
        if (action && irats[action] && typeof irats[action] === 'function') {
          irats[action].apply(demo);
        }
        xhr.response = svcs[service][uri].apply(demo);
        console.info('demo()', 'request()', 'resolve', service, uri);
        resolve(xhr);
      } else {
        console.info('demo()', 'request()', 'reject', service, uri);
        window.alert('Not available in DEMO MODE');
        reject(xhr);
      }
    });
  }
  function screen() {
    const msg = 'Now you TV is showing ' + this.toString();
    window.alert(msg);
  }
  function todo() {
    window.alert('DEMO TODO');
  }

  remote.prototype.request = request;
}

export { remote };
