const Reflection = require('zero-kit/src/util/Reflection');

module.exports = class BaseConnector {

  /**
   * @param {import('../App')} app 
   * @param {string} id
   */
  constructor(app, id) {
    this.app = app;
    this.id = id;
    this.logger = app.channel('connector:' + id);
  }
 
  async init() { }

  get api() { return null; }

  createError(error) { }

  /**
   * @param {string} func 
   * @param  {...any} args 
   * @returns {Promise<*>}
   */
  promise(func, ...args) {
    this.logger.log('debug', 'call {func} {context}', { func: func, context: JSON.stringify(args) });
    return new Promise((res, rej) => {
      this.api[func](...args, (error, response) => {
        this.logger.log('debug', 'response ' + func + ' {context} response: {response}', {
          context: Reflection.debugContext(args),
          response: typeof response === 'string' ? response : response ? JSON.stringify(response).replace(/\\"/g, '"') : 'null',
        });
        if (typeof error === 'string') {
          const parsed = JSON.parse(error);
          if (parsed) error = this.createError(parsed);
          rej(error);
        } else if (error instanceof Error) {
          rej(error);
        } else if (error) {
          rej(this.createError(error));
        } else {
          res(response);
        }
      });
    });
  }

}