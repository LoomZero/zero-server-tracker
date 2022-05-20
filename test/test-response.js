#!/usr/bin/env node

const Moment = require('moment');
const Strtotime = require('nodestrtotime');

const App = require('../src/App');
const User = require('../src/User');

(async () => {
  try {
    const app = new App();
    await app.init();
    const user = new User(app, process.argv[2] || 0);
    console.log(user.getConfig('name'));
    const issue = await app.createIssue('DEBUG TICKET - ' + user.getConfig('name'), 'Test description');
    const back = await user.redmine.createTimeEntry(issue.id, 1.25, 9, 'hallo', Moment.unix(Strtotime('2022-05-19T05:58:43+00:00')), []);
    console.log(back);
  } catch (e) {
    console.log(e);
  }
})();
