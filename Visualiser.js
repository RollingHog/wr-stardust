// common.js
/* global
getEl log
*/

// draw.js
/* global
  draw
*/

const VERSION = '1.0.1'
console.log(VERSION)

const range = (cnt) => '0'.repeat(cnt)

const TREELIST = [
  "Military",
  "Biology",
  "Industry",
  "Science",
  "Sociology",
]

// constants
const VARS = {
  IS_LOCAL: window.location.protocol === 'file:',
  DISABLE_PARSE_IMMUNITY: false,
  PLAYERS_TIMESTAMP_KEY: 'DATA__PLAYERS_TIMESTAMP',
  PLAYERS_DATA_KEY: 'DATA__PLAYERS_DATA',
  TREELIST_RU2EN: {
    "Война": "Military",
    "Социология": "Sociology",
    "Биология": "Biology",
    "Индустрия": "Industry",
    "Наука": "Science",
    "Особые": "Specials",
  },
  TREELIST_NOMIL: TREELIST.filter(e => e != 'Military'),
  SVG_DEFAULT: `<style> text {
    font-family: Helvetica;
    // font-size: 12;
  } </style>`,
  DIFFICULTY_MULTS: [
    0,
    // #1
    1,
    // 1.2,
    1,
    // #3
    2,
    // 2.2,
    2,
    // #5
    3,
    // 3.2,
    // 3.5,
    3, 3,
    // #8
    4,
    // 4.3,
    // 4.7,
    4, 4,
    // #11
    5,
    // 5.3,
    // 5.7,
    5, 5,
    // #14
    6,
    // 6.3,
    // 6.6,
    6, 6,
  ],
  effectsOfPlanetSize: {
    // Газовый гигант с колонизируемым спутником
    1: 'Пуски +2, Отказ 2, :радиация, :микрометеориты',
    // Малая планета (напр. Меркурий)
    2: 'Пуски +2, Отказ 2, :радиация, :микрометеориты',
    // Планета вдвое меньше Земли (напр. Марс)
    3: 'Пуски +1',
    // Планета, похожая на Землю
    4: '',
    // Большая каменная планета
    5: 'Пуски -1',
    // Планета вдвое больше Земли
    6: 'Строительство -1, Пуски -1, Ветвь "Физика пространства" +1',
  },
  hulls: {
    "пехота": ``,
    "танки": `Защита +2, Скорость +1`,
    "титан": `Защита +3, Щит +1, ужас`,
    "нанорой": `Регенерация 5, нано, ужас`,
    "звездолёт": ``,
    "хабитат": `Слоупок 1`,
    "наземная база": `неподвижна`,
    "космическая база": `неподвижна`,
  },
  colorToParameterType: {
    '#FF0000': 'Производство',
    '#00FF00': 'Общество',
    '#0000FF': 'Наука',
    '#000000': "Любой",
  },
  fill2TreeType: {
    "#FF9966": "Military",
    "#CCFFCC": "Biology",
    "#FFCC00": "Industry",
    "#99CCFF": "Science",
    "#CC99FF": "Sociology",
  },
}

; (() => {
  NodeList.prototype.forEach = Array.prototype.forEach
  HTMLCollection.prototype.forEach = Array.prototype.forEach
  HTMLCollection.prototype.filter = Array.prototype.filter
})()

const tech = {}
const techData = {
  graphmls: {},
  badCells: Object.fromEntries(TREELIST.map(e=>[e,[]])),
  levels: Object.fromEntries(TREELIST.map(e => [e,[]])),
  subtreeBorders: Object.fromEntries(TREELIST.map(e => [e,[]])),
  badTechCount: 0,
  currentTreeName: null,
  cache: Object.fromEntries(TREELIST.map(e=>[e,{html: null, viewBox: null}])),
}
const stat = {}
const inverted = {
  tech: {},
  /** 
  * @type {Object.<string, TTechObject>} 
  */
  alltech: {},
}

const svg = document.getElementById('svg')

window.onload = Init
async function Init() {

  console.time('full load   ')

  getEl('el_loading').hidden = false
  const parser = new DOMParser()
  const isLocalFile = VARS.IS_LOCAL

  const iframes = Array.from(document.querySelectorAll('iframe.tech'))
  if(isLocalFile) {
      await Promise.all(iframes.map(i => 
        new Promise((resolve) => {
          i.onload = resolve
          i.src = i.getAttribute('src2')
        })
      ))
  }
  
  console.time('load iframes')
  for (let i of TREELIST) {
    const src = `tech/${i}.graphml`
    if(isLocalFile) {
      try {
        const el = document.querySelector(`[src="${src}"]`)
        techData.graphmls[i] = parser.parseFromString(
          el.contentWindow.document.body.firstChild.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          , 'text/xml')
      } catch(e) {
        alert('shit happened, see dev console')
        console.warn(`cannot read local files, run
        chrome with --allow-file-access-from-files
        or
        firefox with about:config - privacy.file_unique_origin : false`)
        console.warn(e)
        getEl('el_loading').hidden = true
        break
      }
    } else {
      // non-local, try to fetch data
      const xmlText = await fetch(src).then(e=>e.text())
      techData.graphmls[i] = parser.parseFromString(xmlText, 'text/xml')
    }
  }
  console.timeEnd('load iframes')

  await parseTechIframe(VARS.TREELIST_NOMIL[0])
  console.time('initial draw')
  drawTree(VARS.TREELIST_NOMIL[0])
  getEl('el_loading').hidden = true
  console.timeEnd('initial draw')

  setTimeout(async function init2 () {

    console.time('player data ')
      
    const elPlayersData = getEl('el_data_players')
    await new Promise((resolve) => {
      elPlayersData.onload = resolve
      elPlayersData.src = elPlayersData.getAttribute('src2')
    })
    parseDoc.lastResult = window[VARS.PLAYERS_DATA_KEY]
    
    console.timeEnd('player data ')
    log('User data version:', window[VARS.PLAYERS_TIMESTAMP_KEY])

    HTMLUtils.enableHotkeysProcessing()
    HTMLUtils.tipHotkeys()

    console.time('other parse ')
    Promise.all(TREELIST
      .filter(e => e != VARS.TREELIST_NOMIL[0])
      .map(e => parseTechIframe(e))
    )
    .then(async _ => {
      console.timeEnd('other parse ')
      console.time('other draw  ')
      for (let i of TREELIST) {
        drawTree(i)
      }
      drawTree(VARS.TREELIST_NOMIL[0])
      console.timeEnd('other draw  ')

      inverted.alltech = Object.fromEntries(
        [...Object.values(tech)]
          .map(e => Object.values(e))
          .flat()
          .map(e => [e.name, e])
      )

      console.time('node stat   ')
      for (let treeName of TREELIST) {
        for (let j in tech[treeName]) {
          let [cost, effects] = parseNode.costAndEffects(tech[treeName][j])
          tech[treeName][j].cost = cost
          tech[treeName][j].effect = effects
          doNodeStat(treeName, tech[treeName][j])
        }
      }
      console.timeEnd('node stat   ')

      console.time('analysis    ')
      Analysis.onInit()
      console.timeEnd('analysis    ')

      getEl('players_selection').children.forEach(e=> (e.tagName=='LABEL')
        ? e.onclick = function() { 
          if(e.children[0].checked) {
            let playerName = e.innerText.trim()
            parseDoc.drawTech(playerName, techData.currentTreeName)
            User.drawUserStat(playerName)
          } else {
            User.activePlayer = null
            drawTree(techData.currentTreeName)
            getEl('el_reports_wrapper').hidden = true
          }
        }
        : null
      )

      HTMLUtils.makeElDraggable('el_selected_tech_wrapper', 'el_selected_tech_header')
      HTMLUtils.makeElDraggable('el_reports_wrapper', 'el_reports_header')
      HTMLUtils.makeElDraggable('el_help', 'el_help_header')
      HTMLUtils.makeElDraggable('el_unitcreator_wrapper', 'el_unitcreator_header')

      console.timeEnd('full load   ')
    })
  }, 0)
}

// counting win possibility for debils
// eslint-disable-next-line no-unused-vars
function countSuccessPossibility(treshold, nOfCubes) {
  const n = 250000
  let wins = 0
  for (let i = 0; i < n; i++) {
    let goodCubes = 0
    for (let j = 0; j < nOfCubes; j++) {
      goodCubes += +(Math.random() * 10).toFixed(0) % 10 > 3 ? 1 : 0
    }
    if (goodCubes >= treshold) wins += 1
  }
  return +(wins / n).toFixed(3)
}

