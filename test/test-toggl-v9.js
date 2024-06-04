#!/usr/bin/env node

const App = require('../src/App');

(async () => {
  try {
    const app = new App();
    await app.init();
    
    await app.eachUser(async (user) => {
      try {
        const workspace = await user.getWorkspace();
        
        const time_entries = await user.toggl.getTimeEntries('-1 days', 'now');

        console.log(time_entries);
      } catch (e) {
        console.log(e);
      }
    });
  } catch (e) {
    console.log(e);
  }
})();
