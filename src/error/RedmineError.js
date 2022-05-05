const TrackerError = require('./TrackerError');

module.exports = class RedmineError extends TrackerError {

  /**
   * @param {(string|import('../../types').T_RedmineError)} original 
   * @param {string} message 
   * @param {Object} context 
   */
  constructor(original, message, context = {}) {
    super(message, context);
    this.original = original;
  }

}