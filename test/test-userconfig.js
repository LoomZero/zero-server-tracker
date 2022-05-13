#!/usr/bin/env node

const App = require('../src/App');
const User = require('../src/User');

(async () => {
  try {
    const app = new App();
    await app.init();
    
    app.eachUser((/** @type {import('../src/User')} */user) => {
      console.log(user.getConfig('name'));
      console.log(user.redmineConfig);
      console.log(user.togglConfig);
    });
  } catch (e) {
    console.log(e);
  }
})();
