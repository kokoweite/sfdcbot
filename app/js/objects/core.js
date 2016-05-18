/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file core.js
 * 2015-10-21T7:28:00
 */

'use strict'

var proc = require('child_process')
var jsforce = require('jsforce')
var events = require('events')
var temp = require('temp')
var fs = require('fs')
var EVENT = {
  ADD_COUNTRIES: 'onAddCountries',
  ADD_STATES: 'onAddStates',
  EDIT_COUNTRIES: 'onEditCountries',
  EDIT_STATES: 'onEditStates'
}
var ACTION = {
  ADD: 'add',
  EDIT: 'edit'
}
var TYPE_NODE = {
  COUNTRY: 'country',
  STATE: 'state'
}

var PATH_LAUNCHBOT_SCRIPT = __dirname + '/../scripts/launchBot.js'

/**
 * Default constructor
 * Instanciate a core that will manage all processes,
 * store data about states and countries.
 * @constructor  Core
 * @param   {string} debugFolderPath  - Path created in the main process, at initialization where the log will be write
 */
function Core (debugFolderPath, logger) {
  /**
   * Logger
   */
  this.logger = logger
  /**
   * Array that contains arrays of countries to add
   * @private
   */
  this._addCountriesPool = []
    /**
     * Array that contains arrays of countries to edit
     * @private
     */
  this._editCountriesPool = []
    /**
     * Array that contains arrays of states to add
     * @private
     */
  this._addStatesPool = []
    /**
     * Array that contains arrays of states to edit
     * @private
     */
  this._editStatesPool = []
    /**
     * Nodes proccessed
     * @private
     */
  this._nodesProccessed = {}
    /**
     * Array that contains all countries to add
     * @private
     */
  this._addCountries = []
    /**
     * Array that contains all states to add
     * @private
     */
  this._addStates = []
    /**
     * Array that contains all countries to edit
     * @private
     */
  this._editCountries = []
    /**
     * Array that contains all states to edit
     * @private
     */
  this._editStates = []
    /**
     * Event emitter object
     * @private
     */
  this._eventEmitter = new events.EventEmitter()
    /**
     * Array that contains nodes (states and countries)
     * @private
     */
  this._dataTree = []
    /**
     * Array that contains node to disable
     * @private
     */
  this._disableNodes = []
    /**
     * Array that contains nodes to expand
     * @private
     */
  this._expandNodes = []
    /**
     * Map key = pid, value = process
     * @private
     */
  this._processes = {}

  this._debugFolderPath = debugFolderPath
}

Core.prototype = {
  /**
   * Getter for array variable _nodesProccessed
   * @method  nodesProccessed
   * @return  hashmap of processed nodes
   */
  get nodesProccessed () {
    return this._nodesProccessed
  },
  /**
   * Getter for array variable _disableNodes
   * @method  disableNodes
   * @return  array of disbaled nodes
   */
  get disableNodes () {
    return this._disableNodes
  },
  /**
   * Getter for array variable _expandNodes
   * @method  expandNodes
   * @return  array of expanded nodes
   */
  get expandNodes () {
    return this._expandNodes
  },
  /**
   * Getter for array variable _dataTree
   * @method  dataTree
   * @return  array of tree nodes (i.e state and countries)
   */
  get dataTree () {
    return this._dataTree
  },
  /**
   * Getter for array variable _addCountriesPool
   * @method  addCountriesPool
   * @return  array of arrays that contains countries to add
   */
  get addCountriesPool () {
    return this._addCountriesPool
  },
  /**
   * Getter for array variable _editCountriesPool
   * @method  editCountriesPool
   * @return  array of arrays that contains countries to edit
   */
  get editCountriesPool () {
    return this._editCountriesPool
  },
  /**
   * Getter for array variable _addStatesPool
   * @method  addStatesPool
   * @return  array of arrays thtat contains states to add
   */
  get addStatesPool () {
    return this._addStatesPool
  },
  /**
   * Getter for array variable _editStatesPool
   * @method  editStatesPool
   * @return  array of arrays that contains states to edit
   */
  get editStatesPool () {
    return this._editStatesPool
  },
  /**
   * Getter for array variable _addCountries
   * @method  addCountries
   * @return  array that contains countries to add
   */
  get addCountries () {
    return this._addCountries
  },
  /**
   * Getter for array variable _addStates
   * @method  addStates
   * @return  array that contains states to add
   */
  get addStates () {
    return this._addStates
  },
  /**
   * Getter for array variable _editCountries
   * @method  editCountries
   * @return  array that contains countries to edit
   */
  get editCountries () {
    return this._editCountries
  },
  /**
   * Getter for array variable _editStates
   * @method  editStates
   * @return  array that contains states to edit
   */
  get editStates () {
    return this._editStates
  },
  /**
   * Getter for array variable _processes
   * @method  processes
   * @return  map key = pid, value = process
   */
  get processes () {
    return this._processes
  }
}

