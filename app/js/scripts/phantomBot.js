/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file bot.js
 * 2015-10-21T7:28:00
 */
'use strict'

var system = require('system')
var WebPage = require('webpage')
var args = system.args
var OPERATION = {
  ADD: 'add',
  EDIT: 'edit'
}
var TYPE_NODE = {
  COUNTRY: 'country',
  STATE: 'state'
}
var DEFAULT_NUMBER_COUNTRIES = 239

/**
 * @constructor
 */
function Bot (data) {
  /** @private This object */
  var self = this
    /**
     * Action to execute (i.e add or edit)
     *@private
     */
  self._action = data.action
    /**
     * Salesforce login
     * @private
     */
  self._login = data.login
    /**
     * Salesforce passord
     * @private
     */
  self._password = data.password
    /**
     * boolean indicating whether node is standard or not
     *@private
     */
  self._standard = data.standard // (data.standard == 'true') ? true : false
    /**
     * Node integration value
     * @private
     */
  self._integrationValue = data.integrationValue
    /**
     * Node iso code
     * @private
     */
  self._isoCode = data.isoCode
    /**
     * Node label
     * @private
     */
  self._label = data.text
    /**
     * Indicates whether node is active or not
     * @private
     */
  self._active = data.active // (data.active == 'true') ? true : false
    /**
     * Indicates whether node is visible or not
     * @private
     */
  self._visible = data.visible // (data.visible == 'true') ? true : false
    /**
     * Node parent iso code. Undefined when node is a country
     * Equal to coutry iso code when node is a state
     * @private
     */
  self._countryIsoCode = (data.typeNode === TYPE_NODE.COUNTRY) ? data.isoCode : data.parentIsoCode
    /**
     * Type of node (i.e state or country)
     * @private
     */
  self._typeNode = data.typeNode
    /**
     * Indicates whether trace option has been selected or not
     * @private
     */
  self._trace = data.trace // (data.trace == 'true') ? true : false
    /**
     * Salesforce login url (i.e https://test.salesforce.com or https://login.salesforce.com')
     * @private
     */
  self._loginUrl = data.loginUrl
    /**
     * Indicates whether check only option has been selected or not
     * @private
     */
  self._checkOnly = data.checkOnly // (data.checkOnly == 'true') ? true : false
    /**
     * Log directory's path
     * @private
     */
  self._path = data.debugFolderPath
    /**
     * Instance of phantomjs WebPage module
     * @private
     */
  self._page = WebPage.create()
    /** @private */
  self._countryFound = false
    /** @private */
  self._stateFound = false
    /** @private */
  self._countryLinkMap = {}
    /** @private */
  self._stateLinkMap = {}

  self._entitled = '[' + self._action + ' ' + self._typeNode + ' ' + self._label + '] '

  self._steps = [function () {
    self._page.open(self._loginUrl)
    return {
      message: self._entitled + 'Navigate to:' + self._loginUrl,
      done: true
    }
  },
  self.credentialHandler(),
  self.clickEltByIdHandler('Login'),
  function () {
    var found = self.waitForId('setupLink')
    var message = self._entitled + 'Waiting for logged in'
    if (found) {
      message = self._entitled + 'Logged in'
    }
    return {
      message: message,
      done: found
    }
  },
  function () {
    var url = self._page.url.replace('/home/home.jsp', '/i18n/ConfigStateCountry.apexp?setupid=AddressCleanerOverview')
    self._page.open(url)
    return {
      message: self._entitled + 'Navigate to: countries and states page',
      done: true
    }
  }]
}

