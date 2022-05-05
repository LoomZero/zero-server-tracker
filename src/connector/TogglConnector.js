const TogglClient = require('toggl-api');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');

const BaseConnector = require('./BaseConnector');

module.exports = class TogglConnector extends BaseConnector {

  /**
   * @param {import('../App')} app
   * @param {import('../../types').T_TogglConnection} connection
   */
  constructor(app, connection) {
    super(app, 'toggl');
    this.connection = connection;
    this._api = null;
  }

  /** @returns {TogglClient} */
  get api() {
    if (this._api === null) {
      this._api = new TogglClient({
        apiToken: this.connection.token,
        apiUrl: this.connection.hostname,
      });
    }
    return this._api;
  }

  /**
   * @param {string} from 
   * @param {string} to 
   * @returns {Promise<import('../../types').T_TogglTracking[]>}
   */
  getTimeEntries(from, to) {
    from = Moment.unix(Strtotime(from));
    to = Moment.unix(Strtotime(to));

    return this.promise('getTimeEntries', from.toDate(), to.toDate());
  }

  /**
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  getCurrentTimeEntry() {
    return this.promise('getCurrentTimeEntry');
  }

  /**
   * @returns {Promise<import('../../types').T_TogglWorkspace[]>}
   */
  getWorkspaces() {
    return this.promise('getWorkspaces');
  }

  /**
   * @param {number} workspace 
   * @returns {Promise<import('../../types').T_TogglTag[]>}
   */
  getWorkspaceTags(workspace) {
    return this.promise('getWorkspaceTags', workspace);
  }

  /**
   * @param {number} workspace 
   * @param {string} tag 
   * @returns {Promise<import('../../types').T_TogglTag>}
   */
  createWorkspaceTag(workspace, tag) {
    return this.promise('createTag', tag, workspace);
  }

  /**
   * @param {number} workspace 
   * @returns {Promise<import('../../types').T_TogglProject[]>}
   */
  getProjects(workspace) {
    return this.promise('getWorkspaceProjects', workspace);
  }

  /**
   * @param {number[]} ids 
   * @param {string[]} tags
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  addTag(ids, tags) {
    return this.promise('updateTimeEntriesTags', ids, tags, 'add');
  }

  /**
   * @param {number} id 
   * @param {import('../../types').T_TogglTracking} data 
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  updateTimeEntry(id, data) {
    return this.promise('updateTimeEntry', id, data);
  }

}