// eslint-disable-next-line no-unused-vars
const HTMLUtils = {
  makeElDraggable(elID, headerID) {
    const el = document.getElementById(elID)
    const headerEl = document.getElementById(headerID)

    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0
    if (headerEl) {
      /* if present, the header is where you move the DIV from:*/
      headerEl.onmousedown = dragMouseDown
    } else {
      /* otherwise, move the DIV from anywhere inside the DIV:*/
      el.onmousedown = dragMouseDown
    }

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
  },

  addTableSorting(tableQuery) {
    // somewhere from SO
    const getCellValue = (tr, idx) =>
      tr.children[idx].innerText || tr.children[idx].textContent

    const comparer = (idx, asc) => (a, b) =>
      ((v1, v2) =>
        v1 !== "" && v2 !== "" && !isNaN(v1) && !isNaN(v2)
          ? v1 - v2
          : v1.toString().localeCompare(v2))(
            getCellValue(asc ? a : b, idx),
            getCellValue(asc ? b : a, idx)
          )

    Array.from(document.querySelector(tableQuery).tHead.rows[0].cells).forEach(
      (th) =>
        th.addEventListener("click", function () {
          const table = document.querySelector(tableQuery)
          Array.from(table.tBodies[0].children)
            .sort(
              comparer(
                Array.from(th.parentNode.children).indexOf(th),
                (this.asc = !this.asc)
              )
            )
            .forEach((tr) => table.tBodies[0].appendChild(tr))
        })
    )
  },

  openModal(name) {
    const tgt = Array.from(document.querySelectorAll('.modal')).map(e => e.id).filter(e => e.includes(name))[0]
    if(!tgt) return
    getEl(tgt).hidden = false
    this.registerModalPath(name)
  },

  registerModalPath(name, subName) {
    if(VARS.IS_LOCAL) {
      if(!name) {
        location.hash = ''
        return
      }

      location.hash += `${location.hash?'#':''}${name}${subName ? `__${subName}` : ''}`
    }
  },

  closeModal(name) {
    const tgt = Array.from(document.querySelectorAll('.modal')).map(e => e.id).filter(e => e.includes(name))[0]
    if(!tgt) return
    getEl(tgt).hidden = true
    this.registerModalPath('')
  },

  hideAllModals() {
    for(let i of document.querySelectorAll('.modal')) {
      i.hidden = true
    }
    location.hash = ''
  },

  tipHotkeys() {
    for(let i of document.querySelectorAll('button[accesskey]')) {
      i.title += '\nHotkey: Alt+'+i.accessKey
    }
  },

  enableHotkeysProcessing() {
    const ignoreKeys = ['Alt', 'Tab']

    const hotkeysList = {
      'Alt F1': btnClickHdlrByText('help'),
      'Escape': this.hideAllModals,
      'Alt U': btnClickHdlrByText('userpost'),
      'Alt R': btnClickHdlrByText('reports'),
      'Alt P': btnClickHdlrByText('parse clipboard'),
    }

    function btnClickHdlrByText (text) {
      return _ => Array.from(document.querySelectorAll('button'))
        .filter(e => e.innerText.toLowerCase().includes(text))[0].click()
    }

    // log(Object.entries(hotkeysList).map(e => `${e[0]}: ${e[1].name}`).join('\n'))

    document.body.addEventListener('keyup', function(evt) {
      if(!evt.code) return
      if(ignoreKeys.includes(evt.key)) return 
      const keyComb = 
        (evt.altKey ? 'Alt ' : '')
        + evt.code.replace(/(Key|Digit)/,'')
      if(hotkeysList[keyComb]) {
        hotkeysList[keyComb]()
        evt.stopPropagation()
        return false
      }
      if(evt.altKey) log(keyComb)
    })
  },
}
  

