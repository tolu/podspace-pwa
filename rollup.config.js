import less from 'rollup-plugin-less';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import serve from 'rollup-plugin-serve'
import typescript from 'rollup-plugin-typescript';

const plugins = [
  nodeResolve(),
  commonjs(),
  typescript({ typescript: require('typescript') }),
  less({
    output: './dist/style.css'
  }),
  serve({
    open: false,
    contentBase: 'dist',
    host: 'localhost',
    port: 1234,
    // Set to true to return index.html instead of 404
    historyApiFallback: false,
  })
];

export default [{
  input: './src/index.ts',
  output: {
    file: './dist/bundle.js',
    format: 'iife',
    sourcemap: true,
    name: 'App'
  },
  plugins
}, {
  input: './src/sw.ts',
  output: {
    file: './dist/sw.js',
    format: 'es',
    sourcemap: true,
    name: 'SW'
  },
  plugins
}];
