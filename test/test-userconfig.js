#!/usr/bin/env node

const Color = require('zero-kit/src/cli/Color');
const App = require('../src/App');

(async () => {
  try {
    const app = new App();
    await app.init();
    
    app.eachUser((/** @type {import('../src/User')} */user) => {
      const redmine = user.getConfig('redmine.token') === null ? Color.out('error', '✗') : Color.out('question', '✓');
      const toggl = user.getConfig('toggl.token') === null ? Color.out('error', '✗') : Color.out('question', '✓');
      
      console.log(user.getConfig('name') + ':', 'redmine', redmine, 'toggl', toggl);
    });
  } catch (e) {
    console.log(e);
  }
})();