const Analysis = {
  // statistics and various checks
  onInit() {
    // extracted from Init
    Analysis.reportBadY()
    Analysis.insertTechLevels()
    Analysis.countTechSubtreesBorders()

    // console.log(listParam('cost', false))
    if(techData.badTechCount) console.log('unrecognized tech:', techData.badTechCount)
    
    Analysis.searchBadTechRefs()
    
    // Analysis.countTechPrices()
    // log(statAllEffects)
    
    setTimeout( _ => {
      // all output to clear timestamps
      console.log(listParam('costClear'))
      console.log(listAllWithoutMilitary())
      Analysis.totalTechCount()
    }, 20)

    Analysis.checkForOpenedWindows()

  },

  insertTechLevels() {
    for (let treeName of TREELIST) {
      for (let j in tech[treeName]) {
        tech[treeName][j].lvl = +techData.levels[treeName].indexOf(tech[treeName][j].y.toString())+1
      }
    }
  },

  countTechPrices() {
    let cnt = 0
    for (let i of Object.keys(tech)) {
      if(i == 'Military') continue
      log('Tech tree:', i)
      for(let j of Object.values(tech[i])) {
        const lvl = techData.levels[i].indexOf(j.y.toString())+1
        const mult = VARS.DIFFICULTY_MULTS[lvl]
        let tcost = 0
        let teff = 0
        let fail = false
        
        for(let k of j.cost) {
          if(KEYWORDS.COLONY_PARAMS.includes(k[0])) tcost += +k[1]
          else if(k[0] == 'Любой') tcost += +k[1]
          // eslint-disable-next-line no-empty
          else if(KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(k[0])) {}
          else if(k[0]=='Этапы') tcost *= 2
          else if(KEYWORDS.SPECIAL_TECH_COST.includes(k[0])) tcost += +k[1]
          // eslint-disable-next-line no-empty
          else if(KEYWORDS.MATERIALS.map(e=>e.toLowerCase()).includes(k[0])) {}
          // eslint-disable-next-line no-empty
          else if(['Технология', "Слоты"].includes(k[0])) {}
          else if(k[0] == 'суперпроект') {
            tcost = 0
            break
          }
          else {
            // log('what is this?', j.name, k)
            fail = true
            break
          }
        }

        tcost = +tcost.toFixed(2)

        // tcost<10 in case is's some superstructure
        if(Math.abs(tcost-mult)>1 && tcost>0 && tcost<10 && j.type != 'octagon') {
          log(i, j.name, `cost looks bad: ${tcost}->${mult}`)
          cnt++
          continue
        }
        
        for(let k of j.effect) {
          if(KEYWORDS.COLONY_PARAMS.includes(k[0])) teff += +k[1]
          else if(KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(k[0])) teff += +k[1]/2
          else if(KEYWORDS.TECH_EFFECTS.includes(k[0])) teff += +k[1]/2
          else if(k[0].startsWith('Исследования (')) teff += +k[1]/2
          // eslint-disable-next-line no-empty
          else if(KEYWORDS.MATERIALS.includes(k[0])) {}
          // eslint-disable-next-line no-empty
          else if(KEYWORDS.UNIT_TYPES.includes(k[0])) {}
          // eslint-disable-next-line no-empty
          else if(k[0] == 'особое') {
            teff = 0
            break
          }
          else {
            // log('what is this?', j.name, k)
            fail = true
            break
          }
        }

        if(fail || tcost == 0 || teff == 0) {
          // unrecognized effects
          continue
        }

        let d = (+tcost/+teff).toFixed(2)

        if(d && mult) {
          let p = (d/mult).toFixed(2)
          if(p>1.5 || p<0.6) {
            cnt++
            // log(i, j.name, j.effect[0][0], j.effect[0][1], `${d}->${mult}`, p>1?'ДОРОГО':"ДЕШЕВО")
          }
        }
      }
    }
    log('Bad prices:', cnt)
  },
  reportBadY() {
    // collapse stat bad Y's
    for (let i of Object.keys(stat)) {
      const keys =  Object.keys(stat[i])
      for (let j in keys) {
        if(!techData.levels[i].includes(keys[j])) techData.levels[i].push(keys[j])
        if(!keys[j-1]) continue
        const delta = keys[j] - keys[j-1]
        if(delta>0 && delta<10) {
          console.warn('bad y:', i, keys[j-1], keys[j])
        }
      }
    }
    Object.keys(techData.levels).map(i => techData.levels[i].sort((a,b)=>a<b))
  },
  countTechSubtreesBorders() {
    techData.subtreeBorders = Object.fromEntries(
      Object.entries(techData.badCells)
        .map(e => [e[0], e[1]
          .filter(e2 => e2.fullText.length > 2)
          .map(({ fullText, x, w }) => ({ fullText: fullText.toLowerCase(), x1: x, x2: x + w }))
        ]))
  },
  /**
   * @param {TTechObject} techObj 
   */
  getSubtreeName(techObj) {
    for(let i of techData.subtreeBorders[techObj.treeName]) {
      if(techObj.nodeCenter.x > i.x1 && techObj.nodeCenter.x < i.x2)
      return i.fullText
    }
  },
  searchBadTechRefs() {
    for (let i of Object.keys(tech)) {
      for (let j of Object.values(tech[i])) {
        j.cost
          .filter(e => e[0] == 'Технология')
          .forEach(e => {
            if (!(e[1] in inverted.alltech)) console.warn('unknown tech name here:', i, j.name, [e[1]])
          })
      }
    }
  },
  totalTechCount() {
    let sum=0
    for(let i of Object.keys(tech)) sum+=(Object.keys(tech[i]).length)
    log('Total tech count', sum)
  },

  filterObjectByDict(obj, dict) {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => dict.includes(key)))
  },
  
  excludeByDict(obj, dict) {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => !dict.includes(key)))
  },

  checkForOpenedWindows() {
    if(location.hash.length <= 1) return

    const path = decodeURIComponent(location.hash).split('#')
      .filter( e => e)
      .map(e =>e.split('__'))

    location.hash = ''

    const modals = {
      'report': i1 => {
        Analysis.drawReportsList()
        if(i1) {
          Analysis.openReport(i1)
        }
      },
      'battlecalc': _ => UnitCreator.open()
    }

    for(let i of path) {
      if(modals[i[0]]) {
        modals[i[0]](i[1])
      } else {
        console.warn('Unknown modal: ', i[0])
      }
    }
  },

  drawReportsList() {
    HTMLUtils.openModal('report')
    getEl('el_reports_home').hidden = true
    getEl('el_reports_list').innerHTML = ''
    
    for (let i of Object.keys(Analysis.Reports)) {
      getEl('el_reports_list').innerHTML += `<li 
      onclick="Analysis.openReport('${i}')">
      ${i.replace(/_/g,' ')}</li>`
    }
  },

  openReport(reportName) {
    HTMLUtils.registerModalPath('report', reportName)
    getEl('el_reports_home').hidden = false
    Analysis.Reports[reportName]()
  },

  closeReports() {
    HTMLUtils.closeModal('report')
  },
  
  reportTable(obj) {
    if(!Object.keys(obj).length) return

    getEl('el_reports_list').innerHTML = '<table><thead></thead><tbody></tbody></table>'
    const tbody = getEl('el_reports_list').children[0].tBodies[0]

    const entries = Object.entries(obj)
    const isObj = typeof entries[0][1] == 'object'
    let res = ''

    getEl('el_reports_list').children[0].tHead.innerHTML = 
      `<tr><th>(index)</th><th>${isObj ? Object.keys(entries[0][1]).join('</th><th>') : 'value'}</th></tr>`

    for(let i of entries) {
      res += `<tr><td>${i[0]}</td><td>${isObj ? Object.values(i[1]).join('</td><td>') : i[1]}</td></tr>`
    }

    tbody.innerHTML = res

    HTMLUtils.addTableSorting('#el_reports_list table')
    setTimeout(_=>{ 
      getEl('el_reports_list').children[0].tHead.children[0].children[1].click()
      getEl('el_reports_list').children[0].tHead.children[0].children[1].click()
    }, 0)
  },

  formatReportEffects(list) {
    return list
      .map(e => e.join(': ')).join(', ')
      .replace(/особое: /g, ':')
      .replace(/: /g, ' ')
  },

  listModuleObjs() {
    return Object.values(inverted.alltech)
      .filter(e => (e.type == "trapezoid" || e.type == 'trapezoid2' || e.type == 'fatarrow'))
  },

  Reports: {
   эффекты_тех() {
      let filter = [].concat(
        KEYWORDS.COLONY_PARAMS,
        KEYWORDS.ADDITIONAL_COLONY_PARAMS,
        KEYWORDS.SPECIAL_TECH_COST,
        KEYWORDS.DAMAGE_TYPES,
        KEYWORDS.MATERIALS,
        KEYWORDS.MODULE_PROPS,
        KEYWORDS.UNIT_TYPES,
        KEYWORDS.MILITARY_PARAMS,
        KEYWORDS.MILITARY_PARAMS_ADDITIONAL,
        ["Слоты", "Тип юнита", "Тип урона", "особое"],
      )
      let result = Object.values(inverted.alltech)
        .reduce( (acc, e) => {
          for(let i of e.effect) {
            const k = i[0]
            if(filter.includes(k)) continue

            if(!acc[k])
              acc[k] = {
                count: 0,
                sum: 0,
                list: [],
              }

              acc[k].count+=1
              acc[k].sum+=+i[1]

              acc[k].list.push(e.name)
          }

          return acc
        }, {})
      Analysis.reportTable(result)
    },

    особые_эффекты() {
      const result = Object.values(inverted.alltech)
        .reduce( (acc, e) => {
          for(let i of e.effect) {
            if(i[0] == KEYWORDS.ITS_SPECIAL) {
              acc[i[1]] = acc[i[1]] ? acc[i[1]]+1 : 1
            }
          }
          return acc
        }, {})
      Analysis.reportTable(result)
    },
  
    вообще_все_эффекты() {
      const result = Object.values(inverted.alltech)
        .reduce( (acc, e) => {
          for(let i of e.effect) {
            const k = i[0]
            if(!acc[k])
              acc[k] = {
                count: 0,
                sum: 0,
              }
              acc[k].count+=1
              acc[k].sum+=+i[1]
          }
          return acc
        }, {})
        Analysis.reportTable(result)
    },

    вообще_все_эффекты_подробно(){
      const result = Object.values(inverted.alltech)
        .reduce( (acc, e) => {
          for(let i of e.effect) {
            const k = i[0]
            if(!acc[k])
              acc[k] = {
                count: 0,
                sum: 0,
                list: [],
              }

              acc[k].count+=1
              acc[k].sum+=+i[1]
  
              acc[k].list.push(e.name)
          }

          return acc
        }, {})
        Analysis.reportTable(result)
    },

    эффекты_на_ТУ() {
      let TL = prompt('TL? 1-16/+')
      if(!TL) return
      if(TL == '+') TL = 16
      TL = +TL
      const techs = Object.values(inverted.alltech)
        .filter(e => e.lvl <= TL )
        .map( e => e.name )

      const result = Object.entries(User.countSummaryCostAndEffect(techs))
        .filter( e => [].concat(
          KEYWORDS.COLONY_PARAMS,
          // KEYWORDS.MATERIALS,
          KEYWORDS.TECH_EFFECTS,
        ).includes(e[0]))

      result.push( ['ВСЕГО', result
        .filter( e => KEYWORDS.COLONY_PARAMS.includes(e[0]))
        .reduce( (s,e)=> s + +e[1], 0 )
      ])

      const obj = Object.fromEntries(result)

      Analysis.reportTable(obj)
    },
  
    список_корпусов() {
      Analysis.reportTable(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => e.type == 'octagon')
          .map(e => [e.name, {
            "Тип": e.effect[0][1], 
            "Цена": +e.cost[0][1], 
            "Слоты": +e.effect[1][1],
            "Свойства": Analysis.formatReportEffects(e.effect.slice(2)),
          }])
      ))
    },

    список_модулей() {
      Analysis.reportTable(Object.fromEntries(
          Analysis.listModuleObjs()
          .map(e => [e.name, {
            Цена: e.cost[0][1],
            "Свойства": Analysis.formatReportEffects(e.effect),
          }])
      ))
    },

    список_зданий() {
      Analysis.reportTable(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => (e.type == "parallelogram"))
          .map(e => [e.name, {
            Цена: e.cost[0][1],
            "Свойства": Analysis.formatReportEffects(e.effect),
          }])
      ))
    },

    список_технологий_по_типу() {
      Analysis.reportTable(
        Object.values(inverted.alltech)
          .reduce( (acc, e) => {
            if(!acc[e.type])
              acc[e.type]=1
            else
              acc[e.type]+=1
            return acc
          }, {})
      )
    },

    // чтобы прикинуть сколько давать вкатившимся после начала игры
    суммарная_стоимость_проектов_сделанных_каждым_из_игроков() {
      const result = Object.fromEntries(
        Object.entries(window[VARS.PLAYERS_DATA_KEY])
        .map(e => [e[0], {
          'Кол-во':  e[1].buildings.length 
              + e[1].orbital.length 
              + Object.values(e[1].localProjs).flat().length 
              + Object.values(e[1].techTable).flat().length,
          'Цена': [].concat(
            e[1].buildings, 
            e[1].orbital,
            Object.values(e[1].localProjs).flat(),
            Object.values(e[1].techTable).flat(),
          )
          .map( e2 => inverted.alltech[e2] ? inverted.alltech[e2].cost[0][1] : null)
          .filter( e2 => e2 )
          .reduce((acc, i)=>acc + +i,0)
        }])
      )
      Analysis.reportTable(result)
    },

    // drawGraph() {

    // },

    countTechByCostParamType() {
      const sum = {}
      Object.values(inverted.alltech).forEach( e => {
        let paramType = VARS.colorToParameterType[e.borderColor]
        if(!sum[paramType]) {
          sum[paramType] = 1
        } else {
          sum[paramType] += 1
        }
      })
      Analysis.reportTable(sum)
    },
  }
}

const TreeView = {
  tspanHighlightOnClick() {
    for (const i of document.querySelectorAll('tspan')) {
      i.addEventListener('click', function(e) {
        getEl('highlight_css').innerHTML = `.${e.target.className.baseVal} { fill: orange }`
      })
    }
  },

  copyFirstLineOnClick() {
    for(let i of document.querySelectorAll('text')) {
      let el = i.children[0]
      el ? el.addEventListener('click', function() {
        navigator.clipboard.writeText(getEl(el.id).textContent)
      }) : 0
    }
  },
  
  getMinMax(arr, attr) {
    const t = arr.map(e => e[attr])
    return [Math.min.apply(null, t), Math.max.apply(null, t)]
  },
}