Bot.prototype = {

  /**
   * Setter for boolean variable _countryFound
   *
   * @method country (value)
   * @param   {boolean} value  - boolean indicates whether country has been found or not
   */
  set country (value) {
    this._countryFound = value
  },
  /**
   * Setter for boolean variable _stateFound
   *
   * @method stateFound (value)
   * @param   {boolean} value  - boolean indicates whether state has been found or not
   */
  set stateFound (value) {
    this._stateFound = value
  },
  /**
   * Setter for string variable _path
   *
   * @method path (value)
   * @param   {string} value  - string path
   */
  set path (value) {
    this._path = value
  },
  /**
   * Getter for boolean variable _countryFound
   *
   * @method countryFound
   * @returns {boolean} true if country found
   */
  get countryFound () {
    return this._countryFound
  },
  /**
   * Getter for boolean variable _stateFound
   *
   * @method stateFound
   * @returns {boolean} true if state found
   */
  get stateFound () {
    return this._stateFound
  },
  /**
   * Getter for array variable _steps
   *
   * @method steps
   * @returns {Array} Array containing all function  to execute
   */
  get steps () {
    return this._steps
  },
  /**
   * Getter for object variable _page
   *
   * @method page
   * @returns {object} instance of phantomjs WebPage module
   */
  get page () {
    return this._page
  },
  /**
   * Getter for string variable _action
   *
   * @method action
   * @returns {string} action to performed
   */
  get action () {
    return this._action
  },
  /**
   * Getter for string variable _login
   *
   * @method action
   * @returns {string} salesforce login
   */
  get login () {
    return this._login
  },
  /**
   * Getter for string variable _password
   *
   * @method password
   * @returns {string} salesforce password
   */
  get password () {
    return this._password
  },
  /**
   * Getter for boolean variable _password
   *
   * @method standard
   * @returns {boolean} true if standard
   */
  get standard () {
    return this._standard
  },
  /**
   * Getter for string variable _integrationValue
   *
   * @method integrationValue
   * @returns {string} node integration value
   */
  get integrationValue () {
    return this._integrationValue
  },
  /**
   * Getter for string variable _isoCode
   *
   * @method isoCode
   * @returns {string} node iso code
   */
  get isoCode () {
    return this._isoCode
  },
  /**
   * Getter for string variable _label
   *
   * @method label
   * @returns {string} node label
   */
  get label () {
    return this._label
  },
  /**
   * Getter for string variable _active
   *
   * @method active
   * @returns {boolean} true if active
   */
  get active () {
    return this._active
  },
  /**
   * Getter for string variable _visible
   *
   * @method visible
   * @returns {boolean} true if visible
   */
  get visible () {
    return this._visible
  },
  /**
   * Getter for string variable _countryIsoCode
   *
   * @method countryIsoCode
   * @returns {string} country iso code value
   */
  get countryIsoCode () {
    return this._countryIsoCode
  },
  /**
   * Getter for string variable _typeNode
   *
   * @method typeNode
   * @returns {string} type node (i.e country or state)
   */
  get typeNode () {
    return this._typeNode
  },
  /**
   * Getter for boolean variable _trace
   *
   * @method trace
   * @returns {boolean} true if trace option enabled
   */
  get trace () {
    return this._trace
  },
  /**
   * Getter for string variable _loginUrl
   *
   * @method loginUrl
   * @returns {string} salesforce login url (i.e https://test.salesforce.com or https://login.salesforce.com)
   */
  get loginUrl () {
    return this._loginUrl
  },
  /**
   * Getter for boolean variable _checkOnly
   * @method checkOnly
   * @returns {boolean} true if check only option enabled
   */
  get checkOnly () {
    return this._checkOnly
  },
  /**
   * Getter for string variable _path
   * @method path
   * @returns {string} log directory's path
   */
  get path () {
    return this._path
  }
}

/**
 * Create a map id = (iso code or label name)  value = edit link id
 * First retrieve all elements containing selector. With all these elements
 * create a map of object containing edit link, iso code, label name of a node (i.e state or country)
 * Then create a map that contains edit link id as value and iso code and label
-* name as keys (i.e values are duplicated)
 * @method  sfGetEditLinkFromSelector
 * @param   {string} selector   - Selector to retrieve
 * @return  map that contains edit link given iso code or label name
 */
