/* exported
  log getEl
*/

var log = console.log

function getEl(id) {
  return document.getElementById(id)
}

var FILL_2_TREE_TYPE = {
  "#FF9966": "Military",
  "#CCFFCC": "Biology",
  "#FFCC00": "Industry",
  "#99CCFF": "Science",
  "#CC99FF": "Sociology",
}