import { AppRegistry } from 'react-native';
import App from '../App';
let dev = 'ios'; try { dev = localStorage.getItem('mio-dev') || 'ios'; } catch (e) {}
global.__INSET = dev === 'android' ? 26 : 48;
AppRegistry.registerComponent('App', () => App);
AppRegistry.runApplication('App', { rootTag: document.getElementById('root') });
