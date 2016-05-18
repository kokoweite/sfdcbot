/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file main.js
 * 2015-10-21T7:28:00
 */

'use strict'

var dateFolder
var process = require('child_process')
var os = require('os')
var app = require('app')
var mkdirp = require('mkdirp')
var win = require('electron-window')
var ipcMain = require('electron').ipcMain
var Core = require('./app/js/objects/core')
var fs = require('fs')
var bunyan = require('bunyan')

var APP_NAME = 'sfdcbot'
var SANDBOX = 'https://test.salesforce.com'
var PRODUCTION = 'https://login.salesforce.com'
var BASE_FOLDER_PATH

// Path
var PATH_INDEX_PAGE = __dirname + '/app/views/index.html'
var PATH_SOURCE_PAGE = __dirname + '/app/views/source.html'
var PATH_LOADING_PAGE = __dirname + '/app/views/loading.html'
var PATH_TREE_PAGE = __dirname + '/app/views/tree.html'
var PATH_TARGET_PAGE = __dirname + '/app/views/target.html'
var PATH_PROCEED_PAGE = __dirname + '/app/views/proceed.html'
var PATH_FINAL_PAGE = __dirname + '/app/views/finalScreen.html'

var STATE = {
  INDEX: 'index',
  SOURCE: 'source',
  LOADING: 'loading',
  ADD: 'add',
  EDIT: 'edit',
  TARGET: 'target',
  PROCEED: 'proceed',
  FINAL: 'final'
}
var startTime
var endTime
var core
var log

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // Cancel all childs processes
  core.cancelAllProcesses()
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('ready', function () {
  // Initialze date, core and create folders
  initializeFolder()

  // Initialize logger
  log = bunyan.createLogger({
    name: APP_NAME,
    streams: [
      {
        path: BASE_FOLDER_PATH + '/log/' + APP_NAME + '.log'  // log ERROR and above to a file
      }]
  })

  // Initialize core
  core = new Core(BASE_FOLDER_PATH, log)

  log.info('main.js  ###  Initialze window')
  // Create the browser window.
  var mainWindow = win.createWindow({
    title: APP_NAME,
    width: 900,
    height: 750,
    frame: false,
    resizable: true,
    overlayScrollbars: false
  })

  log.info('main.js  ###  Show ' + PATH_INDEX_PAGE)
  // Load the index.html page
  mainWindow.showUrl(PATH_INDEX_PAGE, {
    state: STATE.INDEX
  }, function () {})

  // On on-start event, show source login page
  ipcMain.on('on-start', function (event, args) {
    log.info('main.js  ###  on-start')
    log.info('main.js  ###  Show ' + PATH_SOURCE_PAGE)
    mainWindow.showUrl(PATH_SOURCE_PAGE, {
      state: STATE.SOURCE
    }, function () {})
  })

  // On on-src-back event, go back to index page
  ipcMain.on('on-finish-back', function (event, args) {
    log.info('main.js  ###  on-finish-back')
    // reset all variable
    core.resetAll()
    // Initialze date, core and create folders
    initializeFolder()
    // Initialize core
    core = new Core(BASE_FOLDER_PATH, log)
    // Show index page
    mainWindow.showUrl(PATH_INDEX_PAGE, {
      state: STATE.INDEX
    }, function () {})
  })

  // On on-src-back event, go back to index page
  ipcMain.on('on-src-back', function (event, args) {
    log.info('main.js  ###  on-src-back')
    mainWindow.showUrl(PATH_INDEX_PAGE, {
      state: STATE.INDEX
    }, function () {})
  })

  // On on-src-next event, display loading page
  // Retrieve adress metadata and create data tree
  // Once data have been retrieved
  // Display Add states and countries page
  ipcMain.on('on-src-next', function (event, args) {
    log.info('main.js  ###  on-src-next')
    var info = JSON.parse(args)
    // Display loading page
    mainWindow.showUrl(PATH_LOADING_PAGE, {
      state: STATE.LOADING,
      orgName: info.login,
      title: 'Retrieving states and countries'
    }, function () {})

    // Get login URL
    var loginUrl = (typeof info.orgType !== 'undefined') ? PRODUCTION : SANDBOX

    // Connect to salesforce and retrieve AddressSettings metadata
    core.createDataTree(loginUrl, info.login, info.pwd,
      function (errorMessage) {
        mainWindow.showUrl(PATH_SOURCE_PAGE, {
          state: STATE.INDEX,
          error: errorMessage
        }, function () {})
      },
      function () {
        // Display cs-add view when retrieve is done
        mainWindow.showUrl(PATH_TREE_PAGE, {
          state: STATE.ADD,
          data: core.dataTree
        }, function () {})
      }
    )
  })

  // On on-back add, go back to source login page
  ipcMain.on('on-back-to-source', function (event, args) {
    log.info('main.js  ###  on-back-to-source')
    // SHow index page
    mainWindow.showUrl(PATH_SOURCE_PAGE, {
      state: STATE.SOURCE
    }, function () {})
  })

  // On on-add event
  ipcMain.on('on-add-finished', function (event, args) {
    log.info('main.js  ###  on-add-finished')
    var info = JSON.parse(args)
    core.initializeAdd(info.checkedNodes)

    // Display loading page
    mainWindow.showUrl(PATH_TREE_PAGE, {
      state: STATE.EDIT,
      data: core.dataTree,
      disableNodes: core.disableNodes,
      expandNodes: core.expandNodes
    }, function () {})
  })

  // Return to add page
  ipcMain.on('on-back-to-add', function () {
    log.info('main.js  ###  on-back-to-add')
    core.resetAdd()
    // Show add page
    log.info('main.js  ###  Show ' + PATH_TREE_PAGE)
    // Display tree page
    mainWindow.showUrl(PATH_TREE_PAGE, {
      state: STATE.ADD,
      data: core.dataTree
    }, function () {})
  })

  // Go to target connection
  ipcMain.on('on-edit-finished', function (event, args) {
    log.info('main.js  ###  on-edit-finished')
    var info = JSON.parse(args)
    core.initializeEdit(info.checkedNodes)
    log.info('main.js  ###  show ' + PATH_TARGET_PAGE)
    // Display target page
    mainWindow.showUrl(PATH_TARGET_PAGE, {
      state: STATE.TARGET
    }, function () {})
  })

  // Return to edit page
  ipcMain.on('on-back-to-edit', function (event, args) {
    log.info('main.js  ###  on-back-to-edit')
    // Reset edit pools
    core.resetEdit()
    // Display loading page
    log.info('main.js  ###  Show ' + PATH_TREE_PAGE)
    mainWindow.showUrl(PATH_TREE_PAGE, {
      state: STATE.EDIT,
      data: core.dataTree,
      disableNodes: core.disableNodes,
      expandNodes: core.expandNodes
    }, function () {})
  })

  // Go to proceed page
  ipcMain.on('on-tgt-connection', function (event, args) {
    log.info('main.js  ###  on-tgt-connection')
    // Display loading page
    mainWindow.showUrl(PATH_LOADING_PAGE, {
      state: STATE.LOADING,
      orgName: args.login,
      title: 'Connection to target environment'
    }, function () {})

    var info = JSON.parse(args)
    var login = info.login
    var pwd = info.pwd
    var loginUrl = (typeof info.orgType !== 'undefined') ? PRODUCTION : SANDBOX
    var isCheckOnly = (typeof info.checkOnly !== 'undefined')
    var trace = (typeof info.trace !== 'undefined')
    // Error messages
    var errors = []
    // Check if values are not corrupted
    var nbProcesses = (typeof info.nbProcesses !== 'undefined' && Number.isInteger(Number(info.nbProcesses)) && Number(info.nbProcesses) !== 0) ? Math.abs(Number(info.nbProcesses)) : errors.push('Invalid number of processes</br>')
    var totalRetries = (typeof info.retries !== 'undefined' && Number.isInteger(Number(info.retries)) && Number(info.retries) !== 0) ? Math.abs(Number(info.retries)) : errors.push('Invalid number of retries</br>')
    var duration = (typeof info.duration !== 'undefined' && Number.isInteger(Number(info.duration)) && Number(info.duration) !== 0) ? Math.abs(Number(info.duration)) : errors.push('Invalid number of step duraton</br>')
    var stepRetries = (typeof info.stepRetries !== 'undefined' && Number.isInteger(Number(info.stepRetries)) && Number(info.stepRetries) !== 0) ? Math.abs(Number(info.stepRetries)) : errors.push('Invalid number of step retries</br>')

    // If errors don't go to next step
    // Show PATH_TARGET_PAGE and display error messages
    if (errors.length > 0) {
      mainWindow.showUrl(PATH_TARGET_PAGE, {
        state: STATE.TARGET,
        error: errors.join('\n')
      }, function () {})
    }else {
      log.info('main.js  ###  Create all pool')
      core.createAllPool(nbProcesses)

      log.info('main.js  ###  Create connection')
      core.createConnection(loginUrl, login, pwd,
        // Error callback
        function (errorMessage) {
          // If error during connection, show PATH_TARGET_PAGE and display error messages
          log.info('main.js  ###  Show ' + PATH_TARGET_PAGE)
          mainWindow.showUrl(PATH_TARGET_PAGE, {
            state: STATE.TARGET,
            error: errorMessage
          }, function () {})
        },
        // Success callback
        function (connection) {
          startTime = new Date().getTime()
          log.info('main.js  ###  Start time = ' + startTime)
          log.info('main.js  ###  Initialize processes')
          core.initializeProcesses(login, pwd, loginUrl, isCheckOnly, trace, totalRetries, duration, stepRetries, mainWindow, function () {}, function () {
            endTime = new Date().getTime()
            log.info('main.js  ###  End time = ' + endTime)
            var totalTime = (endTime - startTime) / 1000
            var minute = Math.floor(totalTime / 60)
            // Get decimal part. Can also used modulo 1
            var second = Math.round((((totalTime / 60) - minute) * 60))
            log.info('main.js  ###  Show ' + PATH_FINAL_PAGE)
            mainWindow.showUrl(PATH_FINAL_PAGE, {
              state: STATE.FINAL,
              minute: minute,
              second: second,
              nodes: core.nodesProccessed
            }, function () {})
          })
          log.info('main.js  ###  Show ' + PATH_PROCEED_PAGE)
          mainWindow.showUrl(PATH_PROCEED_PAGE, {
            state: STATE.PROCEED,
            poolSize: 15
          }, function () {})
        }
      )
    }
  })

  // On on-cancel event, send to parent process (i.e args.pid)
  // a message specifying which child process to kill (i.e args.childPid)
  ipcMain.on('on-cancel', function (event, args) {
    log.info('main.js  ###  on-cancel')
    core.cancelProcess(JSON.parse(args))
  })

  // On on-cancel-all event, cancel all childs processes
  ipcMain.on('on-cancel-all', function (event, args) {
    log.info('main.js  ###  on-cancel-all')
    core.cancelAllProcesses()
  })

  ipcMain.on('on-print-result', function (event, args) {
    log.info('main.js  ###  on-print-result')
  // Use default printing options
    mainWindow.webContents.printToPDF({printBackground: true}, function (error, data) {
      if (error) throw error
      fs.writeFile(args.path, data, function (err) {
        if (err) {
          throw error
        }
        log.info('main.js  ###  Write PDF successfully.')
      })
    })
  })

  // On on-close-window, kill all processes and quit app
  ipcMain.on('on-close-window', function (event, arg) {
    log.info('main.js  ###  on-close-window')
    // Kill all childs processes
    core.cancelAllProcesses()

    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // On on-max-min-window, switch to full screen or not
  ipcMain.on('on-full-window', function (event, arg) {
    // Maximize or minimize window
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  })

  // On on-minimize-window, minimize the current window
  ipcMain.on('on-mnimize-window', function (event, arg) {
    // Maximize or minimize window
    mainWindow.minimize()
  })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
})

function initializeFolder () {
  dateFolder = new Date().toISOString().replace(/[T:]/g, '-').replace(/\..*/, '')
  BASE_FOLDER_PATH = os.homedir() + '/' + APP_NAME + '/debug/' + dateFolder

  // Create folder
  mkdirp.sync(BASE_FOLDER_PATH + '/log')
  mkdirp.sync(BASE_FOLDER_PATH + '/images')
}

// function cleanFolder (path) {
//   if (fs.existsSync(path)) {
//     fs.readdirSync(path).forEach(function (file, index) {
//       var curPath = path + '/' + file
//       if (fs.lstatSync(curPath).isDirectory()) {
//         // recurse
//         cleanFolder(curPath)
//         // Delete folder
//         fs.rmdirSync(curPath)
//       } else {
//         // delete file
//         fs.unlinkSync(curPath)
//       }
//     })
//   }
// }

// function deleteFolder (path) {
//   cleanFolder(path)
//   fs.rmdirSync(path)
// }