/**
 * Reset all arrays
 * @method _resetAll
 */
Core.prototype.resetAll = function () {
  this.logger.info('core.js  ###  resetAll')
  this.resetAdd()
  this.resetEdit()
}

/**
 * Reset arrays that contains add nodes
 * @method  resetAdd
 */
Core.prototype.resetAdd = function () {
  this.logger.info('core.js  ###  resetAdd')
  this.resetAddPool()
  this._addCountries = []
  this._addStates = []
}

/**
 * Reset arrays that contains edit nodes
 * @method  resetEdit
 */
Core.prototype.resetEdit = function () {
  this.logger.info('core.js  ###  resetEdit')
  this.resetEditPool()
  this._editCountries = []
  this._editStates = []
}

/**
 * Reinitialize add pools
 * @method resetAddPool
 */
Core.prototype.resetAddPool = function () {
  this.logger.info('core.js  ###  resetAddPool')
  this._addCountriesPool = []
  this._addStatesPool = []
  this._disableNodes = []
  this._expandNodes = []
}

/**
 * Reinitialize edit pools
 * @method resetEditPool
 */
Core.prototype.resetEditPool = function () {
  this.logger.info('core.js  ###  resetEditPool')
  this._editCountriesPool = []
  this._editStatesPool = []
}

/**
 *  Initialize countries and states to edit
 * @method  initializeEdit
 * @param   {array} nodes - nodes to edit
 */
Core.prototype.initializeEdit = function (nodes) {
  this.logger.info('core.js  ###  initializeEdit')
  // Fill _editCountries and _editStates arrays with nodes array
  this._initialize(nodes, this._editCountries, this._editStates, function (node) {})
}

/**
 * Initialize countries and states to add.
 * Each countries and states to add are also added to disabled node list
 * @method  initializeAdd
 * @param   {array} nodes - nodes to add
 */
Core.prototype.initializeAdd = function (nodes) {
  this.logger.info('core.js  ###  initializeAdd')
  var self = this
  // Fill _addCountries and _addStates arrays with nodes array
  self._initialize(nodes, this._addCountries, this._addStates, function (node) {
    // Add each countries and states to add to _disableNodes list
    self._initializeDisableExpandNodes(node)
  })
}

/**
 * Sort nodes array.
 * @method  _initialize
 * @param   {array} nodes       - Nodes to sort
 * @param   {array} countries   - Array that will contains countries
 * @param   {array} states      - Array that will contains states
 * @param   {function} callback - Post treatment if needed
 */
Core.prototype._initialize = function (nodes, countries, states, callback) {
  this.logger.info('core.js  ###  _initialize')
  if (typeof nodes !== 'undefined') {
    nodes.forEach(function (node) {
      if (typeof node.parentIsoCode === 'undefined') {
        countries.push(node)
      } else {
        states.push(node)
      }
      callback(node)
    })
  }
}

/**
 * Add node id to _disableNodes array
 * If it s a country node, node id is also add to _expandNodes array
 * @method  _initializeDisableExpandNodes
 * @param   {Object} node   - node
 */
Core.prototype._initializeDisableExpandNodes = function (node) {
  this.logger.info('core.js  ###  _initializeDisableExpandNodes')
  this._disableNodes.push(node.nodeId)
  if (node.typeNode === TYPE_NODE.COUNTRY) {
    this._expandNodes.push(node.nodeId)
  }
}

/**
 * Send data information to a specific process (given a pid)
 * In order to kill one of these childs (given a childPid)
 * @method  cancelProcess
 * @param   {Object} processInfo              - Object containins the following properties:
 * @param   {string} processInfo.pid          - Parent process PID to send data
 * @param   {string} processInfo.childPid     - Child process PID to kill
 */
