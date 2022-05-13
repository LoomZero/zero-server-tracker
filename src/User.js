const RedmineConnector = require('./connector/RedmineConnector');
const TogglConnector = require('./connector/TogglConnector');

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

  async ensure() {
    const tags = ['t:transmitted', 't:no-transmit', 't:te:billable', 't:te:nonbillable', 't:te:pauschal'];
    const workspace = await this.getWorkspace();
    const items = await this.toggl.getWorkspaceTags(workspace);
    
    for (const item of (items || [])) {
      const index = tags.findIndex((v) => v === item.name);
      if (index !== -1) {
        tags.splice(index, 1);
      }
    }

    for (const tag of tags) {
      this.logger.info('{' + this.id + '}: Create tag "' + tag + '" ... ');
      await this.toggl.createWorkspaceTag(workspace, tag);
    }
  }

  /**
   * @returns {(number|null)}
   */
  async getWorkspace() {
    let workspace = this.getConfig('toggl.workspace');
    if (workspace !== null) return workspace;
    const workspaces = await this.toggl.getWorkspaces();
    return workspaces.shift().id;
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
    const config = this.getConfig('toggl');

    for (const key in config) {
      connection[key] = config[key];
    }
    return connection;
  }

  /** @returns {TogglConnector} */
  get toggl() {
    if (this._toggl === null) {
      this._toggl = new TogglConnector(this.app, this.togglConfig);
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