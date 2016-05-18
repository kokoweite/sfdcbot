/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file launchPhJS.js
 * 2015-10-21T7:28:00
 */
'use strict'

var BotCreator = require('../objects/botCreator')
var bunyan = require('bunyan')
var fs = require('fs')

/**
 * Main method
 * @method main
 */
function main () {
  var processDataArg = process.argv[2]
  var tmpFile = process.argv[3]
  var debugFolderPath = process.argv[4]
  var nodesData = []
  var processData = {}
  // Initialize logger
  var logger = bunyan.createLogger({
    name: 'sfdcbot',
    streams: [
      {
        path: debugFolderPath + '/log/corePhantom.log'  // log ERROR and above to a file
      }]
  })
  var botCreator = new BotCreator(debugFolderPath, logger)

  // On message event, cancel porcess(es)
  process.on('message', function (data) {
    if (data.type === 'one') {
      if (botCreator.processes[data.childPid] !== undefined) {
        logger.info('botCreator.js  ###  Kill process ' + data.childPid)
        botCreator.processes[data.childPid].kill('SIGINT')
      } else {
        logger.info('botCreator.js  ###  Process ' + data.childPid + ' does not exist')
      }
    } else if (data.type === 'all') {
      botCreator.cancelAll()
    } else {
      logger.error('botCreator.js  ###  data.type doesn \'t exist ' + data.type)
    }
  })

  try {
    nodesData = JSON.parse(fs.readFileSync(tmpFile, 'utf8'))
  } catch (err) {
    logger.error('botCreator.js  ###  Cannot parse data: ' + tmpFile)
    logger.error('botCreator.js  ###  ' + err)
  }

  // Delete temp file
  fs.unlinkSync(tmpFile)

  try {
    processData = JSON.parse(processDataArg)
  } catch (err) {
    logger.error('botCreator.js  ###  Cannot parse data: ' + processDataArg)
    logger.error('botCreator.js  ###  ' + err)
  }

  nodesData.forEach(function (node) {
    botCreator.createPhantomProcess({
      login: processData.login,
      password: processData.pwd,
      typeNode: node.typeNode,
      action: processData.action,
      loginUrl: processData.loginUrl,
      trace: processData.trace,
      retries: processData.retries,
      duration: processData.duration,
      stepRetries: processData.stepRetries,
      checkOnly: processData.checkOnly,
      parentIsoCode: node.parentIsoCode,
      active: node.active,
      integrationValue: node.integrationValue,
      isoCode: node.isoCode,
      text: node.text,
      standard: node.standard,
      visible: node.visible,
      debugFolderPath: debugFolderPath + '/images'
    })
  })
}

main()
