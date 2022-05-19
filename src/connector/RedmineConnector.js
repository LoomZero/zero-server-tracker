const Redmine = require('node-redmine');

const BaseConnector = require('./BaseConnector');
const RedmineError = require('../error/RedmineError');

module.exports = class RedmineConnector extends BaseConnector {

  /**
   * @param {import('../App')} app
   * @param {import('../../types').T_RedmineConnection} connection
   */
  constructor(app, connection) {
    super(app, 'redmine');
    this.connection = connection;
    this._api = null;
    this._cache = {};
  }

  /** @returns {Redmine} */
  get api() {
    if (this._api === null) {
      this._api = new Redmine(this.connection.hostname, { apiKey: this.connection.token }, this.connection.port);
    }
    return this._api;
  }

  /**
   * @param {string} error 
   * @returns {import('../../types').T_RedmineError}
   */
  getError(error) { 
    if (typeof error === 'string') {
      return JSON.parse(error);
    }
    return error;
  }

  /**
   * @param {string} items 
   * @param {string} func 
   * @param  {...any} args 
   * @returns {*}
   */
  async promiseAll(items, func, ...args) {
    const cid = items + '::' + func;
    if (this._cache[cid] !== undefined) return this._cache[cid];
    /** @type {import('../types').T_RedminePagingOptions} */
    const options = args[args.length - 1];
    this._cache[cid] = [];
    let response = null;
    do {
      options.offset = this._cache[cid].length;
      response = await this.promise(func, ...args);
      this._cache[cid] = this._cache[cid].concat(response[items]);
    } while (this._cache[cid].length < response.total_count);
    return this._cache[cid];
  }

  /**
   * @param {number} id 
   * @returns {Promise<import('../../types').T_RedmineIssue>}
   */
  getIssue(id) {
    if (typeof id === 'string') id = Number.parseInt(id);
    return this.promise('get_issue_by_id', id, {}).then(issue => issue.issue).catch(err => {
      const error = this.getError(err);
      switch (error.ErrorCode) {
        case 404: 
          throw new RedmineError(error, 'Issue not found.', {id});
        default:
          throw new RedmineError(error, 'Unknown Error: ' + error.Message, {id});
      }
    });
  }

  /**
   * @returns {Promise<import('../../types').T_RedmineStatus[]>}
   */
  listStatus() {
    return this.promise('issue_statuses').then(data => data.issue_statuses);
  }

  /**
   * @param {number} id 
   * @param {import('../../types').T_RedmineUpdateIssue} issue
   */
  async updateIssue(id, issue) {
    if (!issue.status_id && issue.status) {
      if (typeof issue.status === 'number') {
        issue.status_id = issue.status;
      } else if (typeof issue.status === 'string') {
        issue.status_id = (await this.listStatus()).find(v => v.name === issue.status).id;
      } else {
        issue.status_id = issue.status.id;
      }
    }
    if (!issue.assigned_to_id && issue.assigned) {
      if (typeof issue.assigned === 'number') {
        issue.assigned_to_id = issue.assigned;
      } else if (typeof issue.assigned === 'string') {
        const loadIssue = await this.getIssue(id);
        issue.assigned_to_id = (await this.getMemberships(loadIssue.project.id)).find(v => v.user.name === issue.assigned).user.id;
      } else {
        issue.assigned_to_id = issue.assigned.id;
      }
    }

    if (issue.assigned) delete issue.assigned;
    if (issue.status) delete issue.status;
    return await this.promise('update_issue', id, { issue });
  }

  /**
   * @param {number} issue 
   * @param {number} hours 
   * @param {number} activity
   * @param {string} comment 
   * @param {import('moment').Moment} when
   * @param {array} customFields 
   * @returns {Promise}
   */
  createTimeEntry(issue, hours, activity, comment = '', when = null, customFields = null) {
    if (typeof issue === 'string') {
      issue = Number.parseInt(issue);
    }
    if (typeof activity === 'string') {
      activity = Number.parseInt(activity);
    }
    const time_entry = {
      issue_id: issue,
      hours: hours,
      activity_id: activity,
      comments: comment,
      spent_on: (when ? when.format('YYYY-MM-DD') : null),
    };

    if (customFields && customFields.length) {
      time_entry.custom_fields = customFields;
    }

    return this.promise('create_time_entry', { time_entry });
  }

  /**
   * @returns {Promise<import('../../types').T_RedmineProject[]>}
   */
  listProjects() {
    return this.promiseAll('projects', 'projects', {});
  }

  /**
   * 
   */
  async getProjectTree() {
    if (this._cache['projects::tree'] !== undefined) return this._cache['projects::tree'];
    this._cache['projects::tree'] = [];
    const treed = {};
    const projects = await this.listProjects();
    const treeBuilder = (project) => {
      if (treed[project.id] !== undefined) return;
      if (project.parent) {
        if (!treed[project.parent.id]) {
          treeBuilder(projects.find(v => v.id === project.parent.id));
        }
        treed[project.parent.id].children = treed[project.parent.id].children || [];
        treed[project.parent.id].children.push(project);
      } else {
        this._cache['projects::tree'].push(project);
      }
      treed[project.id] = project;
    };

    for (const project of projects) {
      treeBuilder(project);
    }

    return this._cache['projects::tree'];
  }

  /**
   * @param {(number|string)} projectid 
   * @param {Promise<import('../../types').T_RedminePagingOptions} param 
   * @returns {Promise<import('../../types').T_RedmineMembership[]>}
   */
  getMemberships(projectid, param = {}) {
    return this.promiseAll('memberships', 'membership_by_project_id', projectid, param);
  }

  getCurrentUser() {
    return this.promise('current_user', {}).then(data => data.user);
  }

  /**
   * @param {import('../../types').T_RedmineCreateIssue} issue
   * @returns {Promise<import('../../types').T_RedmineIssue>}
   */
  createIssue(issue) {
    return this.promise('create_issue', { issue }).then(data => data.issue);
  }

}