/* exported
  log warn warnNoTrace getEl 
  locationSearchToArray FILL_2_TREE_TYPE
  getDictKey
*/

var log = console.log

function warnNoTrace(...args) {
  console.warn(...args)
  if(!getEl('el_error').hidden) return
  getEl('el_error_inner').innerText = [...args]
  getEl('el_error').hidden = false
  setTimeout(_ => getEl('el_error').hidden = true, 4000)
}

// some wierd SO magic
// https://stackoverflow.com/questions/63859312/how-to-properly-override-console-warn-in-javascript
function warn(...args) {
  let err = new Error("trace")
  var stack = err.stack
  if (stack) {
    stack = stack.split('\n').slice(2, 3).join('\n').trim().replace('at ', '')
    console.warn(...args, stack)
  }
  if(!getEl('el_error').hidden) return
  getEl('el_error_inner').innerText = [...args]
  getEl('el_error').hidden = false
  setTimeout(_ => getEl('el_error').hidden = true, 4000)
}

function getEl(id) {
  return document.getElementById(id)
}

function locationSearchToArray(query) {
  return query
    .replace(/^\?/, '')
    .split('&')
    .filter( e => e)
    .map( e => e.split('='))
    .map( ([key, value]) => [key, decodeURIComponent(value)])
}

var FILL_2_TREE_TYPE = {
  "#FF9966": "Military",
  "#CCFFCC": "Biology",
  "#FFCC00": "Industry",
  "#99CCFF": "Science",
  "#CC99FF": "Sociology",
}

/**
 * dictObj is list of upper tresholds
 * @param {Object<string, any>} dictObj 
 * @param {number} rollNum 
 */
function getDictKey(dictObj, rollNum) {
  let i = +rollNum
  while (i <= 18) {
    if (typeof dictObj[i] !== 'undefined') return dictObj[i]
    i++
  }
  // well, it is the last one
  while (i > 0) {
    if (typeof dictObj[i] !== 'undefined') return dictObj[i]
    i--
  }
}

function makeElDraggable(elID, headerID) {
  const el = document.getElementById(elID)
  const headerEl = headerID instanceof HTMLElement 
    ? headerID
    : document.getElementById(headerID)

  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0
  if (headerEl) {
    /* if present, the header is where you move the DIV from:*/
    headerEl.onmousedown = dragMouseDown
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    el.onmousedown = dragMouseDown
  }

  el.addEventListener('click', _ => {
    // eslint-disable-next-line no-undef
    if(typeof HTMLUtils !== 'undefined') HTMLUtils.focusModal(el)
  })

  function dragMouseDown(e) {
    e = e || window.event
    e.preventDefault()
    // get the mouse cursor position at startup:
    pos3 = e.clientX
    pos4 = e.clientY
    document.onmouseup = closeDragElement
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag
  }

  function elementDrag(e) {
    e = e || window.event
    e.preventDefault()
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX
    pos2 = pos4 - e.clientY
    pos3 = e.clientX
    pos4 = e.clientY
    // set the element's new position:
    el.style.top = (el.offsetTop - pos2) + "px"
    el.style.left = (el.offsetLeft - pos1) + "px"
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null
    document.onmousemove = null
  }
}