Bot.prototype.sfGetEditLinkFromSelector = function (selector) {
  return this._page.evaluate(function (arg0) {
    // Array which will contains collection objects
    // Object contains iso code (FR,AR,JP ...) and their conresponding selector
    var isos = [].map.call(document.querySelectorAll(arg0), function (obj) {
      var editId = obj.id.replace(':code', ':editLink')
      var nameId = obj.id.replace(':code', ':name')
      var name = document.getElementById(nameId)

      var rObj = {
        editId: editId,
        isoCode: obj.textContent,
        name: name
      }

      return rObj
    })

    // Create map from array
    // (iso code) => (link edit button
    var hashmap = {}
    for (var i = 0; i < isos.length; i++) {
      var code = isos[i].isoCode
      var name = isos[i].name
      hashmap[code] = isos[i].editId
      hashmap[name] = isos[i].editId
    }

    return hashmap
  }, selector)
}

/**
 * Fill salesforce credential fields
 * @method fillCredential
 * @return true if operation succeeded else return false
 */
Bot.prototype.fillCredential = function () {
  return this._page.evaluate(function (arg0, arg1) {
    if (document.getElementById('username') !== null && document.getElementById('password').value !== null) {
      document.getElementById('username').value = arg0
      document.getElementById('password').value = arg1
      return true
    } else {
      return false
    }
  }, this._login, this._password)
}

/**
 * Given an id, get the corresponding element and click on it
 * @method clickEltById
 * @return true if operation succeeded else return false
 */
Bot.prototype.clickEltById = function (id) {
  return this._page.evaluate(function (arg0) {
    var ev = document.createEvent('MouseEvent')
    ev.initMouseEvent(
      'click',
      true, /* bubble */
      true, /* cancelable */
      window, null,
      0, 0, 0, 0, /* coordinates */
      false, false, false, false, /* modifier keys */
      0, /* left*/
      null
    )
    var element = document.getElementById(arg0)
    if (element !== null) {
      element.dispatchEvent(ev)
      return true
    } else {
      return false
    }
  }, id)
}

/**
 * Fill integration value, iso code, name, and active fields.
 * @method  fillStateAndCountry
 * @return  true if operation succeeded else return false
 */
Bot.prototype.fillStateAndCountry = function () {
  return this._page.evaluate(function (intval, code, name, isStandard, isActive) {
    var filled = false
    var editActive = document.querySelector('[id$=editActive]')
    var editIsoCode = document.querySelector('[id$=editIsoCode]')
    var editIntVal = document.querySelector('[id$=editIntVal]')
    var editName = document.querySelector('[id$=editName]')

    if (editActive !== null && editIntVal !== null && editName !== null) {
      if (isStandard === false) {
        if ((editActive.checked && !isActive) || (!editActive.checked && isActive)) {
          editActive.click()
        }
        editIsoCode.value = code
      }
      editIntVal.value = intval
      editName.value = name
      filled = true
    }

    return filled
  }, this._integrationValue, this._isoCode, this._label, this._standard, this._active)
}

/**
 * Click on visible checkbox.
 * @method  fillVisibleField
 * @return  {boolean} Return true if operation succeeded else return false
 */
Bot.prototype.fillVisibleField = function () {
  return this._page.evaluate(function (isVisible) {
    var editVisible = document.querySelector('[id$=editVisible]')
    if (editVisible !== null) {
      if ((editVisible.checked && !isVisible) || (!editVisible.checked && isVisible)) {
        editVisible.click()
      }
      return true
    } else {
      return false
    }
  }, this._visible)
}

/**
 * Click on an element
 * @method  clickEltByIdHandler
 * @param   {string} id   - element's identifier on which click action has to
 *           be performed
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.clickEltByIdHandler = function (id) {
  var self = this
  return function () {
    var clicked = self.clickEltById(id)
    var message = clicked ? 'Trying to click on ' + id : 'Clicking on link ' + id
    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Fill login and password field
 * @method  credentialHandler
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.credentialHandler = function () {
  var self = this
  return function () {
    var filled = self.fillCredential()
    if (!filled) {
      return {
        message: self._entitled + 'Waiting for Filling credential',
        done: false
      }
    } else {
      return {
        message: self._entitled + 'Credential filled',
        done: true
      }
    }
  }
}

/**
 * Return and id given a selector
 * @method  getIdFromSelector
 * @param   {string} selector   - selector to find
 * @returns {boolean} true if element is found
 */
