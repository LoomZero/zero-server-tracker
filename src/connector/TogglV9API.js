const Template = require("../helper/Template");
const Moment = require('moment');
const Strtotime = require('nodestrtotime');

module.exports = class TogglV9API {

  constructor(app, config) {
    this.app = app;
    this.config = config;
  }

  getAuth() {
    return 'Basic ' + Buffer.from(this.config.token + ':api_token').toString('base64');
  }

  /**
   * @param {(string|URL)} url 
   * @param {RequestInit} fetchOptions 
   */
  fetch(url, fetchOptions = {}) {
    fetchOptions.method ??= 'GET';
    fetchOptions.headers ??= {
      'Content-Type': 'application/json',
      'Authorization': this.getAuth(),
    };
    if (fetchOptions.body && typeof fetchOptions.body !== 'string') {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    return fetch(url, fetchOptions);
  }

  /**
   * @param {string} path 
   * @param {Object<string, string>} params 
   * @param {import('../../types').T_URLCallback} callback 
   * @returns {URL}
   */
  url(path, params = {}, callback = null) {
    params.config = this.config;
    const url = new URL(Template.template(path, params));
    if (typeof callback === 'function') callback(url);
    return url;
  }

  /**
   * @param {string} from 
   * @param {string} to 
   * @returns {Promise<import('../../types').T_TogglTracking[]>}
   */
  async getTimeEntries(from, to) {
    from = Strtotime(from);
    if (from < this.config.mindate) {
      from = this.config.mindate;
    }
    from = Moment.unix(from);
    to = Moment.unix(Strtotime(to));

    const res = await this.fetch(this.url('${config.hostname}/api/v9/me/time_entries', {}, (url) => {
      url.searchParams.append('start_date', from.toISOString());
      url.searchParams.append('end_date', to.toISOString());
    }));
    if (res.status !== 200) {
      throw new Error(`TogglError ${res.status}: ${await res.json()}`);
    }
    return await res.json();
  }

  /**
   * @returns {Promise<import('../../types').T_TogglWorkspace[]>}
   */
  async getWorkspaces() {
    const res = await this.fetch(this.url('${config.hostname}/api/v9/workspaces'));
    if (res.status !== 200) {
      throw new Error(`TogglError ${res.status}: ${await res.json()}`);
    }
    return await res.json();
  }

  /**
   * @param {number} workspace_id 
   * @returns {Promise<import('../../types').T_TogglTag[]>}
   */
  async getWorkspaceTags(workspace_id) {
    const res = await this.fetch(this.url('${config.hostname}/api/v9/workspaces/${workspace_id}/tags', { workspace_id }));
    if (res.status !== 200) {
      throw new Error(`TogglError ${res.status}: ${await res.json()}`);
    }
    return await res.json();
  }

  /**
   * @param {number} workspace_id 
   * @param {string} tag 
   * @returns {Promise<import('../../types').T_TogglTag>}
   */
  async createWorkspaceTag(workspace_id, tag) {
    const res = await this.fetch(this.url('${config.hostname}/api/v9/workspaces/${workspace_id}/tags', { workspace_id }), {
      method: 'POST',
      body: JSON.stringify({
        name: tag,
      }),
    });
    if (res.status !== 200) {
      throw new Error(`TogglError ${res.status}: ${await res.json()}`);
    }
    return await res.json();
  }

  /**
   * @param {number} workspace_id
   * @param {number} time_entry_ids 
   * @param {string[]} tags 
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  async addTag(workspace_id, time_entry_id, tags) {
    const res = await this.fetch(this.url('${config.hostname}/api/v9/workspaces/${workspace_id}/time_entries/${time_entry_id}', { workspace_id, time_entry_id }), {
      method: 'PUT',
      body: {
        tag_action: 'add',
        tags,
      },
    });
    if (res.status !== 200) {
      throw new Error(`TogglError ${res.status}: ${await res.json()}`);
    }
    return await res.json();
  }

};