function drawTree(tree_name) {
  if (!tech[tree_name] || Object.keys(tech[tree_name]).length == 0) {
    parseTechIframe(tree_name)
  }
  
  if (techData.cache[tree_name].html) {
    svg.innerHTML = techData.cache[tree_name].html
    svg.setAttribute("viewBox", techData.cache[tree_name].viewBox)
    setTimeout(TreeView.tspanHighlightOnClick,1)
    setTimeout(TreeView.copyFirstLineOnClick,1)
    techData.currentTreeName = tree_name
    User.drawActiveUser(tree_name)
    return
  }

  TreeView.tspanHighlightOnClick()
  TreeView.copyFirstLineOnClick()

  svg.innerHTML = VARS.SVG_DEFAULT

  const values = Object.values(tech[tree_name]).concat(Object.values(techData.badCells[tree_name]))
  for (let i of values)
    draw.Node(tree_name, i)

  const x = TreeView.getMinMax(values, 'x')
    , y = TreeView.getMinMax(values, 'y')
    , PAD_MIN = 20
  const viewBox = (x[0] - PAD_MIN)
    + ' ' + (y[0] - PAD_MIN)
    + ' ' + (x[1] + 300 - x[0])
    + ' ' + (y[1] + 100 - y[0])
  svg.setAttribute("viewBox", viewBox)

  techData.cache[tree_name].html = svg.innerHTML
  techData.cache[tree_name].viewBox = viewBox

  techData.currentTreeName = tree_name
  User.drawActiveUser(tree_name)
}

const TechUtils = {
  createEffectsTable(effectsListArr) {
    return '<table><tbody><tr>' +
    effectsListArr.map(e => 
      `<td>${e[0]}</td>` +
      `<td>${e[1]==0?' ':`${+e[1]>=0?'&nbsp;':'-'}${e[1]}`}`
    ).join('</tr><tr>') +
    '</tr>'
  },
  byName(techName) {
    return inverted.alltech[techName.replace(/ \([^)]+\)/,'')]
  },
}

const User = {

  activePlayer: null,

  drawActiveUser(treeName) {
    if(!this.activePlayer) return
    parseDoc.drawTech(this.activePlayer, treeName)
  },

  /**
   * 
   * @param {string} treeName 
   * @param {string[]} tech_list 
   * @param {string[]} proj_list 
   * @returns 
   */
  highlightStudiedTech(treeName, tech_list, proj_list) {
    let res = []
    const targets = Array.from(svg.getElementsByTagName('rect'))
      .concat(Array.from(svg.getElementsByTagName('polygon')))
      .filter(e => typeof techData.badCells[treeName].find(a => a.id == e.id) === 'undefined')

    let list = tech_list.concat(proj_list)
    const bad = {
      enemy: list
        .filter( e => e.search(/\(.*чужое/) != -1)
        .map(e => e.replace(/ \([^)]+\)/,'')),
      broken: list
        .filter( e => e.search(/\(.*сломано/) != -1)
        .map(e => e.replace(/ \([^)]+\)/,'')),
    }
    log(bad)
    list = list.map(e => e.replace(/ \([^)]+\)/,''))

    for (let i of targets) {
      const name = tech[treeName][i.id].name
      const pos_tech = list.indexOf(name)
      if (pos_tech != -1) {
        if(bad.enemy.includes(name)) {
          i.setAttribute('fill', 'red')
          continue
        } else if(bad.broken.includes(name)) {
          i.setAttribute('fill', 'salmon')
          continue
        }
        res.push(i.id)
        list.splice(pos_tech, 1)
      } else if (tech[treeName][i.id].fullText.includes('базовое')) {
        continue
      } else {
        i.setAttribute('fill', 'lightgrey')
      }
    }

    // if (list.length > 0) log(`unrecognized tokens for ${treeName}: `, list)
  },

  /**
   * @param {*} treeName 
   * @param {*} techList 
   * @param {*} projList 
   */
  highlightAvaltech(treeName, techList, projList) {
    techList
      .concat(projList)
      .map( e => e.search('(сломано|неактивно)') == -1 ? e : '')
      .map( e => e.replace(/\([^)]+\)/,'').trim())
      .filter( e => e )
      .map(e => {
        const t = inverted.alltech[e]
        // if(t.req.length == 0) return t.id

        return t.next
      })
      .flat()
      .forEach( i => {
        if(getEl(i) && getEl(i).getAttribute('fill') == 'lightgrey') {
          getEl(i).setAttribute('fill','lightyellow')
        }
      })
  },

  countSummaryCostAndEffect(techList, userDataObj = null) {
    let data = techList
      .map( e => e.search('(сломано|неактивно)') == -1 ? e : '')
      .map( e => e.replace(/\([^)]+\)/,'').trim())
      .map( e => inverted.alltech[e] 
        ? inverted.alltech[e].effect
        : null
      )
      .filter( e => e )
    
    data = [].concat.apply([], data)

    if(userDataObj) {
      data = data.concat(userDataObj.startingFeature
        .map( i => i[0] === KEYWORDS.ITS_SPECIAL ? [':' + i[1], null] : [i[0], +i[1]])
      )
      if(userDataObj.uniqueResources) data = data.concat(userDataObj.uniqueResources
        .map( i => i[0] === KEYWORDS.ITS_SPECIAL ? [':' + i[1], null] : [i[0], +i[1]])
      )
      if(userDataObj.greatPeople) data = data.concat(userDataObj.greatPeople
        .map( i => i.effect.map( j => j[0] === KEYWORDS.ITS_SPECIAL ? [':' + j[1], null] : [j[0], +j[1]]))
        .flat()
      )
    }

    const result = {}
    for(let i of data) {
      if(i[0] === KEYWORDS.ITS_SPECIAL) {
        i[0] = ':' + i[1]
        i[1] = null
      }

      if(!result[i[0]]) 
        result[i[0]] = +i[1]
      else
        result[i[0]] += +i[1]
    }

    return result
  },

  countAllUserEffects(userDataObj) {
    if(!userDataObj) return null

    let startParams = userDataObj.colonyParams["Начальные параметры"].split('/')
      .map((e, i) => [KEYWORDS.COLONY_PARAMS[i], +e])
    startParams = Object.fromEntries(startParams)

    let data = 
      // local: 
      this.countSummaryCostAndEffect([].concat(
        userDataObj.buildings,
        userDataObj.orbital,
        Object.values(userDataObj.localProjs).flat(),
      // )),
      // global: User.countSummaryCostAndEffect([].concat(
        Object.values(userDataObj.techTable).flat(),
      ), userDataObj)
    // }

    for(let i in startParams) {
      if(data[i])
        data[i] += +startParams[i]
      else
        data[i] = +startParams[i]
    }

    const res = Object.entries(data)

    return res
  },

  /**
   * 
   * @param {[string, any][]} effectsListArr 
   * @returns 
   */
  createUserTechEffectsTable(effectsListArr) {
    effectsListArr = effectsListArr
      .filter( e => {
        return !KEYWORDS.SINGLE_TIME_EFFECTS.includes(e[0])
        && KEYWORDS.SINGLE_TIME_EFFECTS.filter(e2 => e[0].endsWith(e2)).length == 0
        && KEYWORDS.MODULE_PROPS.filter(e2 => e[0].endsWith(e2)).length == 0
        && !KEYWORDS.PLANET_PARAMS.includes(e[0])
        && e[0] !== KEYWORDS.UNIT_TYPES_KEYWORD
        && e[0] !== KEYWORDS.UNIT_SLOTS_KEYWORD
        && !e[0].startsWith(':?')
      })
      .sort()
      .sort( (a,b) => {
        if(KEYWORDS.COLONY_PARAMS.includes(a[0]) && !KEYWORDS.COLONY_PARAMS.includes(b[0])) return -1
        if(!KEYWORDS.COLONY_PARAMS.includes(a[0]) && KEYWORDS.COLONY_PARAMS.includes(b[0])) return 1
        return 0  
      }) 
    // t = [].concat(t.main, t.additional)

    return TechUtils.createEffectsTable(effectsListArr)
  },

  drawUserStat(playerName) {
    const data = User.countAllUserEffects(window[VARS.PLAYERS_DATA_KEY][playerName])

    getEl('el_reports_wrapper').hidden = false
    getEl('el_reports_home').hidden = true
    getEl('el_reports_list').innerHTML = `<br>
      <strong>Сводный отчет: ${playerName}</strong>
      <br>` + this.createUserTechEffectsTable(data)
  },
}