Bot.prototype.getIdFromSelector = function (selector) {
  return this._page.evaluate(function (arg0) {
    return document.querySelector(arg0).id
  }, selector)
}

/**
 * Try to find element given a selector
 * @method  waitForSelector
 * @param   {string} selector   - selector to find
 * @returns {boolean} true if element is found
 */
Bot.prototype.waitForSelector = function (selector) {
  return this._page.evaluate(function (arg0) {
    var element = document.querySelector(arg0)
    if (element !== null) {
      return true
    } else {
      return false
    }
  }, selector)
}

/**
 * Try to find element given an id
 * @method  waitForId
 * @param   {string} id   - element id to find
 * @returns {boolean} true if element is found
 */
Bot.prototype.waitForId = function (id) {
  return this._page.evaluate(function (arg0) {
    var element = document.getElementById(arg0)
    if (element !== null) {
      return true
    } else {
      return false
    }
  }, id)
}

/**
 * Wait for id containing configstatecountry loaded. (i.e wait for country and page loaded)
 * @method confirmCountryAndStatePageLoaded
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.waitForCountryAndStatePageLoaded = function () {
  var self = this
  return function () {
    var message = 'Loading country and state page '
    var foundSelector = self.waitForSelector('[id^=configstatecountry]')
    if (foundSelector === true) {
      message = 'Country and state page loaded '
    }
    return {
      message: self._entitled + message,
      done: foundSelector
    }
  }
}

/**
 * Create a map  for countries where key = isoCode and value = link
 * @method createCountriesLinkMapAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.createCountriesLinkMapAction = function () {
  var self = this
  return function () {
    var result = false
    var foundSelector = self.waitForSelector('[id^=configstatecountry]')
    var message = 'Trying to found url for ' + self._countryIsoCode
    if (foundSelector === true) {
      self._countryLinkMap = self.sfGetEditLinkFromSelector('[id$=code]')
      if (Object.keys(self._countryLinkMap).length >= DEFAULT_NUMBER_COUNTRIES) {
        result = true
      }
      message = 'Url for ' + self._countryIsoCode + 'found'
    }
    return {
      message: self._entitled + message,
      done: result
    }
  }
}

/**
 * Click on the country link
 * @method navigateToCountryAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.navigateToCountryAction = function () {
  var self = this
  return function () {
    var foundSelector = false
    var clicked = false
    var message = 'Trying to click on ' + self._countryIsoCode + ' link'
    if (self._countryIsoCode in self._countryLinkMap) {
      var countryLink = self._countryLinkMap[self._countryIsoCode]
      foundSelector = self.waitForId(countryLink)
      if (foundSelector) {
        self._countryFound = true
        clicked = self.clickEltById(countryLink)
        message = 'Clicking on ' + countryLink + ' link'
      }
    } else {
      self._countryFound = false
    }

    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Create a map  for states where key = isoCode and value = link
 * @method createStatesLinkMapAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.createStatesLinkMapAction = function () {
  var self = this
  return function () {
    var result = false
    var foundSelector = self.waitForSelector('[id^=configurecountry]')
    var message = 'Try to found url for ' + self._isoCode
    if (foundSelector) {
      // Retrieve all id corresponding to edit link , key are isoCode
      self._stateLinkMap = self.sfGetEditLinkFromSelector('[id$=code]')
      if (Object.keys(self._stateLinkMap).length > 0) {
        result = true
      }
      message = 'Searching url for ' + self._isoCode + ' found'
    }
    return {
      message: self._entitled + message,
      done: result
    }
  }
}

/**
 * Navigate on state to edit
 * @method navigateToStateAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.navigateToStateAction = function () {
  var self = this
  return function () {
    // init variable
    var foundSelector = false
    var clicked = false
    var message = 'State has not been found'

    if (self._isoCode in self._stateLinkMap) {
      var stateEditLink = self._stateLinkMap[self._isoCode]
      foundSelector = self.waitForId(stateEditLink)
      if (foundSelector) {
        self._stateFound = true
        clicked = self.clickEltById(stateEditLink)
        message = 'State has been found'
      }
    } else {
      self._stateFound = false
    }

    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Fill fields for state or country
 * @method fillStateAndCountryAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.fillStateAndCountryAction = function () {
  var self = this
  return function () {
    var message = 'Fill ' + self._typeNode
    var filled = false

    filled = self.fillStateAndCountry()
    if (!filled) {
      message = 'Trying to fill ' + self._typeNode
    }

    return {
      message: self._entitled + message,
      done: filled
    }
  }
}

/**
 * Fill visible field for state or county
 * @method fillVisibleFieldAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.fillVisibleFieldAction = function () {
  var self = this
  return function () {
    var message = 'Set visible field with success'
    var filled = self.fillVisibleField()
    if (!filled) {
      message = 'Trying to set visible field'
    }

    return {
      message: self._entitled + message,
      done: filled
    }
  }
}

/**
 * Click on save state button
 * @method editNodeAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.editNodeAction = function () {
  var self = this
  return function () {
    var message = 'Editing ' + self._typeNode + ' ' + self._label
    var clicked = false
    if ((self._typeNode === TYPE_NODE.STATE && self._stateFound === true) || (self._typeNode === TYPE_NODE.COUNTRY && self._countryFound === true)) {
      var found = self.waitForSelector('[id$=saveButtonTop]')
      if (!self._checkOnly && found === true) {
        var id = self.getIdFromSelector('[id$=saveButtonTop]')
        clicked = self.clickEltById(id)
        if (clicked === true) {
          message = 'has been edited'
        }
      } else if (self._checkOnly === true) {
        clicked = true
        message = 'Check only: State has not been edited'
      }
    }
    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Click on new state or country button
 * @method addNewNodeAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.addNewNodeAction = function () {
  var self = this
  return function () {
    var clicked = false
    var message = 'Trying to click on add new ' + ' ' + self._typeNode
    var found = self.waitForSelector('[id$=buttonAddNew]')
    if (found) {
      var id = self.getIdFromSelector('[id$=buttonAddNew]')
      clicked = self.clickEltById(id)
    }
    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Add a node (i.e Country or State) by clicking on add button
 * This function   represent the final action to be done when adding a new node
 * @method addNodeAction
 * @returns {object} An object that contains a message indicating status and if
 *         operation succeeded or not
 */
