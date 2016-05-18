/**
 * @author kokoweite <kokoweite@hotmail.com>
 * @file evtIcons.js
 * 2015-10-21T7:28:00
 */

// you have to declare const ipcRenderer = require('electron').ipcRenderer;
$(document).ready(function () {

  $('#close-window').click(function () {
    ipcRenderer.send('on-close-window')
  })

  $('#min-max-window').click(function () {
    ipcRenderer.send('on-full-window')
  })

  $('#minimize-window').click(function () {
    ipcRenderer.send('on-mnimize-window')
  })
})
