/**
 * @author kokoweite <kokoweite@hotmail.fr>
 * @file core_test.js
 * 2015-10-21T7:28:00
 */

var assert = require('assert')
var Core = require('../app/js/objects/core')
var fs = require('fs')
var os = require('os')
var mkdirp = require('mkdirp')
var should = require('should')
var propertiesReader = require('properties-reader')
var properties = propertiesReader('secret.properties')
var bunyan = require('bunyan')
var botCore

before(function () {
  mkdirp(os.homedir() + '/' + 'csfdcbot' + '/debug/test/log', function (err) {
    if (err) {
      console.error(err)
    }
  })
})

beforeEach(function () {
  // Initialize logger
  var log = bunyan.createLogger({
    name: 'Unit Test',
    streams: [
      {
        path: os.homedir() + '/csfdcbot/debug/test/test.log'  // log ERROR and above to a file
      }]
  })
  botCore = new Core(os.homedir() + '/' + 'csfdcbot' + '/debug/test', log)
})

describe('core ', function () {
  describe('Create nodes', function () {
    it('should create countries nodes', function () {
      var countryNode = botCore._createCountryNode({
        'active': 'true',
        'integrationValue': 'Argentina',
        'isoCode': 'AR',
        'label': 'Argentina',
        'orgDefault': 'false',
        'standard': 'true',
        'visible': 'true'
      })

      countryNode.text.should.equal('Argentina')
      countryNode.integrationValue.should.equal('Argentina')
      countryNode.isoCode.should.equal('AR')
      countryNode.orgDefault.should.equal(false)
      countryNode.standard.should.equal(true)
      countryNode.active.should.equal(true)
      countryNode.visible.should.equal(true)
      countryNode.typeNode.should.equal('country')
      countryNode.should.have.property('nodes').eql(undefined)
      countryNode.selectable.should.be.true()
      countryNode.state.checked.should.be.false()
      countryNode.state.disabled.should.be.false()
      countryNode.state.expanded.should.be.false()
      countryNode.state.selected.should.be.false()

      it('should create state node', function () {
        var stateNode = botCore._createStateNode({
          'active': 'true',
          'integrationValue': 'Buenos Aires',
          'isoCode': 'AR01',
          'label': 'Buenos Aires',
          'standard': 'false',
          'visible': 'true'
        }, countryNode)

        stateNode.text.should.equal('Buenos Aires')
        stateNode.integrationValue.should.equal('Buenos Aires')
        stateNode.isoCode.should.equal('AR01')
        stateNode.standard.should.equal(false)
        stateNode.active.should.equal(true)
        stateNode.visible.should.equal(true)
        stateNode.typeNode.should.equal('state')
        stateNode.selectable.should.be.true()
        stateNode.parentIsoCode.should.equal(countryNode.isoCode)
        stateNode.state.checked.should.be.false()
        stateNode.state.disabled.should.be.false()
        stateNode.state.expanded.should.be.false()
        stateNode.state.selected.should.be.false()
      })
    })
  })

  describe('Create data tree', function () {
    it('should create  3 countries and  3 states nodes', function () {
      var metadata = JSON.parse(fs.readFileSync(__dirname + '/fixture/sfdc-metadata.json', 'utf8'))
      botCore._createCountriesAndStates(metadata)
      botCore.dataTree.length.should.equal(3)
      botCore.dataTree[2].nodes.length.should.equal(3)
    })
  })

  describe('Create processes', function () {
    it('should consumed pools and create processes', function (done) {
      this.timeout(150000)
      var metadata = JSON.parse(fs.readFileSync(__dirname + '/fixture/bot-metadata.json', 'utf8'))
      botCore.resetAll()
      botCore.initializeAdd(metadata)
      botCore.initializeEdit(metadata)
      botCore.createAllPool(2)
      var step = botCore.addStatesPool[0].length
      var size = step
      botCore.initializeProcesses(properties.get('source.org'), properties.get('source.pwd'),
        'https://test.salesforce.com', true, true, 3, 3, 3, null,
        function (err, res) {
          Object.keys(botCore.processes).length.should.equal(size)
          size += step
        },
        function (err, res) {
          if (err) return done(err)
          Object.keys(botCore.processes).length.should.equal(8)
          done()
        })
      botCore.editStatesPool.length.should.equal(2)
      Object.keys(botCore.processes).forEach(function (key) {
        botCore._cancelAllChildProcesses(key)
      })
    })
  })

  describe('data', function () {
    beforeEach(function () {
      var metadata = JSON.parse(fs.readFileSync(__dirname + '/fixture/bot-metadata.json', 'utf8'))
      botCore.resetAll()
      botCore.initializeAdd(metadata)
      botCore.initializeEdit(metadata)
    })

    it('should initialize countries and states to edit', function () {
      botCore.editStates.length.should.equal(3)
      botCore.editCountries.length.should.equal(3)
    })

    it('should initialize countries and states to add', function () {
      botCore.addStates.length.should.equal(3)
      botCore.addCountries.length.should.equal(3)
    })

    it('should create pools that contains arrays length 2', function () {
      botCore.createAllPool(2)
      botCore.addCountriesPool.length.should.equal(2)
      botCore.addStatesPool.length.should.equal(2)
      botCore.editCountriesPool.length.should.equal(2)
      botCore.editStatesPool.length.should.equal(2)
    })

    it('should consumed arrays that contains nodes to add and edit', function () {
      botCore.createAllPool(2)
      botCore.addStates.length.should.equal(0)
      botCore.editStates.length.should.equal(0)
      botCore.addCountries.length.should.equal(0)
      botCore.editCountries.length.should.equal(0)
    })

    it('should reset all data', function () {
      botCore.createAllPool(2)
      botCore.resetAll()
      botCore.addStates.length.should.equal(0)
      botCore.editStates.length.should.equal(0)
      botCore.addCountries.length.should.equal(0)
      botCore.editCountries.length.should.equal(0)
      botCore.addStatesPool.length.should.equal(0)
      botCore.addCountriesPool.length.should.equal(0)
      botCore.editStatesPool.length.should.equal(0)
      botCore.editCountriesPool.length.should.equal(0)
    })
  })
})
