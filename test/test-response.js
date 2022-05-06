#!/usr/bin/env node

const App = require('../src/App');
const User = require('../src/User');

(async () => {
  try {
    const app = new App();
    await app.init();
    const user = new User(app, 0);
    const info = await user.redmine.getCurrentUser();
    console.log(info);
  } catch (e) {
    console.log(e);
  }
})();
