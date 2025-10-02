#!/usr/bin/env node

const Color = require('zero-kit/src/cli/Color');
const App = require('../src/App');

(async () => {
  try {
    const app = new App();
    await app.init();
    const codes = [];
    const yes = Color.out('question', '✓');
    const no = Color.out('error', '✗');

    let trackingUserCreate = false;
    let trackingUserDelete = false;

    try {
      const trackingIssue = await app.createIssue('Test Issue', 'This is a test issue for the server tracker userconfig test script.');
      trackingUserCreate = trackingIssue && trackingIssue.id;
      if (trackingUserCreate) {
        trackingUserDelete = await app.redmine.deleteIssue(trackingIssue.id);
      }
    } catch (e) {
      console.log(e);
    }
    console.log('Tracking user creation: ' + (trackingUserCreate ? yes : no) + ' ' + (trackingUserDelete ? yes : no));
    
    app.eachUser(async (user) => {
      const redmine = user.getConfig('redmine.token') ? yes : no;
      const toggl = user.getConfig('toggl.token') ? yes : no;

      let redmineConnection = false;
      if (redmine === yes) {
        const duplicate = codes.find((v) => v.key === user.getConfig('redmine.token'));
        if (duplicate) {
          Color.log('error', 'Duplicate key for ' + user.getConfig('name') + ' and ' + duplicate.name + ' - ' + duplicate.key + ' [' + duplicate.type + '] : [redmine]');
        }
        codes.push({
          name: user.getConfig('name'),
          key: user.getConfig('redmine.token'),
          type: 'redmine',
        });
        try {
          await user.redmine.getCurrentUser();
          redmineConnection = true;
        } catch (e) {
          console.log(e);
        }
      }
      redmineConnection = redmineConnection ? yes : no;

      let togglConnection = false;
      if (toggl === yes) {
        const duplicate = codes.find((v) => v.key === user.getConfig('toggl.token'));
        if (duplicate) {
          Color.log('error', 'Duplicate key for ' + user.getConfig('name') + ' and ' + duplicate.name + ' - ' + duplicate.key + ' [' + duplicate.type + '] : [toggl]');
        }
        codes.push({
          name: user.getConfig('name'),
          key: user.getConfig('toggl.token'),
          type: 'toggl',
        });
        try {
          await user.toggl.getTimeEntries('-1 days', 'now');
          togglConnection = true;
        } catch (e) {
          console.log(e);
        }
      }
      togglConnection = togglConnection ? yes : no;
      
      console.log(user.getConfig('name') + ':', 'redmine', redmine, redmineConnection, 'toggl', toggl, togglConnection);
    });
  } catch (e) {
    console.log(e);
  }
})();
