const VERSION = '0.0.1'
console.log(VERSION)

// common.js
/* global
getEl log
*/

// eslint-disable-next-line no-undef
const playersData = window['DATA__PLAYERS_DATA']

log(playersData)

let pageW = document.body.offsetWidth
let pageH = document.body.offsetHeight

const lvlPadding = 10
// (buildingNamesList.length / 6) / (pageH*3/4) 
// see .building width
const cntPadding = 160

function createImage(playerName = 'Беглецы') {
  // FIXME its just an example
  const buildingNamesList = [].concat(
    playersData.Беглецы.buildings,
    playersData.Беглецы.orbital
  )
  
  
  let lvl = 0
  let cnt = 0
  for(let i of buildingNamesList) {
    if(cnt > lvl) {
      cnt = 0
      lvl++
    }
    showBuilding(i, lvl, cnt, buildingNamesList.length)
    cnt++
  }
}


function showBuilding(name, lvl, cnt, length) {
  const el = document.createElement('div')
  el.className = 'building'
  el.style.zIndex = length - lvl
  el.style.bottom = `${2 + lvl * lvlPadding}vh`
  el.style.left = `${pageW/2 + (-lvl/2 + cnt)*cntPadding}px`
  el.innerText = name
  el.title = name

  document.body.appendChild(el)
}

function main() {
  createImage()
}
main()