async function parseTechIframe(tree_name) {

  techData.graphmls[tree_name] = techData.graphmls[tree_name].getElementsByTagName('graph')[0]
  // graphmls[tree_name].getElementsByTagName('data')[0].remove()
  // graphmls[filename].getElementsByTagName('y:Fill').forEach(e => e.remove())
  // graphmls[filename].getElementsByTagName('y:BorderStyle').forEach(e => e.remove())
  techData.graphmls[tree_name].getElementsByTagName('y:LabelModel').forEach(e => e.remove())
  techData.graphmls[tree_name].getElementsByTagName('y:ModelParameter').forEach(e => e.remove())

  tech[tree_name] = {}
  stat[tree_name] = {}

  const FILL_COLOR = techData.graphmls[tree_name]
    .getElementsByTagName('y:ShapeNode')[0]
    .getElementsByTagName('y:Fill')[0].getAttribute('color')

  const BOUNDS = {}
  // Object.values(tech.Biology).map(e => e.x)
  // svg.setAttribute("viewBox", "-250 -250 500 750")

  Object.defineProperty(tech[tree_name], "props", {
    value: {
      BOUNDS,
      FILL_COLOR
    },
    writable: true,
    configurable: true,
    enumerable: false
  })

  for (let i of techData.graphmls[tree_name].getElementsByTagName('y:ShapeNode')) {
    try {
      const t = parseNode.node(tree_name, i)
      if (t.badCell) {
        techData.badCells[tree_name].push(t)
        continue
      }
      tech[tree_name][t.id] = t
    } catch (e) {
      console.warn(i, e)
    }
  }
  //get arrow connections
  for (let i of techData.graphmls[tree_name].getElementsByTagName('edge')) {
    if (i.getElementsByTagName('y:Arrows')[0].getAttribute('target') == 'none')
      continue

    let source = i.getAttribute('source')
    let target = i.getAttribute('target')

    try {
      tech[tree_name][target].req.push(source)
      tech[tree_name][source].next.push(target)
    } catch (e) {
      console.log(e, tree_name, target, tech[tree_name][target], source)
    }
  }

  inverted.tech[tree_name] = Object.fromEntries(
    Object.values(tech[tree_name]).map(e => [e.name, e.id])
  )

  draw.tech = tech
}

const parseDoc = {
  lastRaw: null,
  lastNodes: null,
  lastResult: null,
  async HTML(rawHTML) {
    var arr
    const html = Array.from((new DOMParser).parseFromString(rawHTML, 'text/html').body.childNodes[0].children)
    arr = html
      .filter(e => e.tagName !== 'BR')
      .map(({ tagName, innerText, children }) => 
        ({ tagName, innerText: innerText.trim(), el: children[0].parentElement }))

    if(arr.length < 3) {
      log("pretty sure it's not a proper google doc")
      return this.lastResult
    }

    // const CONTENT_TAGS = ['DIV', 'P', 'UL']
    let usersData = {}
    let usersRes = {}
    let interm = {
      user: {},
      planet: {},
    }
    let last = {
      H: null,
      user: null,
      planet: null,
    }
    for(let i in arr) {
      let e = arr[i]
      if(e.tagName == 'H1') {
        if(last.user) {
          // res[last.planet] = interm.user
          usersData[last.user] = interm.user
        }
        last.user = e.innerText
        interm.user = {}
        continue
      }
      if(e.tagName.match(/H\d/)) {
        last.H = e.innerText
        continue
      }
      interm.user[last.H] = e.el
    }
    usersData[last.user] = interm.user
    this.lastNodes = usersData

    const templateName = '[Персонаж]'
    for(let username in usersData) {
      if(username == templateName) {
        log('template name, skip:', templateName)
        continue
      }

      usersRes[username] = parseDoc.playerHTML(username, usersData[username])

      if (!getEl(username) || !getEl(username).checked) {
        log(username, 'not marked to draw, skipping')
        continue
      }

      this.drawAndSaveTechs(username, usersRes[username])
    }

    return usersRes
  },
  
  async file() {
    let raw
    const MIME_HTML = 'text/html'
    const rawClipboardObj = (await navigator.clipboard.read())[0]
  
    // eslint-disable-next-line no-constant-condition
    if (rawClipboardObj.types.includes(MIME_HTML)) {
      raw = await rawClipboardObj.getType(MIME_HTML).then(e => e.text())
      this.lastResult = await parseDoc.HTML(raw)
    } else {
      raw = await rawClipboardObj.getType('text/plain').then(e => e.text())
      console.warn("can't parse plaintext: deprecated and removed")
      // this.lastResult = parseDoc.text(raw)
    }
    this.lastRaw = raw
    parseDoc.GDocToJS()
  },

  async redoLast() {
    this.lastResult = await parseDoc.HTML(this.lastRaw) 
  },

  playerHTML(playerName, obj) {
    /**
     * @param {string} str 
     * @returns {string[]}
     */
    const splitFilter = (str, treeRuName) => {
      let res = str.split(',').map(e => e.trim()).filter(e => e)

      if(treeRuName !== 'Особые') {
        res = res.filter( e => e.replace(/\([^)]+\)/, '').trim() in inverted.alltech 
          ? true 
          : console.warn(this.playerHTML.name, e)
        )
      }

      return res
    }
    /**
     * there is usually the sixth block, "Specials"
     * @param {HTMLTableElement} el 
     * @returns 
     */
    const tech5TableToObj = el =>  
      Object.fromEntries(
        Array.from(el.rows)
        .map(e=>[VARS.TREELIST_RU2EN[e.children[0].innerText], splitFilter(e.children[1].innerText, e.children[0].innerText)])
      )

    let colonyParams = Array.from(obj.Параметры.children[0].rows)
      .slice(1)
      .map(e => [e.children[0].innerText.trim(),e.children[1].innerText.trim()])
      colonyParams = Object.fromEntries(colonyParams)

    let additionalParamsRaw = Array.from(obj['Дополнительные параметры'].children[0].rows)
      .map(e => Array.from(e.children))
    let ak = [].concat(additionalParamsRaw[0],additionalParamsRaw[2],additionalParamsRaw[4]).map(e=>e.innerText.trim().toLowerCase())
    let av = [].concat(additionalParamsRaw[1],additionalParamsRaw[3],additionalParamsRaw[5]).map(e=>e.innerText.trim())
    let additionalParams = {}
    while(ak.length) {
      let nextK = ak.pop()
      let nextV = av.pop()
      if(!nextK) continue
      additionalParams[nextK] = nextV
    }

    const startingFeature = parseNode.effects(
      obj['Данные экспедиции'].children[0].rows[2].children[1].innerText.replace(/^[^-]+- ?/,''),
      {treeName: null, name: null}
    )

    let greatPeople = Array.from(obj['Великие люди'].children[0].rows)
    greatPeople.splice(0,1)
    greatPeople = greatPeople
      .map(e=>Array.from(e.children))
      .map(e2=>({name:e2[0].innerText, lvl: +e2[1].innerText, effect: e2[2].innerText.replace(/^.*-/,'').trim()}))
      .filter(e => e.lvl > 0)
    greatPeople.forEach( e => {
        e.effect = e.effect.replace('Х',e.lvl)
        e.effect = parseNode.effects(e.effect,{treeName: null, name: playerName + ' великие люди'})
      })

    let uniqueResources = Array.from(obj['Уникальные ресурсы'].children[0].rows)
    uniqueResources.splice(0,1)
    if(uniqueResources.length == 1 && uniqueResources[0].innerText == '') uniqueResources = null
    else {
      uniqueResources = parseNode.effects(
        uniqueResources.map( e => e.children[3].innerText).join(','),
        {treeName: null, name: playerName + ' уникальные ресурсы'}
      )
    }

    const data = {
      startingFeature,
      techTable: tech5TableToObj(obj['Изученные технологии'].children[0]),
      colonyParams,
      additionalParams,
      buildings: [].concat(
        splitFilter(obj.Здания.children[0].rows[0].children[1].innerText),
        splitFilter(obj.Здания.children[0].rows[1].children[1].innerText),
      ),
      orbital: splitFilter(obj.Здания.children[0].rows[2].children[1].innerText),
      greatPeople,
      uniqueResources,
      localProjs: tech5TableToObj(obj['Планетарные проекты'].children[0]),
    }
    // log(Object.values(data).map(e=> e && e.innerHTML ? e.innerHTML.replace(/ style="[^"]+"/g,'') : e))

    return data
  },

  drawTech(playerName, treeName) {
    if(!this.lastResult) return
    const data = this.lastResult[playerName]

    let projList = [].concat(data.buildings, data.orbital, data.localProjs[treeName])
    User.highlightStudiedTech(treeName, data.techTable[treeName], projList)
    User.highlightAvaltech(treeName, data.techTable[treeName], projList)

    User.activePlayer = playerName
  },

  drawAndSaveTechs(playerName, data) {
    for(let i of TREELIST) {
      drawTree(i)
      let projList = [].concat(data.buildings, data.orbital, data.localProjs[i])
      User.highlightStudiedTech(i, data.techTable[i], projList)
      User.highlightAvaltech(i, data.techTable[i], projList)
      savingOps.saveSvgAsPng(svg, `${playerName} ${i}.png`)
    }
  },

  GDocToJS() {
    if(!this.lastResult) {
      log('nothing to save')
      return
    }
    savingOps.saveFile('playersData.js', `var ${VARS.PLAYERS_TIMESTAMP_KEY} = '${(new Date()).toJSON()}'`
    +`\nvar ${VARS.PLAYERS_DATA_KEY} = ` + JSON.stringify(this.lastResult, null, 2))
  },
}

