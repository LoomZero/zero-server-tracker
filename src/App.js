const Path = require('path');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');

const JSONFile = require('zero-kit/src/util/JSONFile');
const FileLogger = require('zero-kit/src/util/FileLogger');

const User = require('./User');
const RedmineError = require('./error/RedmineError');

module.exports = class App {

  constructor() {
    this._config = null;
    this._logger = null;
    this.log = null;
    this._redmine = null;
  }

  /** @returns {RedmineConnector} */
  get redmine() {
    if (this._redmine === null) {
      const connection = this.app.config.get('defaults.redmine.api');
      const config = this.app.config.get('redmine.api');

      for (const key in config) {
        connection[key] = config[key];
      }
      this._redmine = new RedmineConnector(this.app, connection);
    }
    return this._redmine;
  }

  async init() {
    this.log = this.channel('app');
    this.log.section('Transmit ' + this.logger.getTimeLog());
  }

  async execute() {
    if (this.config.isEmpty()) {
      this.config.save();
      this.log.info('Create config file.');
      return;
    }

    const ignore = this.config.get('tracking.ignoreWords', []);
    const roundMinutes = this.config.get('tracking.roundMinutes', false);
    const roundMinMinutes = this.config.get('tracking.roundMinMinutes', false);

    await this.eachUser(async (/** @type {User} */user) => {
      user.logger.info('Start user ' + await user.getName());
      await user.ensure();
      const trackings = (await user.toggl.getTimeEntries('-1 weeks', 'now')).filter((v) => {
        if (v.description && ignore.includes(v.description.trim())) return false;
        return v.stop !== undefined && (v.tags === undefined || (!v.tags.includes('t:transmitted') && !v.tags.includes('t:no-transmit')));
      });
      const issuePattern = /#(?<issue>[0-9]+)(.*\s-\s(?<comment>.*))?.*$/;

      user.logger.info(trackings.length + ' relevant trackings ...');

      const failedTrackings = [];
      for (const tracking of trackings) {
        let description = tracking.description || '';
        const issueMatch = description.match(issuePattern);

        if (!issueMatch || !issueMatch.groups) {
          failedTrackings.push({ tracking, issueMatch });
        } else {
          try {
            const issue = await user.redmine.getIssue(issueMatch.groups.issue);
            const info = user.getRedmineInfo();
            const customFields = this.getCustomFields(user, tracking);
            const hours = this.getRoundHours(tracking.duration, roundMinutes, roundMinMinutes);

            user.logger.info('Create tracking {hours} for {id} with comment {comment} ...', {id: issue.id, comment: issueMatch.groups.comment, hours: hours + 'h'});
            await user.redmine.createTimeEntry(issue.id, hours, info.activity, issueMatch.groups.comment, Moment.unix(Strtotime(tracking.start)), customFields);
            await user.toggl.addTag([tracking.id], ['t:transmitted']);
          } catch (error) {
            console.log(error);
            if (error instanceof RedmineError) {
              user.logger.error(error.ident + ' - {id}', {id: issueMatch.groups.issue});
              failedTrackings.push({ tracking, error, issueMatch });
            }
          }
        }
      }

      user.logger.info(failedTrackings.length + ' failed trackings ...');

      const errors = [];
      const noMatch = [];
      for (const failed of failedTrackings) {
        const date = Moment(failed.tracking.start).format('DD.MM.YYYY');
        if (failed.error) {
          errors.push('[' + date + '] ' + failed.tracking.description + ' - "' + failed.error.ident + '" : `' + failed.issueMatch.groups.issue + '`');
        } else {
          noMatch.push('[' + date + '] ' + failed.tracking.description);
        }
      }
      
      let description = '';
    
      if (errors.length) {
        description += "## Errors\n\n";
        description += "- " + errors.join("\n- ");
      }
      if (errors.length && noMatch.length) {
        description += "\n\n";
      }
      if (noMatch.length) {
        description += "## No Match\n\n";
        description += "- " + noMatch.join("\n- ");
      }

      if (errors.length || noMatch.length) {
        const issue = this.config.get('tracking.trackingIssue', {});

        issue.subject = 'Tracking für ' + await user.getName();
        issue.description = description;

        await this.redmine.createIssue(issue);
      }
      user.logger.info('End user ' + await user.getName());
    });
  }

  /**
   * @param {number} duration 
   * @param {(number|bool)} roundMinutes 
   * @param {(number|bool)} roundMinMinutes 
   * @returns {number} hours
   */
  getRoundHours(duration, roundMinutes = false, roundMinMinutes = false) {
    const hours = duration / 3600;
    if (roundMinutes === false || roundMinMinutes !== false && hours < roundMinMinutes / 60) return hours;
    
    const round = roundMinutes / 60;
    const rounded = hours / round;

    if (rounded === Number.parseInt(rounded + '')) {
      return rounded * round;
    } else {
      return (Number.parseInt(rounded + '') + 1) * round;
    }
  }

  /**
   * @param {User} user
   * @param {import('../../types').T_TogglTracking} tracking 
   * @returns {array}
   */
  getCustomFields(user, tracking) {
    if (tracking.tags === undefined) return [];
    user.logger.debug('Get customfields from tracking {context}', {}, {id: tracking.id, tags: tracking.tags.join(', ')});
    const customFields = [];
    const id = 3;
    const name = 'Abrechnung';
    const cfs = [
      { tag: 't:te:billable', value: 1, name: 'Billable' },
      { tag: 't:te:nonbillable', value: 2, name: 'Non-Billable' },
      { tag: 't:te:pauschal', value: 3, name: 'Pauschal' },
    ];
    
    for (const cf of cfs) {
      if (tracking.tags.includes(cf.tag)) {
        customFields.push({
          id, 
          name, 
          value: cf.value,
        });
      }
    }
    return customFields;
  }

  async eachUser(predicate) {
    const users = this.config.get('users');
    for (let i = 0; i < users.length; i++) {
      const user = new User(this, i);
      await predicate(user, i);
    }
  }

  async exit() {
    this.logger.close();
  }

  /** @returns {JSONFile} */
  get config() {
    if (this._config === null) {
      this._config = new JSONFile(Path.join(__dirname, '../../tracker.config.json'));
    }
    return this._config;
  }

  /** @returns {FileLogger} */
  get logger() {
    if (this._logger === null) {
      this._logger = new FileLogger(Path.join(__dirname, '../../tracker.log'));
    }
    return this._logger;
  }

  /**
   * @param {string} channel 
   * @returns {import('zero-kit/src/util/LoggerChannel')}
   */
  channel(channel) {
    return this.logger.channel(channel);
  }

}