Bot.prototype.addNodeAction = function () {
  var self = this
  return function () {
    var message = 'Adding ' + self._typeNode + ' ' + self._label
    var clicked = false
    if (!self._checkOnly) {
      var found = self.waitForSelector('[id$=addButton]')
      if (found) {
        var id = self.getIdFromSelector('[id$=addButton]')
        clicked = self.clickEltById(id)
        if (clicked) {
          message = 'has been added'
        }
      } else {
        console.log('cannot found selector addButton')
      }
    } else {
      clicked = true
      message = 'Check only: ' + self._typeNode + ' has not been added'
    }
    return {
      message: self._entitled + message,
      done: clicked
    }
  }
}

/**
 * Create steps depending on action and type node
 * @method createSteps
 */
Bot.prototype.createSteps = function () {
  if (this._action === OPERATION.EDIT) {
    if (this._typeNode === TYPE_NODE.STATE) {
      this._steps.push(
        this.createCountriesLinkMapAction(),
        this.navigateToCountryAction(),
        this.createStatesLinkMapAction(),
        this.navigateToStateAction(),
        this.fillStateAndCountryAction(),
        this.fillVisibleFieldAction(),
        this.editNodeAction())
    } else {
      this._steps.push(
        this.createCountriesLinkMapAction(),
        this.navigateToCountryAction(),
        this.fillStateAndCountryAction(),
        this.fillVisibleFieldAction(),
        this.editNodeAction())
    }
  } else {
    if (this._typeNode === TYPE_NODE.STATE) {
      this._steps.push(
        this.createCountriesLinkMapAction(),
        this.navigateToCountryAction(),
        this.addNewNodeAction(),
        this.fillStateAndCountryAction(),
        this.fillVisibleFieldAction(),
        this.addNodeAction())
    } else {
      this._steps.push(
        this.addNewNodeAction(),
        this.fillStateAndCountryAction(),
        this.fillVisibleFieldAction(),
        this.addNodeAction())
    }
  }
}