Core.prototype.cancelProcess = function (processInfo) {
  this.logger.info('core.js  ###  cancelProcess')
  this.logger.info('core.js  ###  cancelProcess : ' + processInfo)
  if (typeof this._processes[processInfo.pid] !== 'undefined') {
    // this._logger.info('#Core.prototype.cancelProcess: Cancel process ' + processInfo.childPid + '. Parent process = ' + processInfo.pid)
    this._processes[processInfo.pid].send({
      type: 'one',
      childPid: processInfo.childPid
    })
  } else {
    this.logger.info('core.js  ###  cancelProcess : No process for pid = ' + processInfo.pid)
  }
}

/**
 * Used for unit test
 * @method   _cancelAllChildProcesses
 * @param   {interger} pid  - process identifier to cancel
 */
Core.prototype._cancelAllChildProcesses = function (pid) {
  this.logger.info('core.js  ###  _cancelAllChildProcesses')
  this.logger.info('core.js  ###  _cancelAllChildProcesses : ' + pid)
  if (typeof this._processes[pid] !== 'undefined') {
    this._processes[pid].send({
      type: 'all'
    })
  }else {
    this.logger.info('core.js  ###  _cancelAllChildProcesses : No process for pid = ' + pid)
  }
}

/**
 * Cancel all _processes from _processes map.
 * @method  cancelAllProcesses
 */
Core.prototype.cancelAllProcesses = function () {
  this.logger.info('core.js  ###  cancelAllProcesses')
  var self = this
  // Reset all sensitive data
  self._eventEmitter = undefined
  self._addStatesPool.length = 0
  self._editStatesPool.length = 0
  self._addCountriesPool.length = 0
  self._editCountriesPool.length = 0

  // For each parent process, send order to kill all childs _processes
  Object.keys(self._processes).forEach(function (key) {
    self.logger.info('core.js  ###  cancelAllProcesses : Kill process pid = ' + key)
    if (typeof self._processes[key] !== 'undefined' && self._processes[key] !== null) {
      self._processes[key].send({
        type: 'all',
        childPid: undefined
      })
    } else {
      self.logger.info('core.js  ###  cancelAllProcesses : No process for pid = ' + key)
    }
  })
}

/**
 * Create pools
 * @method  createAllPool
 * @param   {Integer} nbProcesses   -
 */
Core.prototype.createAllPool = function (nbProcesses) {
  this.logger.info('core.js  ###  createAllPool')
  this._createPool(this._addCountriesPool, this._addCountries, nbProcesses)
  this._createPool(this._addStatesPool, this._addStates, nbProcesses)
  this._createPool(this._editCountriesPool, this._editCountries, nbProcesses)
  this._createPool(this._editStatesPool, this._editStates, nbProcesses)
}

/**
 * Create array of pool where pool is an array containing nodes. array size === poolAmount
 * @method  _createPool
 * @param   {array} pool            - Pool array which will contains array of size === poolAmount
 * @param   {array} nodes           - Array to parse
 * @param   {Integer} poolAmount    - Pool size
 */
Core.prototype._createPool = function (pool, nodes, poolAmount) {
  this.logger.info('core.js  ###  _createPool')
  this.logger.info('core.js  ###  _createPool : length = ' + poolAmount)
  if (nodes.length < poolAmount) {
    if (nodes.length > 0) {
      pool.push(nodes.splice(0, nodes.length))
    }
  } else {
    pool.push(nodes.splice(0, poolAmount))
    this._createPool(pool, nodes, poolAmount)
  }
}

/**
 * Initialize
 * @method  initializeProcesses
 * @param   {string}  login                 - Salesforce login
 * @param   {string}  pwd                   - Salesforce password
 * @param   {string}  loginUrl              - Salesforce url
 * @param   {boolean} isCheckOnly           - Indicates whether it's a simulation or not
 * @param   {boolean} trace                 - Indicates if trace mode is active or not
 * @param   {integer} retries               - Number of retries for a step
 * @param   {integer} duration              - Step duration
 * @param   {Object}  mainWindow            - Window on which inforation should be sent
 * @param   {function } pullConsumeCallback - Function called when a pool has been consumed
 * @param   {function} finalCallback        - Function called when all pool have been consumed
 */
