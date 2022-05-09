#!/usr/bin/env node

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const App = require('../src/App');

(async () => {
  try {
    const app = new App();
    await app.init();
    await app.execute();
  } catch (e) {
    console.log(e);
  }
})();
