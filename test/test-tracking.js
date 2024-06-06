#!/usr/bin/env node

const App = require('../src/App');
const User = require('../src/User');

(async () => {
  try {
    const app = new App();
    await app.init();

    const users = app.config.get('users');
    const user = new User(app, users.findIndex(v => v.name === 'Isaac Trogdon'));
    const roundMinutes = app.config.get('tracking.roundMinutes', false);
    const roundMinMinutes = app.config.get('tracking.roundMinMinutes', false);
    
    const entires = await user.toggl.getTimeEntries('-3 days', 'now');
    entires.forEach(t => {
      const hours = app.getRoundHours(t.duration, roundMinutes, roundMinMinutes);
      console.log(t.description, ':::', hours);
    });
  } catch (e) {
    console.log(e);
  }
})();
