const RedmineConnector = require('./connector/RedmineConnector');
const TogglV9API = require('./connector/TogglV9API');
const UserSkipError = require('./error/UserSkipError');

module.exports = class User {

  /**
   * @param {import('./App')} app
   * @param {number} id
   */
  constructor(app, id) {
    this.app = app;
    this.id = id;
    this.logger = app.channel('user:' + id);

    this._redmine = null;
    this._toggl = null;

    this._user = null;
    this._redmineInfo = null;
  }

  getConfig(name, fallback = null) {
    return this.app.config.get('users.' + this.id + '.' + name, fallback);
  }

  /**
   * @returns {(number|null)}
   */
  async getWorkspace() {
    try {
      let workspace = this.getConfig('toggl.workspace');
      if (workspace !== null) return workspace;
      const workspaces = await this.toggl.getWorkspaces();
      return workspaces.shift().id;
    } catch (e) {
      const error = new UserSkipError('getWorkspace()');
      await error.build();
      throw error;
    }
  }

  async getUser() {
    if (this._user === null) {
      this._user = await this.redmine.getCurrentUser();
    }
    return this._user;
  }

  async getName() {
    const data = await this.getUser();
    return data.firstname + ' ' + data.lastname;
  }

  get redmineConfig() {
    const connection = this.app.config.get('defaults.redmine.api');
    const config = this.getConfig('redmine');

    for (const key in config) {
      connection[key] = config[key];
    }
    return connection;
  }

  /** @returns {RedmineConnector} */
  get redmine() {
    if (this._redmine === null) {
      this._redmine = new RedmineConnector(this.app, this.redmineConfig);
    }
    return this._redmine;
  }

  get togglConfig() {
    const connection = this.app.config.get('defaults.toggl.api');
    connection.mindate = this.app.config.get('defaults.toggl.mindate');
    const config = this.getConfig('toggl');

    for (const key in config) {
      connection[key] = config[key];
    }
    return connection;
  }

  /** @returns {TogglV9API} */
  get toggl() {
    if (this._toggl === null) {
      this._toggl = new TogglV9API(this.app, this.togglConfig);
    }
    return this._toggl;
  }

  getRedmineInfo() {
    if (this._redmineInfo === null) {
      this._redmineInfo = {
        activity: this.getConfig('redmine.activity', this.app.config.get('defaults.redmine.activity', 9)),
      };
    }
    return this._redmineInfo;
  }

}