Core.prototype.initializeProcesses = function (login, pwd, loginUrl, isCheckOnly, trace, retries, duration, stepRetries, mainWindow, pullConsumeCallback, finalCallback) {
  this.logger.info('core.js  ###  initializeProcesses')
  this.logger.info('core.js  ###  initializeProcesses : ' + login + ' ' + pwd + ' ' + loginUrl + ' ' + isCheckOnly + ' ' + trace + ' ' + retries + ' ' + duration + ' ' + stepRetries)
  var self = this
  // Add countries then emit ADD_STATE event
  self._launchProcessHelper({
    login: login,
    pwd: pwd,
    loginUrl: loginUrl,
    checkOnly: isCheckOnly,
    trace: trace,
    retries: retries,
    duration: duration,
    stepRetries: stepRetries,
    pool: self._addCountriesPool,
    action: ACTION.ADD,
    onEvent: EVENT.ADD_COUNTRIES,
    eventToEmit: EVENT.ADD_STATES
  }, mainWindow, pullConsumeCallback, finalCallback)

  // Add states then emit EDIT_CONTRIES event
  self._launchProcessHelper({
    login: login,
    pwd: pwd,
    loginUrl: loginUrl,
    checkOnly: isCheckOnly,
    trace: trace,
    retries: retries,
    duration: duration,
    stepRetries: stepRetries,
    pool: self._addStatesPool,
    action: ACTION.ADD,
    onEvent: EVENT.ADD_STATES,
    eventToEmit: EVENT.EDIT_COUNTRIES
  }, mainWindow, pullConsumeCallback, finalCallback)

  // Edit countries then emit EDIT_STATES event
  self._launchProcessHelper({
    login: login,
    pwd: pwd,
    loginUrl: loginUrl,
    checkOnly: isCheckOnly,
    trace: trace,
    retries: retries,
    duration: duration,
    stepRetries: stepRetries,
    pool: self._editCountriesPool,
    action: ACTION.EDIT,
    onEvent: EVENT.EDIT_COUNTRIES,
    eventToEmit: EVENT.EDIT_STATES
  }, mainWindow, pullConsumeCallback, finalCallback)

  // Edit states then emit undefined in order to finish the process
  self._launchProcessHelper({
    login: login,
    pwd: pwd,
    loginUrl: loginUrl,
    checkOnly: isCheckOnly,
    trace: trace,
    retries: retries,
    duration: duration,
    stepRetries: stepRetries,
    pool: self._editStatesPool,
    action: ACTION.EDIT,
    onEvent: EVENT.EDIT_STATES,
    eventToEmit: undefined
  }, mainWindow, pullConsumeCallback, finalCallback)

  // Start to consume add countries pool
  self._eventEmitter.emit(EVENT.ADD_COUNTRIES)
}

/**
 * Consume a pool when a given event is recieved
 * @method  _launchProcessHelper
 * @param   {Object} info                   - Contains the following attributes:
 * @param   {string} info.onEvent           - Event that triggered the {@link _launchProcess} function
 * @param   {string} info.login             - Salesforce login
 * @param   {string} info.pwd               - Salesforce password
 * @param   {Object} info.pool              - Map composed from arrays of nodes(states or countries)
 * @param   {string} info.action            - Action to perform (ADD or Edit)
 * @param   {boolean} info.checkOnly        - Indicates whether it's a simulation or not
 * @param   {string} info.eventToEmit       - Event to emit when pool has been consumed
 * @param   {Object} win                    - Window  on which further messages should be sent
 * @param   {function} pullConsumeCallback  - Function called when a pool has been consumed
 * @param   {function} finalCallback        - Function called when all pool have been consumed
 */
Core.prototype._launchProcessHelper = function (info, win, pullConsumeCallback, finalCallback) {
  this.logger.info('core.js  ###  _launchProcessHelper')
  var self = this
  // self._logger.info('#Core.prototype._launchProcessHelper: Enter' + JSON.stringify(info))
  self._eventEmitter.on(info.onEvent, function () {
    // self._logger.info('#Core.prototype._launchProcessHelper: on event ' + info.onEvent)
    // On info.onEvent perform info.action
    // When finished, emit EDIT_COUNTRIES event
    self._launchProcess(info, win, pullConsumeCallback, finalCallback)
  })
}