// eslint-disable-next-line no-unused-vars
const playerPost = {
  prompt() {
    const p = prompt('player post here')
    if(!p) return
    playerPost.parse(p)
  },
  extractRolls(text) {
    const res = [...text.matchAll(/([^\n]*)\d+d10: \((\d+(?: \+ \d+){0,20})\)/g)]
      .map(e => ({ text: (e[1].length ? e[1] : '').trim(), rolls: e[2], rawRolls: e[2] }))
      .map(({text, rolls, rawRolls} ) => ( { text: text.replace(/\([^)]+\)/g,'').replace(/^[^а-яёa-z]+/gi,''), rolls, rawRolls }))
    return res
  },
  parse(text) {
    let requests = this.extractRolls(text)

    for(let i of requests) {
      let rolls = {
        sum: 0,
        critfails: 0,
        wins: 0,
        critwins: 0,
        delta: 0
      }
      for(let j of i.rolls.split(' + ')) {
        rolls.sum += 1
        if(j == '1') rolls.critfails += 1
        if(j == '10') {
          rolls.critwins += 1
          continue
        }
        if(+j>4) rolls.wins += 1
      }
      rolls.delta = rolls.critwins * 2 + rolls.wins
      i.rolls = rolls
    }

    let bonusThings = [...text.matchAll(/\+\+([^+]+)\+\+/g)].map( e => ({ text: e[1], rolls: {
      sum: null,
      critfails: null,
      wins: null,
      critwins: null,
      delta: null,
    }, rawRolls: null }))
    requests = requests.concat(bonusThings)
    const rollsTotal = requests.reduce( (sum, e) => sum + +e.rolls.sum,0)

    getEl('el_selected_tech_wrapper').hidden = false
    getEl('el_selected_tech_list').innerHTML = `<table>
    <thead>
      <th>${['Технология', 'Цена', "КПровалы", "Успехи", "КУспехи", "Брош.", "Дельта"].join('</th><th>')}</th>
      <th 
        onclick="this.parentNode.parentNode.parentNode.tBodies[0].appendChild(this.parentNode.parentNode.parentNode.tBodies[0].rows[0].cloneNode(true))">
      <button>+</button>
      </th>
    </thead>
    <tbody>
    <tr>
    ${requests.map(e => '<td>' + [e.text, '', e.rolls.critfails, e.rolls.wins, e.rolls.critwins, e.rolls.sum, e.rolls.delta].join('</td><td>') + '</td>' + 
      '<td><button onclick=this.parentNode.parentNode.remove()>X</button></td>')
    .join('</tr><tr>')}
    </tr>
    </tbody><tbody>
    <tr>
      <td colspan=2>ВСЕГО</td>
      <td>${requests.reduce( (sum, e) => sum + +e.rolls.critfails,0)}</td>
      <td>${requests.reduce( (sum, e) => sum + +e.rolls.wins,0)}</td>
      <td>${requests.reduce( (sum, e) => sum + +e.rolls.critwins,0)}</td>
      <td>${rollsTotal}</td>
      <td></td>
    </tr>
    <tr>
      <td colspan=2>СТЕПЕНЬ ОТКАЗА ТЕОРВЕРА</td>
      <td>${(requests.reduce( (sum, e) => sum + +e.rolls.critfails,0)/rollsTotal/0.1*100-100).toFixed(0)}%</td>
      <td>${(requests.reduce( (sum, e) => sum + +e.rolls.wins,0)/rollsTotal/0.6*100-100).toFixed(0)}%</td>
      <td>${(requests.reduce( (sum, e) => sum + +e.rolls.critwins,0)/rollsTotal/0.1*100-100).toFixed(0)}%</td>
    </tr>
    
    </tbody></table>`

    // log(requests)
    setTimeout(_ => HTMLUtils.addTableSorting('#el_selected_tech_list table'), 50)
    setTimeout(this.countTechStudyResult, 100)
  },

  countTechStudyResult() {
    const pos = {
      name: 0,
      price: 1,
      critfails: 2,
      wins: 3,
      critwins: 4,
      sum: 5,
      delta: 6,
    }

    let techList = Array.from(getEl('el_selected_tech_list').children[0].tBodies[0].rows)
      .map(e => {
        if (!e.children[pos.name]) return null

        let result = null

        e.style.backgroundColor = ''
        e.children[pos.name].style.backgroundColor = ''
        e.children[pos.critfails].style.backgroundColor = ''
        e.children[pos.critwins].style.backgroundColor = ''
        e.children[pos.delta].style.backgroundColor = ''
        e.children[pos.name].title = ''

        if (+e.children[pos.critfails].innerText > 0) {
          e.children[pos.critfails].style.backgroundColor = 'tomato'
        }

        if (+e.children[pos.critwins].innerText > 0) {
          e.children[pos.critwins].style.backgroundColor = 'lawngreen'
        }

        const sum = +e.children[pos.wins].innerText + +e.children[pos.critwins].innerText * 2

        if (inverted.alltech[e.children[pos.name].innerText]) {

          e.children[pos.name].style.backgroundColor = inverted.alltech[e.children[pos.name].innerText].fill

          if (e.children[pos.price].innerText.length == 0) {
            e.children[pos.price].innerText = inverted.alltech[e.children[pos.name].innerText].cost[0][1]
          }

          result = e.children[pos.name].innerText
        } else {
          console.log('Не найдено', e.children[pos.name].innerText)
          e.children[pos.name].style.backgroundColor = 'cyan'
          e.children[pos.name].title = 'Название технологии не найдено'
          result = null
        }

        if (sum < +e.children[pos.price].innerText
          && e.children[pos.wins].innerText !== ''
        ) {
          e.style.backgroundColor = 'goldenrod'
          result = null
        }
        e.children[pos.delta].innerText = sum - +e.children[pos.price].innerText
        if(+e.children[pos.delta].innerText > 1) {
          e.children[pos.delta].style.backgroundColor = 'aquamarine'
        }
        return result
      })
      .filter(e => e)
    
    // getEl('el_selected_tech_list').children[0].tBodies[1].rows[0].children[pos.delta-1].innerText = summaryDelta
    const result = User.countSummaryCostAndEffect(techList)

    getEl('el_tech_result_list').innerHTML = 
      User.createUserTechEffectsTable(Object.entries(result))

    const byType = {
      rectangle: [],
      parallelogram: [],
      hexagon: [],
    }

    techList.forEach(e => {
      if (['hexagon', 'rectangle', 'parallelogram'].includes(inverted.alltech[e].type))
        byType[inverted.alltech[e].type].push(e)
    })

    getEl('el_tech_by_type_list').innerHTML = [
      ['Технологии', byType.rectangle],
      ['Здания', byType.parallelogram],
      ['Проекты', byType.hexagon],
    ].map(e =>
      `<strong>${e[0]}</strong>
      <div>
        ${e[1]
          .map( e2 => 
            `<span onclick="navigator.clipboard.writeText(this.textContent); this.style.backgroundColor='darkgrey'"
            >${e2}, </span>
            <span style="background-color:${inverted.alltech[e2].fill}">
              ${VARS.fill2TreeType[inverted.alltech[e2].fill]}
            </span><br>`)
          .join('')
        }
      </div>`
    ).join('')
  }
}

class TTechObject {
  id = ''
  type
  treeName = ''
  borderColor
  name
  lvl = 0
  cost = []
  effect = []
  req = []
  next = []
  fullText = ''
  title = ''
  x
  y
  h
  w
  fill
}

var KEYWORDS = {
  ITS_SPECIAL: 'особое',
  ALL_RIGHT: 'особое:$1',
  COLONY_PARAMS: [
    'Наука'
    , 'Производство'
    , 'Общество'
    , 'Свободный'
  ],
  ADDITIONAL_COLONY_PARAMS:[
    "осуждение",
    "волнения",
    "непривычная среда",
    "чуждая среда",
  ],
  SPECIAL_TECH_COST: [
    "затраты",
    "специалисты",
    "ресурсы",
  ],
  PLANET_PARAMS: [
    "Вода",
    "Гористость",
    "Ресурсы",
    "Отказ",
  ],
  // TECH_PROPS: [],
  MATERIALS: [
    // 1 ряд
    "Добыча",
    "Редкие металлы",
    "Редк. металлы",
    "Трансураны",
    // 2 ряд
    "Наноматериалы",
    "Антиматерия",
    // 3 ряд
    "Стазокерамика",
    "Экзотическая материя",
    "Экзотматерия",
    // 4 ряд
    "Нейтроний",
    "Гиперплазма",
    //особые
    "Образцы",
    "Экзоты",
    "Аномалия"
  ],
  TECH_EFFECTS: [
    // индустрия
    "Планетарная разведка",
    "Солнце",
    "Строительство",
    "Пуски",
    "Орбита",
    "Астроинженерия",
    // биология и терраформинг
    "Терраформинг",
    "Генные модификации",
    "Адаптация",
    "Сверхадаптация",
    // социальные
    "Дипломатия",
    "Шпионаж",
    "Контршпионаж",
    "Пропаганда",
    "Полиция",
    "Устранение последствий",
    "Осуждение",
    "Доверие",
    // военные
    "Конверсия",
    "Ремонт",
    "Ремонт (?:армий|флотов)",
    "Бомбардировка",
    'Скорость FTL',
  ],
  TECH_COST_MODS: [
    'базовое',
    'суперпроект',
    'астропроект',
    'почва',
    'первый контакт',
    'черная дыра',
    'электростанция',
  ],
  TECH_UNIQUE_EFFECTS: [
    'электростанция',
    'неуязвимость к обычным болезням',
    'взлом систем связи невозможен',
    'при подавлении армией',
    'в военное время',
    'на нечуждых планетах',
    'в системе',
    'вне родной системы',
  ],
  SINGLE_TIME_EFFECTS: [
    "\\?",
    'Временно',
    'Великий человек',
    'выдаётся при высадке',
    'выдаётся на старте',
    'немедленно',
    'позволяет перебросить куб на Ресурсы \\(только вверх\\)',
  ],
  TECH_EFFECT_MODS: [
    'наземное',
  ],
  MILITARY_PARAMS: [
    "Атака",
    "Защита",
    "Скорость",
  ],
  MILITARY_PARAMS_ADDITIONAL: [
    "Уклонение",
    "Щит",
  ],
  UNIT_SLOTS_KEYWORD: 'Слоты',
  UNIT_TYPES_KEYWORD: 'Тип юнита',
  UNIT_TYPES: Object.keys(VARS.hulls),
  DAMAGE_TYPES: [
    "био",
    "рад",
    "нано",
    "странглет",
  ],
  MODULE_NUM_PROPS: [
    "Полёт",
    'Защита колонии',
    'планетарный щит',
    'Мины',
    'Гарантированная защита',
    'Двигатель',
    "Регенерация",
  ],
  MODULE_PROPS: [
    "ДУ",
    "роботы",
    "гигеры",
    "нет FTL",
    "ужас",
    "ракеты",
    "ЭМИ",
    "ББ",
    //!!!
    "осадное",
    "экранирование",
    "FTL",
    'пред-FTL',
    'автономность'
  ],
}

