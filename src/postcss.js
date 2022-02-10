const fs = require('fs');
const postcss = require('postcss');
const postcssrc = require('postcss-load-config');
const banner = require('./css/_banner.cjs');

const postcss_config = './postcss.config.js';
const production = process.env.NODE_ENV === 'production' ? true : false;

function watch(result, plugins, options, posthook) {
  console.log('watch (postcss.js) ...');

  this.files = this.files || [];

  const queue = [
    {
      'type': 'dependency', 'file': postcss_config,
      'type': 'dependency', 'file': options.from
    }, ...result.messages ]
    .map(message => {
      if (this.files.indexOf(message.file) === -1) {
        return message.file;
      }
    }
  ).filter(Boolean);

  queue.forEach(filename => {
    fs.watch(filename, { encoding: 'buffer' }, (eventType, file) => {
      if (eventType != 'change') {
        return;
      }

      build.apply(this, [plugins, options, posthook]);
    });
  });

  this.files = [ ...queue, ...this.files ];
}

function build(plugins, options, posthook) {
  console.log('build (postcss.js) ...');

  fs.readFile(options.from, (err, css) => {
    postcss(plugins)
      .process(banner + css, options)
      .then(result => {
        fs.writeFile(options.to, result.css, () => true);

        if (options.map && result.map) {
          fs.writeFile(options.to.replace('.css', '.map.css'), result.map.toString(), () => true);
        }
        if (posthook && typeof posthook === 'function') {
          posthook.apply(this, [ result, ...arguments ]);
        }
      });
  });
}

postcssrc().then(({ plugins, options }) => {
  console.log('start (postcss.js)');

  build(plugins, options, production || watch);
});
