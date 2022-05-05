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
    let workspace = this.app.config.get('users.' + this.id + '.toggl.workspace', null);
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

  /** @returns {RedmineConnector} */
  get redmine() {
    if (this._redmine === null) {
      const connection = this.app.config.get('defaults.redmine.api');
      const config = this.app.config.get('users.' + this.id + '.redmine');

      for (const key in config) {
        connection[key] = config[key];
      }
      this._redmine = new RedmineConnector(this.app, connection);
    }
    return this._redmine;
  }

  /** @returns {TogglConnector} */
  get toggl() {
    if (this._toggl === null) {
      const connection = this.app.config.get('defaults.toggl.api');
      const config = this.app.config.get('users.' + this.id + '.toggl');

      for (const key in config) {
        connection[key] = config[key];
      }
      this._toggl = new TogglConnector(this.app, connection);
    }
    return this._toggl;
  }

  getRedmineInfo() {
    if (this._redmineInfo === null) {
      this._redmineInfo = {
        activity: this.app.config.get('users.' + this.id + '.redmine.activity', this.app.config.get('defaults.redmine.activity', 9)),
      };
    }
    return this._redmineInfo;
  }

}