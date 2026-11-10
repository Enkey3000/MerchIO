// Builds ../merchio-mobile-preview.html — the real React Native code running in a browser (react-native-web).
// Usage: npm i -D esbuild react-dom react-native-web && node preview/build.js
const esbuild = require('esbuild'), fs = require('fs'), path = require('path');
const r = esbuild.buildSync({ entryPoints: [path.join(__dirname, 'entry.js')], bundle: true, write: false, minify: true, format: 'iife', platform: 'browser', jsx: 'transform',
  loader: { '.js': 'jsx', '.png': 'dataurl' }, alias: { 'react-native': 'react-native-web', '@react-native-async-storage/async-storage': path.join(__dirname, 'shim.js') },
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false', global: 'window' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
fs.writeFileSync(path.join(__dirname, '..', 'merchio-mobile-preview.html'), fs.readFileSync(path.join(__dirname, 'tmpl.html'), 'utf8').replace('%%BUNDLE%%', () => js));
console.log('Wrote merchio-mobile-preview.html');
