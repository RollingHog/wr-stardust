const VERSION = '0.0.1'
console.log(VERSION)

// common.js
/// <reference path="../common.js"/>
/* global
getEl log locationSearchToArray
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

function createImage(playerName) {
  getEl('el_main').innerHTML = ''

  let type = 'terrestrial'
  const distToStar = playersData[playerName].planetParams['Расстояние до звезды']
  if(distToStar <= 4) type = type + '_hot'
  // see BEYOND_SNOW_LINE
  else if(distToStar >= 7) type = type + '_cold'
  document.body.style.backgroundImage = `url("assets/planets/${type}.png")`

  const buildingNamesList = playersData[playerName].buildings
  const orbitalNamesList = playersData[playerName].orbital
  let lvl = 0
  let cnt = 0
  for(let name of buildingNamesList) {
    if(cnt > lvl) {
      cnt = 0
      lvl++
    }
    showBuilding(name, lvl, cnt, buildingNamesList.length)
    cnt++
  }

  cnt = 0
  for(let name of orbitalNamesList) {
    showOrbital(name, 0, cnt)
    cnt++
  }
}

/**
 * @param {string} name 
 * @param {*} lvl 
 * @param {*} cnt 
 * @param {*} length 
 */
function showBuilding(name, lvl, cnt, length) {
  const el = document.createElement('div')
  el.className = 'building'
  el.style.zIndex = length - lvl
  el.style.bottom = `${2 + lvl * lvlPadding}vh`
  el.style.left = `${pageW/2 + (-lvl/2 + cnt)*cntPadding}px`
  if(name.replace(/, /g,')(').includes('(сломано)')) { 
    el.style.background = 'linear-gradient(rgba(250,128,114, 0.7), red)'
  }
  const imgName = name
    .toLowerCase()
    .replace(/\([^)]+\)/g,'')
    .trim()
    .replace(/ /g, '_')
  el.innerHTML = `<img src='assets/buildings/${imgName}.png' alt="${name}">`
  el.title = name

  getEl('el_main').appendChild(el)
}

function showOrbital(name, lvl, cnt, length) {
  const el = document.createElement('div')
  el.className = 'orbital'
  el.style.zIndex = length - lvl
  el.style.top = `${2 + lvl * lvlPadding}vh`
  el.style.left = `${pageW/4.5 + (-lvl/2 + cnt)*cntPadding}px`
  const isNativeOrbital = !name.includes("(орб")
  const imgName = isNativeOrbital 
    ? name
      .toLowerCase()
      .replace(/\([^)]+\)/g,'')
      .trim()
      .replace(/ /g, '_')
    : 'orbital_default'
  el.innerHTML = `<img src='assets/buildings/${imgName}.png' alt="${name}">`
  el.title = name

  getEl('el_main').appendChild(el)
}

function main() {
  getEl('el_select_colony').innerHTML = Object.keys(playersData)
    .map (e => `<option value="${e}">${e}`)
    .join('\n')
  getEl('el_select_colony').onchange = _ => createImage(getEl('el_select_colony').value)
  if(location.search) {
    getEl('el_select_colony').value = locationSearchToArray(location.search)
      .filter(([key]) => key === 'user')[0][1]
    getEl('el_select_colony').onchange()
  }
}
main()
