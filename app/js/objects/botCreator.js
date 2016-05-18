/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file launchPhJS.js
 * 2015-10-21T7:28:00
 */

'use strict'

var proc = require('child_process')
var path = require('path')
var phantomjs = require('phantomjs-prebuilt')

function PhantomCreator (debugFolderPath, logger) {
  this.logger = logger
  this._processes = {}
  this._nbProcessDone = 0
  this._percentDone = 0
  this._stepsDone = 0
}

PhantomCreator.prototype = {

  get processes () {
    return this._processes
  },
  get nbProcessDone () {
    return this._nbProcessDone
  },
  get percentDone () {
    return this._percentDone
  },
  get stepsDone () {
    return this._stepsDone
  }
}

/**
 * Launch phantomJS script
 *
 * @method  createBot
 * @param   {object} info                    - Contains the following attributes:
 * @param   {string} info.login              - Salesforce login
 * @param   {string} info.password           - Salesforce password
 * @param   {string} info.typeNode           - Determine whether it's a country or state
 * @param   {string} info.action             - Determine whether it's an edit or add operation
 * @param   {string} info.loginUrl           - Salesforce url
 * @param   {string} info.trace              - Indicates if takes screenshot
 * @param   {string} info.checkOnly          - Indicates whether it's a simulation (true) or not (false)
 * @param   {string} info.parentIsoCode      - Determine parent isoCode of the node being used
 * @param   {string} info.active             - Properties of states/countries node
 * @param   {string} info.integrationValue   - Properties of states/countries node
 * @param   {string} info.isoCode            - Properties of states/countries node
 * @param   {string} info.label              - Properties of states/countries node
 * @param   {boolean} info.standard          - Properties of states/countries node
 * @param   {boolean} info.visible           - Properties of states/countries node
 */
PhantomCreator.prototype.createPhantomProcess = function (info) {
  var self = this
  self.logger.info('phantomCreator.js  ###  createPhantomProcess')
  Object.keys(info).forEach(function (key) {
    if (typeof info[key] === 'undefined') {
      self.logger.error('phantomCreator.js  ###  info[' + key + ']= undefined')
    }
  })
  // WIN32
  // var phantomJSPath = path.resolve(__dirname, '../../../../app.asar.unpacked/node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs')
  // var scriptPath = path.resolve(__dirname, '../../../../app.asar.unpacked/app/js/scripts/phantomBot.js')
  // OSX
  // var phantomJSPath = path.resolve(__dirname, '../../../../app.asar.unpacked/node_modules/phantomjs-prebuilt/lib/phantom/bin/phantomjs')
  // var scriptPath = path.resolve(__dirname, '../../../../app.asar.unpacked/app/js/scripts/phantomBot.js')
  var child
  if (process.env.NODE_ENV !== 'test') {
    child = proc.spawn(phantomjs.path, ['--web-security=false', __dirname + '/../scripts/phantomBot.js', JSON.stringify(info)])
    // child = proc.spawn(phantomJSPath, ['--web-security=false', scriptPath, JSON.stringify(info)])
  } else {
    child = proc.spawn(phantomjs.path)
    child.kill('SIGINT')
  }

  // Force utf-8 encoding
  child.stdout.setEncoding('utf-8')

  self.logger.info('phantomCreator.js  ###  Add child ' + child.pid)
  // Add child process to hash map
  self._processes[child.pid] = child

  // On exit process
  child.on('exit', function (code, signal) {
    self.logger.info('phantomCreator.js  ###  exit process ' + child.pid)
    self._processes[child.pid] = undefined
    self._nbProcessDone++
    if (self._nbProcessDone === Object.keys(self._processes).length) {
      process.exit()
    }
  })

  // On recieve data from bot.js process
  child.stdout.on('data', function (data) {
    self.logger.info('phantomCreator.js  ###  send data to ' + child.pid + '  data: ' + data)
    // Kepp percent data for further operation
    if (data.percent !== 'undefined') {
      self._percentDone = data.percent
        // stepsDone = data.steps
    }
    // Send data to main.js process
    self.sendInformation(child.pid, info.text, info.typeNode, data)
  })

  child.stderr.on('data', function (data) {
    self.logger.info('phantomCreator.js  ###  Error occured with ' + child.pid + ' process' + data)
    self.sendInformation(child.pid, info.text, info.typeNode, 'An error has occured while ' + info.action + 'ing ' + info.text)
    self._processes[child.pid] = undefined
  })
}

/**
 * Send information to the parent process
 * @method  sendInformation
 * @param   {integer} pid     - Process identifier of the phantomjs process
 * @param   {string} label    - Label of the processed node
 * @param   {string} typeNode - Type of the node (i.e state or country)
 * @param   {object} data     - Data sent from the phantomjs node
 * @param   {string}status    - Custom status. Replace the status propertie of data
 */
PhantomCreator.prototype.sendInformation = function (pid, label, typeNode, data, status) {
  try {
    var parsedData = JSON.parse(data)
    if (typeof status !== 'undefined') {
      parsedData.info = status
    }

    var args = {
      pid: pid,
      label: label,
      typeNode: typeNode,
      bot: parsedData
    }
    // Send data to main process
    process.send(args)
  } catch (err) {
    this.logger.info('phantomCreator.js  ###  Cannot parse ' + data)
  }
}

/**
 * Cancel all processes
 * @method cancelAll
 */
PhantomCreator.prototype.cancelAll = function () {
  var self = this
  self.logger.info('phantomCreator.js  ###  cancel all processes: ' + self._processes)
  Object.keys(self._processes).forEach(function (key) {
    if (typeof self._processes[key] !== 'undefined') {
      self._processes[key].kill('SIGINT')
    }
  })
}

module.exports = PhantomCreator
