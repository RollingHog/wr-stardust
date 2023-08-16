/* exported
  log warn getEl locationSearchDecompress
*/

var log = console.log

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