const parseNode = {
  /**
   * @param {TTechObject} t 
   */
  costAndEffects(t) {
    const studyCubesType = VARS.colorToParameterType[t.borderColor]
    const cost = this.cost(t.cost, t, studyCubesType)
    const effect = this.effects(t.effect, t)

    return [cost, effect]
  },

  cost(costRaw, {treeName, name}, studyCubesType) {
    const cost = costRaw
      .split(',')
      .map(e => e
        .trim()
        .replace(/:/g, VARS.DISABLE_PARSE_IMMUNITY ? '' : KEYWORDS.ITS_SPECIAL+':')
        .replace(/ {2,}/g, ' ')
        .replace(new RegExp(`^(${KEYWORDS.TECH_COST_MODS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        .replace(/^(\d+)$/i, studyCubesType + ':$1')
        .replace(/^(\d+) этапа$/i, 'Этапы:$1')
        .replace(/^любая тех. (.+)$/i, 'Любая технология:$1')
        .replace(/^(\d+) слот(а|ов)$/i, 'Слоты:$1')
        .replace(/^тех. (.+)$/i, 'Технология:$1')
        .replace(new RegExp(`^(${KEYWORDS.SPECIAL_TECH_COST.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.ADDITIONAL_COLONY_PARAMS.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MATERIALS.join('|').toLowerCase()}) ?\\((\\d+)\\)$`), '$1:$2')
        .split(':')
      )

    if (cost.some(e => e.length < 2)) {
      console.warn('bad cost', treeName, name, cost, costRaw)
      techData.badTechCount++
    }

    return cost
  },

  effects(effectRaw, {treeName, name} = {treeName: null, name: null}) {
    if(!effectRaw.length) return []

    const effect = effectRaw
      .split(',')
      .map(e => e
        .trim()
        .replace(/:/g, VARS.DISABLE_PARSE_IMMUNITY ? '' : KEYWORDS.ITS_SPECIAL + ':')
        .replace(/ {2,}/g, ' ')
        .replace(/^(Общество|Производство|Наука) ([+-]\d+)$/, '$1:$2')
        .replace(/^\+?(\d+) свободн(ый|ых) куба?$/i, 'Свободный:$1')
        // временный бонус
        .replace(/^на (\d+) хода?/i, 'Временно:$1')
        // вещества
        .replace(new RegExp(`^(${KEYWORDS.MATERIALS.join('|')}) \\+(\\d+)`), '$1:$2')
        // параметры планеты
        .replace(new RegExp(`^(${KEYWORDS.PLANET_PARAMS.join('|')}) \\+?(\\d+)`), '$1:$2')
        // Эффекты и бонусы:
        .replace(new RegExp(`^(${KEYWORDS.TECH_EFFECTS.join('|')}) ([+-]?\\d+)$`), '$1:$2')
        // Плюсы к научным веткам
        .replace(/^Вет(?:ка|вь) "?([^ "]+)"? \+?(\d+)/i, 'Исследования (ветка "$1"):$2')
        .replace(/^\+?(\d+) (?:куба? )?к вет(?:ке|ви) "([^"]+)"/i, 'Исследования (ветка "$2"):$1')
        // армии и звездолёты
        .replace(new RegExp(`^(${KEYWORDS.UNIT_TYPES.join('|')})$`), KEYWORDS.UNIT_TYPES_KEYWORD+':$1')
        // .replace(/(армия|$/, 'Тип отряда:$1')
        .replace(/(\d+) слот(?:а|ов)?$/i, KEYWORDS.UNIT_SLOTS_KEYWORD + ':$1')
        .replace(/(\d+) слота? (МО|ПКО)$/i, KEYWORDS.UNIT_SLOTS_KEYWORD + '($2):$1')
        // модули и оружие, глобальные военные эффекты
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) ([+-]?\\d+)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS_ADDITIONAL.join('|')}) ([+-]?\\d+)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) (армий|флотов) ([+-]?\\d+)$`), '$1 $2:$3')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS_ADDITIONAL.join('|')}) (армий|флотов) ([+-]?\\d+)$`), '$1 $2:$3')
        .replace(/^\+?(\d+) очк(?:о|а|ов)? распределения (армиям|флотам)? ?/, 'Очки распределения $2:$1')
        .replace(new RegExp(`^(${KEYWORDS.MODULE_NUM_PROPS.join('|')}) \\+?(\\d+)$`), '$1:$2')
        .replace(/^Создание (армий|флотов|(?:наземных|космических) баз|хабитатов) \+?(\d+)/, 'Создание $1:$2')
        // типы урона, эффекты оружия
        .replace(new RegExp(`^(${KEYWORDS.DAMAGE_TYPES.join('|')})$`), KEYWORDS.ALL_RIGHT)
        .replace(new RegExp(`^(${KEYWORDS.MODULE_PROPS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        // эффекты, дающие великих людей
        .replace(/^\+?(\d+) велик(?:ий|их) (?:человека?)$/i, 'Великий человек:$1')
        .replace(/^\+?(\d+) велик(?:ий|их) (?:человека?)? ?(.+)?$/i, 'Великий человек ($2):$1')
        // базовые вещи
        .replace(new RegExp(`^(${KEYWORDS.TECH_UNIQUE_EFFECTS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        .replace(new RegExp(`^(${KEYWORDS.SINGLE_TIME_EFFECTS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        .replace(new RegExp(`^(${KEYWORDS.TECH_EFFECT_MODS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        // особый эффект - победа
        .replace(/(победа)/, KEYWORDS.ALL_RIGHT)
        .split(':')
      )

    if (effect.some(e => e.length < 2)) {
      // it is non-split => not recognized string
      techData.badTechCount++
      console.warn(treeName, name, effect.filter(e => e.length < 2)[0], effectRaw)
    }

    return effect
  },

  /**
   * 
   * @param {*} filename 
   * @param {*} i 
   * @returns {TTechObject | null}
   */
  node(filename, i) {

    const sepDifficulty = 'Сложность:'
    const sepEffect = 'Эффект:'

    const descrDataEl = i.parentElement.parentElement.querySelector('data[key="d5"]')
    let title = null
    if(descrDataEl) {
      title = descrDataEl.innerHTML.replace(/(<!\[CDATA\[|\]\]>)/g,'')
    }

    const nlabel = i.getElementsByTagName('y:NodeLabel')[0]
    const fullText = nlabel.innerHTML
      .split('<')[0]
      // .replace(/<.+$/g,'')
      .trimRight()
    let nodeText = fullText
      .replace(/\n/g, ' ')
      .trim()

    const borderColor = i.getElementsByTagName('y:BorderStyle')[0].getAttribute('color')

    const t = {
      id: i.parentElement.parentElement.id
      , type: i.getElementsByTagName('y:Shape')[0].getAttribute('type')
      , treeName: filename
      , borderColor
      , name: ''
      , cost: []
      , effect: []
      , req: []
      , next: []
      , fullText
      , title

      , x: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('x')).toFixed(2)
      , y: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('y')).toFixed(0)
      , h: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('height')).toFixed(2)
      , w: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('width')).toFixed(2)

      , fill: i.getElementsByTagName('y:Fill')[0].getAttribute('color')

    }

    // this is not tech node
    if (nlabel.getAttribute('fontSize') != 12) {
      t.badCell = true
      t.fontSize = nlabel.getAttribute('fontSize')

      if(t.fullText.length <= 2) {
        // its number, lessen width
        t.w = t.w/1.4
        t.x = +t.x + +t.w - 5
      }
      t.nodeCenter = {
        x: ++t.x + ++t.w / 2
        , y: ++t.y + ++t.h / 2
      }
      return t
    }

    if (nodeText.indexOf(sepDifficulty) == -1 || nodeText.indexOf(sepEffect) == -1) {
      console.warn(nodeText)
      return null
    }

    const split1 = nodeText.split(sepDifficulty)
    const name = split1[0].trim()
    const costRaw = split1[1].split(sepEffect)[0].trim()
    const effectRaw = split1[1].split(sepEffect)[1].trim()

    t.name = name
    t.cost = costRaw
    t.effect = effectRaw

    t.nodeCenter = {
      x: ++t.x + ++t.w / 2
      , y: ++t.y + ++t.h / 2
    }

    t.textCoords = {
      x: t.x
      , y: ++t.y + ++t.h / 2
    }

    return t
  },
}

var statAllEffects = {}

function doNodeStat(filename, t) {
  var effects = t.effect,
    cost = t.cost

  if (!stat[filename][t.y]) {
    /*
      sum is sum of all param cubes avaliable,
      cost is full cost of level, 
      costClear is param-tech-only cost
    */
    stat[filename][t.y] = { Общество: 0, Производство: 0, Наука: 0, Свободный: 0, cost: 0, costClear: 0, sum: 0 }
  }

  for (let effect of effects) {
    if(!statAllEffects[effect[0]]) {
      statAllEffects[effect[0]] = 1
    } else {
      statAllEffects[effect[0]] += 1
    }

    if(!KEYWORDS.COLONY_PARAMS.includes(effect[0])) continue

    stat[filename][t.y][effect[0]] += +effect[1]

    stat[filename][t.y].sum += +effect[1]
  }

  if(!KEYWORDS.COLONY_PARAMS.includes(effects[0][0])) return
  
  let cost_facto = +cost[0][1]
  if (cost[1] && cost[1][0] == 'Этапы')
    cost_facto *= +cost[1][1]
  if (effects[0][1] != 0) { //its actual data
    stat[filename][t.y].costClear += cost_facto
  }
  stat[filename][t.y].cost += cost_facto
}

function extractParam(param, fuckMilitary = true) {
  // let t={} //cost of cubes stat
  // for (i in tech) t[i]= tech[i].stat
  let list = {}
  const iter = fuckMilitary ? VARS.TREELIST_NOMIL : TREELIST
  for (let i of iter) {
    list[i] = []
    let arr = Object.keys(stat[i]).sort((a, b) => a - b)
    //shift every and create a table
    for (let j in arr) {
      list[i].push(stat[i][arr[j]][param])
    }
  }
  return list
}

function listParam(param = 'costClear', fuckMilitary = true) {
  //delete stat['Military']
  const t = extractParam(param, fuckMilitary)
  let res = param + '\n'
  for (let i in t) {
    res += i + '\t'
  }
  res = res.slice(0, -1)
  res += '\n'
  // eslint-disable-next-line no-unused-vars
  for (let i in range(16)) {
    for (let j in t) {
      res += (t[j].shift() || 0) + '\t'
    }
    res = res.slice(0, -1)
    res += '\n'
  }
  return res
}

function listAllWithoutMilitary() {
  //delete stat['Military']

  let list = {}
  let res = []

  for (let i of KEYWORDS.COLONY_PARAMS) {
    list[i] = listParam(i).split('\n')
    for (let j in list[i]) {
      if (typeof res[j] == "undefined")
        res[j] = list[i][j] + '\t'
      else
        res[j] += list[i][j] + '\t'
    }
  }
  return res.map(e => e.slice(0, -1)).join('\n').replace('Общество	Производство	Наука	Свободный', 'Общество				Производство				Наука				Свободный')
}

const UnitCreator = {
  open() {
    getEl('el_uc_hull').innerHTML = Object.keys(VARS.hulls).map( e => `<option value="${e}">${e} - ${VARS.hulls[e]}</option>`)
    this.fillModulesList()
    HTMLUtils.openModal('unitcreator')
  },
  fillModulesList() {
    getEl('el_uc_modules_datalist').innerHTML = Analysis.listModuleObjs()
      .map( e => `<option value="${e.name}">${e.effect}</option>`)
    getEl('el_uc_modules_search').onchange = e => {
      // if(!e.isTrusted) return 
      log(e)
      getEl('el_uc_modules').value += getEl('el_uc_modules_search').value + '\n'
      getEl('el_uc_modules_search').value = ''
    }
  },
  createUnit(hullName, modulesList = [], startParams = []) {
    const hullEffect = parseNode.effects(VARS.hulls[hullName])
    
    const sum = User.countSummaryCostAndEffect(modulesList, { startingFeature: hullEffect })
    KEYWORDS.MILITARY_PARAMS.forEach(e => !sum[e] ? sum[e] = 0 : null )
    return sum
  },
  createUnitTable(effectsObj) {
    log(effectsObj)
    const str = '<table>'
        + '<tbody><tr>' +
        KEYWORDS.MILITARY_PARAMS.map(e => 
          `<td>${e}</td>` +
          `<td>${effectsObj[e]}`
        ).join('</tr><tr>') +
        '</tr></tbody></table>'

      + '<table><tbody><tr>' +
      [].concat(KEYWORDS.MILITARY_PARAMS_ADDITIONAL, KEYWORDS.MODULE_NUM_PROPS)
        .filter( e => effectsObj[e])
        .map(e => 
          `<td>${e}</td>` +
          `<td>${effectsObj[e]}`
        ).join('</tr><tr>') +
        '</tr></tbody></table>'

      + '<table><tbody><tr>' +
      [].concat(KEYWORDS.DAMAGE_TYPES, KEYWORDS.MODULE_PROPS)
        .filter( e => e in effectsObj || `:${e}` in effectsObj)
        .join(', ') +
        '</tr></tbody></table>'
    
    return str
  },
  processInput() {
    const hull = getEl('el_uc_hull').value
    const unit = this.createUnit(hull)
    getEl('el_uc_unit').innerHTML = this.createUnitTable(unit)
  },
  close() {
    HTMLUtils.closeModal('unitcreator')
  },
}

const savingOps = {
  saveAllTechAsPng() {
    for (const i of document.querySelectorAll('#tech_tree_buttons button')) {
      i.click()
      savingOps.saveSvgAsPng(svg, `${i.innerText}.png`)
    }
  },
  openAsPng() {
    // FIXME
  },
  // eslint-disable-next-line no-unused-vars
  saveSVG(filename) {
    savingOps.saveFile(filename + '.svg', svg.outerHTML)
  },
  saveFile(filename, data) {
    var file = new Blob([data], { type: 'text' })
    var a = document.createElement("a"),
      url = URL.createObjectURL(file)
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 0)
  },
  //heya SO https://stackoverflow.com/questions/3975499/convert-svg-to-image-jpeg-png-etc-in-the-browser
  copyStylesInline(destinationNode, sourceNode) {
    var containerElements = ["svg", "g"]
    for (var cd = 0; cd < destinationNode.childNodes.length; cd++) {
      var child = destinationNode.childNodes[cd]
      if (containerElements.indexOf(child.tagName) != -1) {
        savingOps.copyStylesInline(child, sourceNode.childNodes[cd])
        continue
      }
      var style = sourceNode.childNodes[cd].currentStyle || window.getComputedStyle(sourceNode.childNodes[cd])
      if (style == "undefined" || style == null) continue
      for (var st = 0; st < style.length; st++) {
        child.style.setProperty(style[st], style.getPropertyValue(style[st]))
      }
    }
  },
  
  triggerDownload(imgURI, fileName) {
    var evt = new MouseEvent("click", {
      view: window,
      bubbles: false,
      cancelable: true
    })
    var a = document.createElement("a")
    a.setAttribute("download", fileName)
    a.setAttribute("href", imgURI)
    a.setAttribute("target", '_blank')
    a.dispatchEvent(evt)
  },
  
  saveSvgAsPng(svg, fileName) {
    var copy = svg.cloneNode(true)
    savingOps.copyStylesInline(copy, svg)
    var canvas = document.createElement("canvas")
    var bbox = svg.getBBox()
    canvas.width = bbox.width
    canvas.height = bbox.height
    var ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, bbox.width, bbox.height)
    var data = (new XMLSerializer()).serializeToString(copy)
    var DOMURL = window.URL || window.webkitURL || window
    var img = new Image()
    var svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" })
    var url = DOMURL.createObjectURL(svgBlob)
    img.onload = function () {
      ctx.drawImage(img, 0, 0)
      DOMURL.revokeObjectURL(url)
      if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
        var blob = canvas.msToBlob()
        navigator.msSaveOrOpenBlob(blob, fileName)
      }
      else {
        var imgURI = canvas
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream")
        savingOps.triggerDownload(imgURI, fileName)
      }
      
      try {
        document.removeChild(canvas)
      } catch (error) {}
    }
    img.src = url
  },
}


