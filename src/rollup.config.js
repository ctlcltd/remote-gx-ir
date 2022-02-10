import { terser } from 'rollup-plugin-terser';
import { default as banner } from './js/_banner.js';

const production = ! process.env.ROLLUP_WATCH;

export default {
  input: './js/script.js',
  output: {
    name: 'remote',
    file: '../dist/script.js',
    format: 'es',
    banner,
    sourcemap: false
  },
  plugins: [production && terser()]
};