/**
 * Launch a child process. Child process launch the nodeJS script
 * createBot.js. For each array in the pool object, a child process is launch when
 * the previous child process as finished.
 * @method  _launchProcess
 * @param   {object} info                   - Object containing process information
 * @param   {string} info.login             - Salesforce login
 * @param   {string} info.passsword         - Salesforce password
 * @param   {array}  info.pool              - Array that contains arrays of nodes. Array lenght === poolAmount defined by user
 * @param   {string} info.op                - Operation to perform [edit | add]
 * @param   {Bool}   info.checkOnly         - Indicate whether it's a valdiation (with screenshot for degug purpose) or a 'deployment'
 * @param   {string} info.eventToEmit               - Event to fired
 * @param   {Object} win                    - Window on which data will be sent
 * @param   {string}logFolderName           - Log folder name
 * @param   {function} pullConsumeCallback  - Function called when a pool has been consumed
 * @param   {function} finalCallback        - Function called when all pool have been consumed
 */
Core.prototype._launchProcess = function (info, win, pullConsumeCallback, finalCallback) {
  this.logger.info('core.js  ###  _launchProcess')
  var self = this
  // self._logger.info('#Core.prototype._launchProcess launch process  info.onEvent = ' + info.onEvent + ' info.eventToEmit = ' +
    // info.eventToEmit + ' info.pool.length = ' + info.pool.length + '  info.pool = ' + JSON.stringify(info.pool))

  if (info.action !== ACTION.ADD && info.action !== ACTION.EDIT) {
    return self.logger.info('core.js  ###  _launchProcess : Invalid action ' + info.action)
  }

  // if pool contains arrays to consumed
  if (info.pool.length > 0) {
    // Process the data (note: error handling omitted)
    temp.open('sfdcbot', function (err, tmpInfo) {
      if (!err) {
        fs.write(tmpInfo.fd, JSON.stringify(info.pool.shift()))
        fs.close(tmpInfo.fd, function (err) {
          if (err) {
            return self.logger.info('core.js  ###  _launchProcess : Error occured while trying to close temp file ' + JSON.stringify(err))
          }
          self.logger.info('core.js  ###  _launchProcess : Create temp file ' + tmpInfo.path)
           // Create new child process
          var child = proc.fork(PATH_LAUNCHBOT_SCRIPT, [JSON.stringify(info), tmpInfo.path, self._debugFolderPath])
          self.logger.info('core.js  ###  _launchProcess : Create child process pid = ' + child.pid)
           // Add it to _processes map for further operation
          self._processes[child.pid] = child

           // On exit event, if pool is not empty, recurse
          child.on('exit', function (code, signal) {
            self.logger.info('core.js  ###  _launchProcess : On exit process pid = ' + child.pid)
            if (typeof self._processes[child.pid] !== 'undefined') {
              self._processes[child.pid] = undefined
            }

            if (info.pool.length >= 0) {
              child = null
              self._launchProcess(info, win, pullConsumeCallback, finalCallback)
            }
          })

           // On message event, send data to window
          child.on('message', function (data) {
            self.logger.info('core.js  ###  _launchProcess : On message process pid = ' + child.pid)
            if (typeof data.bot.node !== 'undefined' && !(data.bot.node.label in self._nodesProccessed)) {
              self._nodesProccessed[data.bot.node.label] = data.bot
            }
             // If phantomjs complete, increment counter indicating if process succeeded or failed
            if (data.bot.complete === true) {
              self._nodesProccessed[data.bot.node.label] = data.bot
            }
             // Send data to window (proceed.html page)
            if (typeof win !== 'undefined' && win !== null) {
              win.webContents.send('on-data', JSON.stringify({
                childPid: data.pid,
                typeNode: data.typeNode,
                label: data.label,
                pid: child.pid,
                steps: data.bot.steps,
                info: data.bot.info,
                percent: data.bot.percent,
                complete: data.bot.complete,
                fail: data.bot.failed
              }))
            }
          })
        })
      }
    })
  } else {
    // Callback executed when pool has been consumed
    pullConsumeCallback()
    if (typeof self._eventEmitter !== 'undefined' && typeof info.eventToEmit !== 'undefined') {
      self.logger.info('core.js  ###  _launchProcess : Emit event ' + info.eventToEmit)
      self._eventEmitter.emit(info.eventToEmit)
    } else {
      // Callback executed when all pools have been consumed
      finalCallback()
    }
  }
}

/**
 * Retrieve AddressSettings metadata, create data structure
 * for tree and display the cs-add view
 * @method  createConnection
 * @param   {string} loginUrl      - Salesforce Login Server URL (e.g. https://login.salesforce.com/)
 * @param   {string} loginSrc      - Salesforce login user
 * @param   {string} pwdSrc        - Salesforce password user
 * @param   {function} errorHandler- Function called when error is catch
 * @param   {function} callback    - Function called if there is no error
 */
