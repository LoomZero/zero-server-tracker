const Path = require('path');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');

const JSONFile = require('zero-kit/src/util/JSONFile');
const FileLogger = require('zero-kit/src/util/FileLogger');

const User = require('./User');
const RedmineConnector = require('./connector/RedmineConnector');
const RedmineError = require('./error/RedmineError');
const ZeroError = require('zero-kit/src/error/ZeroError');

module.exports = class App {

  constructor() {
    this._config = null;
    this._logger = null;
    this.log = null;
    this._redmine = null;
    this.debug = false;
    this.current_user = null;
  }

  /** @returns {RedmineConnector} */
  get redmine() {
    if (this._redmine === null) {
      const connection = this.config.get('defaults.redmine.api');
      const config = this.config.get('redmine.api');

      for (const key in config) {
        connection[key] = config[key];
      }
      this._redmine = new RedmineConnector(this, connection);
    }
    return this._redmine;
  }

  async init() {
    this.log = this.channel('app');
    this.log.section('Transmit ' + this.logger.getTimeLog());
  }

  async execute(debug = false) {
    try {
      this.debug = debug;
      await this.doExecute();
    } catch (error) {
      if (error instanceof ZeroError) {
        this.log.error(error.ident, {}, error);
      } else {
        this.log.error(error);
      }
      if (error instanceof RedmineError) {
        const info = error.toRedmineInfo();
        this.createIssue('Tracker unknown error: "' + info.title + '" - [' + this.logger.getTimeLog() + ']', "```js\n" + info.messages.join("\n") + "\n```");
      } else {
        this.createIssue('Tracker unknown error: "' + error.message + '" - [' + this.logger.getTimeLog() + ']', "```js\n" + error.stack + "\n```");
      }
    }
  }

  async doExecute() {
    if (this.config.isEmpty()) {
      this.config.save();
      this.log.info('Create config file.');
      return;
    }

    const ignore = this.config.get('tracking.ignoreWords', []);
    const roundMinutes = this.config.get('tracking.roundMinutes', false);
    const roundMinMinutes = this.config.get('tracking.roundMinMinutes', false);

    await this.eachUser(async (/** @type {User} */user) => {
      this.current_user = user;
      const workspace = await user.getWorkspace();
      user.logger.info('Start user ' + await user.getName());
      const from = this.config.get('tracking.from', '-1 weeks');
      const to = this.config.get('tracking.to', 'now');
      const trackings = (await user.toggl.getTimeEntries(from, to)).filter((v) => {
        if (v.description && ignore.includes(v.description.trim())) return false;
        return v.stop !== undefined && (v.tags === undefined || (!v.tags.includes('t:transmitted') && !v.tags.includes('t:no-transmit')));
      });
      const issuePattern = /#([0-9]+)(.*\s-\s(.*))?.*$/;

      user.logger.info(trackings.length + ' relevant trackings ...');

      const failedTrackings = [];
      for (const tracking of trackings) {
        let description = tracking.description || '';
        const issueMatch = description.match(issuePattern);

        if (issueMatch && (issueMatch[1] !== undefined || issueMatch[3] !== undefined)) {
          issueMatch.groups = {
            issue: issueMatch[1],
            comment: issueMatch[3],
          };
        }

        if (issueMatch && issueMatch.groups && issueMatch.groups.comment) {
          issueMatch.groups.comment = this.stripSaveComment(issueMatch.groups.comment);
        }

        if (!issueMatch || !issueMatch.groups) {
          failedTrackings.push({ tracking, issueMatch });
        } else {
          try {
            const comment = issueMatch.groups.comment ? issueMatch.groups.comment : '[no comment]';
            const issue = await user.redmine.getIssue(issueMatch.groups.issue);
            const info = user.getRedmineInfo();
            const customFields = this.getCustomFields(user, tracking);
            const hours = this.getRoundHours(tracking.duration, roundMinutes, roundMinMinutes);

            user.logger.info('Create tracking {hours} for {id} with comment {comment} ...', {id: issue.id, comment: comment, hours: hours + 'h'});
            if (this.debug) {
              user.logger.info('Debug mode no tracking will be done.');
              console.log('DEBUG:');
              console.log('  ISSUE:', issue.id);
              console.log('  HOURS:', hours);
              console.log('  ACTIVITY:', info.activity);
              console.log('  COMMENT:', comment);
              console.log('  START:', tracking.start),
              console.log('  CUSTOM FIELDS:', JSON.stringify(customFields));
              console.log('  TRACKING:', tracking.id);
            } else {
              await user.redmine.createTimeEntry(issue.id, hours, info.activity, comment, Moment.unix(Strtotime(tracking.start)), customFields);
              await user.toggl.addTag(workspace, tracking.id, ['t:transmitted']);
            }
          } catch (error) {
            if (this.debug) console.log(error);
            if (error instanceof RedmineError) {
              user.logger.error(error.ident + ' - {id}', {id: issueMatch.groups.issue});
              failedTrackings.push({ tracking, error, issueMatch });
            } else {
              this.log.error(error);
              if (!this.debug) {
                await this.createIssue('Tracker unknown error' + (this.current_user ? ' for ' + await this.current_user.getName() : '') + ': "' + error.message + '" - [' + this.logger.getTimeLog() + ']', "```js\n" + error.stack + "\n" + this.stripSaveComment(JSON.stringify(tracking, null, 2)) + "\n```");
              }
            }
          }
        }
      }

      user.logger.info(failedTrackings.length + ' failed trackings ...');

      const errors = [];
      const noMatch = [];
      for (const failed of failedTrackings) {
        const date = Moment(failed.tracking.start).format('DD.MM.YYYY');
        let comment = failed.tracking.description ? failed.tracking.description : '[no comment]';
        comment = this.stripSaveComment(comment);

        if (failed.error) {
          if (failed.error instanceof RedmineError) {
            const info = failed.error.toRedmineInfo();
            errors.push('`[' + date + ']` ' + comment + ' - "' + info.title + '" (' + info.messages.join(', ') + '): `' + failed.issueMatch.groups.issue + '`');
          } else {
            errors.push('`[' + date + ']` ' + comment + ' - "' + failed.error.ident + '" : `' + failed.issueMatch.groups.issue + '`');
          }
        } else {
          noMatch.push('`[' + date + ']` ' + comment);
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
        const issue = await this.createIssue('Tracking für ' + await user.getName() + ' - [' + this.logger.getTimeLog() + ']', description);
        
        for (const failed of failedTrackings) {
          try {
            let comment = failed.tracking.description ? failed.tracking.description : '[no comment]';
            comment = this.stripSaveComment(comment);
            const info = user.getRedmineInfo();
            const customFields = this.getCustomFields(user, failed.tracking);
            const hours = this.getRoundHours(failed.tracking.duration, roundMinutes, roundMinMinutes);

            user.logger.info('Create unmatched tracking {hours} for {id} with comment {comment} ...', {id: issue.id, comment: comment, hours: hours + 'h'});
            if (this.debug) {
              user.logger.info('Debug mode no tracking will be done.');
              console.log('DEBUG:');
              console.log('  ISSUE:', issue.id);
              console.log('  HOURS:', hours);
              console.log('  ACTIVITY:', info.activity);
              console.log('  COMMENT:', comment);
              console.log('  START:', failed.tracking.start),
              console.log('  CUSTOM FIELDS:', JSON.stringify(customFields));
              console.log('  TRACKING:', failed.tracking.id);
              // await user.redmine.createTimeEntry(issue.id, hours, info.activity, comment, Moment.unix(Strtotime(failed.tracking.start)), customFields);
            } else {
              await user.redmine.createTimeEntry(issue.id, hours, info.activity, comment, Moment.unix(Strtotime(failed.tracking.start)), customFields);
              await user.toggl.addTag(workspace, failed.tracking.id, ['t:transmitted']);
            }
          } catch (error) {
            if (this.debug) console.log(error);
            if (error instanceof RedmineError) {
              user.logger.error(error.ident + ' - {id}', { id: issueMatch.groups.issue });
            } else {
              this.log.error(error);
              if (!this.debug) {
                await this.createIssue('Tracker unknown error' + (this.current_user ? ' for ' + await this.current_user.getName() : '') + ': "' + error.message + '" - [' + this.logger.getTimeLog() + ']', "```js\n" + error.stack + "\n" + this.stripSaveComment(JSON.stringify(failed, null, 2)) + "\n```");
              }
            }
          }
        }
      }
      
      user.logger.info('End user ' + await user.getName());
    });
  }

  async createIssue(subject, description) {
    const issue = this.config.get('tracking.trackingIssue', {});

    issue.subject = subject;
    issue.description = description;

    return await this.redmine.createIssue(issue);
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
    try {
      const users = this.config.get('users');
      for (let i = 0; i < users.length; i++) {
        const user = new User(this, i);
        await predicate(user, i);
      } 
    } catch (e) {
      this.log.error(e);
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
      const errorLogger = new FileLogger(Path.join(__dirname, '../../tracker.error.log'));
      this._logger.pipe(errorLogger, ['section', 'error']);
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

  /**
   * @param {string} comment
   */
  stripSaveComment(comment) {
    // filter all chars except of ASCII
    comment = comment.replace(/([^\x00-\xFF\\]*)/g, '');

    return comment.trim();
  }

}