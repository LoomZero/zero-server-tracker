const TrackerError = require('./TrackerError');

module.exports = class RedmineError extends TrackerError {

  /**
   * @param {(string|import('../../types').T_RedmineError)} original 
   * @param {string} message 
   * @param {Object} context 
   * @param {import('../User')} user
   */
  constructor(original, message, context = {}) {
    super(message, context);
    this.original = original;
  }

  toRedmineInfo() {
    if (typeof this.original === 'object') {
      const messages = [];
      if (this.original.Detail && this.original.Detail.errors) {
        for (let error of this.original.Detail.errors) {
          if (error === 'Ticket ist nicht gültig') {
            error += ' (Wahrscheinlich hat der User keine Berechtigung für dieses Ticket)';
          }
          messages.push(error);
        }
      }
      return {
        title: this.original.Message + ' [' + this.original.ErrorCode + ']',
        messages: messages,
      };
    } else {
      return {
        title: this.message,
        messages: [JSON.stringify(this.context)],
      };
    }
  }

}