#!/usr/bin/env node

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
