/**
 * remote-gx-ir/src/js/remote/settings.js
 * 
 * @author Leonardo Laureti
 * @license MIT License
 */

import { remote } from './remote.js';

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

    if (form.locked) {
      return window.alert('please wait\u2026');
    }

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
          input.checked = row === '1' ? true : false;
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
        if ('info' in field) {
          const span = document.createElement('span');
          span.className = 'info';
          span.innerText = field['info'];
          div.append(span);
        }

        fieldset.append(div);

        form.insertBefore(fieldset, fieldset_ph);
      }
    }

    fieldset_ph.firstElementChild.lastElementChild.onclick = update;
    form.onsubmit = save;
    form.onreset = reset;

    form.locked = false;
    form.rendered = true;
  }

  function save(event) {
    event.preventDefault();

    console.log('settings()', 'save()');

    if (form.locked) {
      return window.alert('please wait\u2026');
    }
    if (self.storage.demo) {
      window.alert('DEMO MODE');
      return;
    }

    var data = {};
    var prev_data = Object.assign({}, self.rs);

    loading(this.elements);

    for (const el of this.elements) {
      if (el.tagName != 'FIELDSET' && el.tagName != 'BUTTON' && ! (el.type && el.type === 'button')) {
        if (el.type === 'checkbox') {
          data[el.name] = el.checked ? '1' : '0';
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

    if (parseInt(prev_data.filter_chlist) === parseInt(self.rs.filter_chlist)) {
      loaded(this.elements);
    } else {
      self.update(false, loaded.bind(globalThis, this.elements));
    }
  }

  function reset(event) {
    event.preventDefault();

    console.log('settings()', 'reset()');

    if (form.locked) {
      return window.alert('please wait\u2026');
    }
    if (self.storage.demo) {
      window.alert('DEMO MODE');
      return;
    }

    loading(this.elements);

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

    if (form.locked) {
      return window.alert('please wait\u2026');
    }

    loading([this]);

    console.log('settings()', 'update()');

    self.update(false, loaded.bind(globalThis, [this]));
  }

  function loading(elements) {
    for (const el of elements) {
      if (el != form_ph && el != form_lt) {
        el.setAttribute('data-loading', '');
      }
    }
    form.locked = true;
  }

  function loaded(elements) {
    setTimeout(function() {
      for (const el of elements) {
        if (el != form_ph && el != form_lt) {
          el.removeAttribute('data-loading');
        }
      }
      form.locked = false;

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

export { remote };