Core.prototype.createConnection = function (loginUrl, loginSrc, pwdSrc, errorHandler, callback) {
  this.logger.info('core.js  ###  createConnection')
  var self = this
  var connection = new jsforce.Connection({
    loginUrl: loginUrl
  })

  // Connect to salesforce
  connection.login(loginSrc, pwdSrc, function (err, userInfo) {
    self.logger.info('core.js  ###  login')
    if (err) {
      self.logger.info('core.js  ###  login : error ' + JSON.stringify(err))
      return errorHandler('Password or login incorrect')
    }
    callback(connection)
  })
}

/**
 * Retrieve AddressSettings metadata, create data structure
 * for tree and display the cs-add view
 * @method  createDataTree
 * @param   {string} loginSrc       - Salesforce login user
 * @param   {string} pwdSrc         - Salesforce password user
 * @param   {function} errorHandler - Function to execute when error is catch
 * @param   {function} callback     - Function to execute when retrieve metadata is done
 */
Core.prototype.createDataTree = function (loginUrl, loginSrc, pwdSrc, errorHandler, callback) {
  this.logger.info('core.js  ###  createDataTree')
  var self = this
  self.createConnection(loginUrl, loginSrc, pwdSrc, errorHandler, function (connection) {
    // Object to retrieve
    var fullNames = ['Address']

    // Read metadata by passing metadata type, objetc to retrieve, callback
    connection.metadata.readSync('AddressSettings', fullNames, function (err, metadata) {
      if (err) {
        self.logger.info('core.js  ###  createDataTree : error ' + err)
        return errorHandler('Cannot read metadata' + JSON.stringify(err))
      }
      self._createCountriesAndStates(metadata)
      callback()
    })
  })
}

/**
 * Creates well formated data tree nodes given a list of countries and states
 * node recieved from salesforce
 * @method  _createCountriesAndStates
 * @param   {Object} metadata - Object that contains countries and states
 */
Core.prototype._createCountriesAndStates = function (metadata) {
  this.logger.info('core.js  ###  _createCountriesAndStates')
  var self = this
  metadata.countriesAndStates.countries.forEach(function (country) {
    var countryNode = self._createCountryNode(country)
    var stateNodes = []
      // If coutry has states properties
    if (country.states !== null && typeof country.states !== 'undefined') {
      // If country has states iterate on eahc state otherwise just create one state
      if (Array.isArray(country.states)) {
        country.states.forEach(function (state) {
          stateNodes.push(self._createStateNode(state, countryNode))
        })
      } else {
        stateNodes.push(self._createStateNode(country.states, countryNode))
      }
      countryNode.nodes = stateNodes
    }
    self._dataTree.push(countryNode)
  })
}

/**
 * Create and return a well formated state node
 * @method  _createStateNode
 * @param   {Object} state      - State retrieve from metadata api
 * @param   {Object} country    - country retrieve from metadata api
 */
Core.prototype._createStateNode = function (state, country) {
  this.logger.info('core.js  ###  _createStateNode')
  var stateNode = {
    text: state.label,
    integrationValue: state.integrationValue,
    isoCode: state.isoCode,
    standard: (state.standard === 'true'),
    active: (state.active === 'true'),
    visible: (state.visible === 'true'),
    parentIsoCode: country.isoCode,
    typeNode: TYPE_NODE.STATE,
    selectable: true,
    state: {
      checked: false,
      disabled: false,
      expanded: false,
      selected: false
    }
  }
  return stateNode
}

/**
 * Create and return a well formated country node
 * @param   {Object} country    - country retrieve from metadata api
 */
Core.prototype._createCountryNode = function (country) {
  this.logger.info('core.js  ###  _createCountryNode')
  var countryNode = {
    text: country.label,
    integrationValue: country.integrationValue,
    isoCode: country.isoCode,
    orgDefault: (country.orgDefault === 'true'),
    standard: (country.standard === 'true'),
    active: (country.active === 'true'),
    visible: (country.visible === 'true'),
    typeNode: TYPE_NODE.COUNTRY,
    nodes: undefined,
    selectable: true,
    state: {
      checked: false,
      disabled: false,
      expanded: false,
      selected: false
    }
  }
  return countryNode
}

module.exports = Core
