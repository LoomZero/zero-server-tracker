/**
 * @typedef {Object} T_RedmineConnection
 * @property {string} hostname
 * @property {(string|number)} port
 * @property {string} token
 */

/**
 * @typedef {Object} T_TogglConnection
 * @property {string} hostname
 * @property {string} token
 */

/**
 * @typedef {Object} T_TrackerOptions
 * @property {string} root
 */

/**
 * @typedef {Object} T_TogglTracking
 * @property {number} id
 * @property {string} guid
 * @property {number} wid
 * @property {number} [pid]
 * @property {boolean} billable
 * @property {string} start
 * @property {string} [stop]
 * @property {number} duration
 * @property {string} description
 * @property {string[]} [tags]
 * @property {boolean} duronly
 * @property {string} at
 * @property {number} uid
 */

/**
 * @typedef {Object} T_TogglWorkspace
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} T_TogglTag
 * @property {number} id
 * @property {number} wid
 * @property {string} name
 * @property {string} [at]
 */

/**
 * @typedef {Object} T_TogglProject
 * @property {number} id
 * @property {number} wid
 * @property {string} name
 */

/**
 * @callback C_InputValidate
 * @param {string} answer
 * @returns {(string|null)}
 */

/**
 * @typedef {Object} T_RedmineID
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} T_RedmineStatus
 * @property {number} id
 * @property {string} name
 * @property {boolean} [is_closed]
 */

/**
 * @typedef {Object} T_RedmineProject
 * @property {number} id
 * @property {string} name
 * @property {string} identifier
 * @property {string} description
 * @property {T_RedmineID} [parent]
 * @property {number} status
 * @property {string} created_on
 * @property {string} updated_on
 * @property {T_RedmineProject[]} [children]
 */

/**
 * @typedef {Object} T_RedmineIssue
 * @property {number} id
 * @property {T_RedmineID} project
 * @property {T_RedmineID} status
 * @property {T_RedmineID} [assigned_to]
 * @property {string} subject
 * @property {string} description
 */

/**
 * @typedef {Object} T_RedmineCreateIssue
 * @property {number} project_id
 * @property {string} subject
 * @property {string} description
 * @property {number} [tracker_id]
 * @property {number} [status_id]
 * @property {number} [assigned_to_id]
 * @property {number} [category_id]
 */

/**
 * @typedef {Object} T_RedmineUpdateIssue
 * @property {(T_RedmineID|number|string)} [status] alias for status_id
 * @property {number} [status_id]
 * @property {(T_RedmineID|number|string)} [assigned] alias for assigned_to_id
 * @property {number} [assigned_to_id]
 * @property {string} [subject]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} T_RedminePagingOptions
 * @property {number} [offset]
 * @property {number} [limit]
 */

/**
 * @typedef {Object} T_RedmineMembership
 * @property {number} id
 * @property {T_RedmineID} project
 * @property {T_RedmineID} [user]
 * @property {T_RedmineID} [group]
 * @property {T_RedmineID[]} roles
 */

/**
 * @typedef {Object} T_RedmineError
 * @property {number} ErrorCode
 * @property {string} Message
 * @property {object} [Detail]
 * @property {string[]} [Detail.errors]
 */

/**
 * @typedef {function(URL)} T_URLCallback
 */

/**
 * @typedef {function(import('./src/User'))} T_UserCallback
 */

module.exports = {};