Number.isInteger = Number.isInteger || function (value) {
  return typeof value === 'number' &&
    isFinite(value) &&
    Math.floor(value) === value
}

/**
 * Instanciate Bot and create steps.
 * When a step fails 10 times, retry from step 0.
 * At third tries, if always failing, exit
 * @method main
 */
function main () {
  try {
    var param = JSON.parse(args[1])
  } catch (err) {
    console.log(err)
  }

  var bot = new Bot(param)
  var totalRetries = (typeof param.retries !== 'undefined' && Number.isInteger(Number(param.retries)) && Number(param.retries) !== 0) ? Number(param.retries) : 3
  var duration = (typeof param.duration !== 'undefined' && Number.isInteger(Number(param.duration)) && Number(param.duration) !== 0) ? Number(param.duration) * 1000 : 3000
  var stepRetries = (typeof param.stepRetries !== 'undefined' && Number.isInteger(Number(param.stepRetries)) && Number(param.stepRetries) !== 0) ? Number(param.stepRetries) : 10

  // Build the path
  if (typeof bot.path !== 'undefined') {
    bot.path += (bot.typeNode === TYPE_NODE.STATE) ? '/states/' + bot.countryIsoCode + '/' + bot.isoCode : '/countries/' + bot.isoCode
  }

  // Create array of function
  bot.createSteps()

  var retry = 0

  // Index array represent steps. This array count number
  // of fails for a given step.
  var arrayRetry = []

  // Initialize arrayRetry with 0
  for (var i = 0; i < bot.steps.length; i++) {
    arrayRetry[i] = 0
  }

  var index = 0
  var complete = false
  var status = 'cancel'
  setInterval(function () {
    if (retry === totalRetries) {
      status = 'fail'
      complete = true
      console.log(JSON.stringify({
        steps: '0/' + bot.steps.length,
        info: 'Tried to ' + bot.action + ' ' + totalRetries + ' times ' + bot.typeNode + ' but failed',
        percent: 0,
        action: bot.action,
        complete: complete,
        node: {
          label: bot.label,
          typeNode: bot.typeNode,
          status: status,
          action: bot.action
        }
      }))
      phantom.exit()
    }
    if (typeof bot.steps[index] !== 'function') {
      phantom.exit()
    } else {
      var data = bot.steps[index]()
      var message = data.message

      if (index === bot.steps.length - 1) {
        complete = true
        status = 'success'
      }

      console.log(JSON.stringify({
        steps: (index + 1) + '/' + bot.steps.length,
        info: message,
        percent: Math.round(((index + 1) / bot.steps.length) * 100),
        action: bot.action,
        complete: complete,
        fail: false,
        node: {
          label: bot.label,
          typeNode: bot.typeNode,
          status: status,
          action: bot.action
        }
      }))

      if (bot.path !== undefined && bot.trace) {
        bot.page.render(bot.path + '/step_' + bot.isoCode + '_' + index + '.png')
      }

      // If step done, increment index and go to next step.
      if (data.done === true) {
        index++
      } else {
        // Increment arrayRetry at index (index represent the current step)
        arrayRetry[index]++
          // If Step fails stepRetries times, restart from step 0 and increment retry
        if (arrayRetry[index] % stepRetries === 0) {
          index = 0
          retry++
        }
      }
    }
  }, duration)
}

// Start main method
main()
