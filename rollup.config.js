import pkg from './package.json';
import less from 'rollup-plugin-less';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import serve from 'rollup-plugin-serve'
import typescript from 'rollup-plugin-typescript';
import livereload from 'rollup-plugin-livereload';

const PROD = process.env.BUILD === 'production';

const plugins = [
  nodeResolve(),
  commonjs(),
  typescript({ typescript: require('typescript') }),
  less({output: './docs/style.css', insert: !PROD }),
];
const devPlugins = !PROD ? [
  livereload('docs'),
  serve({
    open: false,
    contentBase: 'docs',
    host: 'localhost',
    port: 1234,
    // Set to true to return index.html instead of 404
    historyApiFallback: false,
  })
] : [];

const rev = require('child_process').execSync('git rev-parse HEAD').toString().trim();
const banner = `/* Bundle version ${pkg.version}, current rev: ${rev} */`
export default [{
  input: './src/index.ts',
  output: {
    file: './docs/bundle.js',
    format: 'iife',
    sourcemap: true,
    name: 'App',
    banner
  },
  plugins: [...plugins, ...devPlugins]
}, {
  input: './src/sw.ts',
  output: {
    file: './docs/sw.js',
    format: 'es',
    name: 'SW',
    banner
  },
  plugins
}];
