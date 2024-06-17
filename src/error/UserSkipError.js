const Template = require("../helper/Template")

module.exports = class UserSkipError extends Error {

  /**
   * @param {string} cause 
   * @param {Object<string, (string|CallableFunction)>} params 
   */
  constructor(cause, params = {}) {
    super('[USER SKIP] [UNBUILD] Cause: ' + cause);
    this.cause = cause;
    this.params = params;
    this.isBuild = false;
  }

  async build() {
    if (this.isBuild) return;
    
    for (const index in this.params) {
      try {
        if (typeof this.params[index] === 'function') {
          this.params[index] = await this.params[index]();
        }
      } catch (e) {
        this.params[index] = '[ERROR:PARAM:' + index + ':' + e.message + ']';
      }
    }
    this.message = '[USER SKIP] Cause: ' + Template.template(this.cause, this.params);
    this.isBuild = true;
  }

}