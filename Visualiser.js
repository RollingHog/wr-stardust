// common.js
/// <reference path="./src/common.js"/>
/* global
getEl qs
log warn
PLAYERS_DATA_KEY
DATA__OLD_TECH DATA__OLD_TECH_TIME
capitalizeFirstLetter rgbToHex
makeElDraggable
hotkeysLib
*/

// draw.js
/// <reference path="./src/draw.js"/>
/* global
  draw
*/

//rules.js
/// <reference path="./src/rules.js"/>
/* global
TREELIST FILL_2_TREE_TYPE
NODE_TYPE NODET_2_RU TREE_TYPE_2_FILL
rules countPlanetRawMisery
*/

const VERSION = '1.2.0'
console.log(VERSION)

// /**
// //  * @typedef {(string | number)} effValue
// */
// * @typedef {string} effKey THIS SHIT IS BROKEN AF AND IT BREAKS AUTO-TYPING IN VS CODE NO IDEA WHY DON'T USE WITH EFFVALUE

const range = (cnt) => '0'.repeat(cnt)

/** constants; empty ones usually filled later */
const VARS = /** @type {const} */({
  isInit: false,
  IS_LOCAL: window.location.protocol === 'file:',
  DISABLE_PARSE_IMMUNITY: false,
  PLAYERS_TIMESTAMP_KEY: 'DATA__PLAYERS_TIMESTAMP',
  PLAYERS_TURN_KEY: 'DATA__PLAYERS_TURN',
  PLAYERS_DATA_KEY,
  TREELIST_RU2EN: {
    'Война': 'Military',
    'Социология': 'Sociology',
    'Биология': 'Biology',
    'Индустрия': 'Industry',
    'Наука': 'Science',
    'Уникальные': 'Unique',
  },
  /** filled later */
  TREELIST_EN2RU: {},
  /** english tech type names, filled later */
  NODE_TYPE_2_NAME: {},
  WAR_MODULES_ARR: ['trapezoid', 'trapezoid2', 'fatarrow'],
  NON_WAR_NODE_TYPES_ARR: ['rectangle', 'parallelogram', 'parallelogram2', 'ellipse', 'hexagon'],
  TREELIST_NOMIL: TREELIST.filter(e => e != 'Military'),
  SVG_DEFAULT: `<style> text {
    font-family: Helvetica;
    // font-size: 12;
  } </style>`,
  DIFFICULTY_MULTS: rules.DIFFICULTY_MULTS,
  effectsOfPlanetSize: rules.effectsOfPlanetSize,
  /**
   * bonuses for hull types
   */
  hulls: {
    'пехота': '',
    'танки': 'Защита +2, Скорость +1',
    'титан': 'Защита +3, Щит +1, ужас',
    'нанорой': 'Регенерация 5, нано, ужас',
    //катер - без ftl?
    'звездолёт': '',
    'хабитат': 'Слоупок 1',
    'наземная база': 'неподвижна',
    'космическая база': 'неподвижна',
  },
  colorToParameterType: {
    '#FF0000': 'Производство',
    '#00FF00': 'Общество',
    '#0000FF': 'Наука',
    '#000000': 'Свободный',
  },
  /** filled later */
  defaultProjectsList: {},
  fill2TreeType: FILL_2_TREE_TYPE,
})

  ; (() => {
    VARS.TREELIST_EN2RU = Object.fromEntries(Object.entries(VARS.TREELIST_RU2EN).map(e => e.reverse()))
    VARS.NODE_TYPE_2_NAME = Object.fromEntries(Object.entries(NODE_TYPE).map(e => e.reverse()))

    const defaultProjTemplate = {
      // subtree
      'type': 'parallelogram2',
      // "borderColor": "#000000",
      'fill': 'lightgrey',
      'req': [],
      'next': [],
      'fullText': '',
    }

    VARS.defaultProjectsList = {
      'Планетарная разведка': {
        'treeName': 'Industry',
        'cost': [['Наука', '1']],
        'effect': [['особое', 'разведка планеты']],
        ...defaultProjTemplate,
      },
      'Резерв': {
        'treeName': 'Industry',
        'cost': [['Любой', '1']],
        'effect': [['разово', 'резервирование X кубов']],
        ...defaultProjTemplate,
      },
      'Снятие стресса Наука': {
        'treeName': 'Science',
        'cost': [['Наука', '1']],
        'effect': [['разово', '-Х*2 Стресса Науки']],
        ...defaultProjTemplate,
      },
      'Снятие стресса Производство': {
        'treeName': 'Industry',
        'cost': [['Производство', '1']],
        'effect': [['разово', '-Х*2 Стресса Производства']],
        ...defaultProjTemplate,
      },
      'Снятие стресса Общество': {
        'treeName': 'Sociology',
        'cost': [['Общество', '1']],
        'effect': [['разово', '-Х*2 Стресса Общества']],
        ...defaultProjTemplate,
      },
      'Создание доверия': {
        'treeName': 'Sociology',
        'cost': [['Общество', '2']],
        'effect': [['разово', '+Х/2 Доверия']],
        ...defaultProjTemplate,
      },
    }

    let cnt = 0
    for (let name in VARS.defaultProjectsList) {
      VARS.defaultProjectsList[name].id = `n333${(++cnt).toString().padStart(3, '0')}`
      VARS.defaultProjectsList[name].name = name
    }

    NodeList.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.filter = Array.prototype.filter
  })()

/**
 * @type {Object<string,Object<string,TTechObject>>}
 */
const tech = {}
const techData = {
  MAX_TECH_LVL: 16,
  graphmls: {},
  /** @type {Record<string, TTechObject[]>} set on startup */
  badCells: Object.fromEntries(TREELIST.map(e => [e, []])),
  levels: Object.fromEntries(TREELIST.map(e => [e, []])),
  /** @type {Record<string, TTechObject[]>} set on startup */
  subtreeBorders: Object.fromEntries(TREELIST.map(e => [e, []])),
  badTechCount: 0,
  badTechList: {
    cost: [],
    effect: [],
  },
  currentTreeName: null,
  cache: {
    trees: Object.fromEntries(TREELIST.map(e => [e, { html: null, viewBox: null }])),
    usersFlatTech: {},
  }
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
  VARS.isInit = true
  console.time('full load   ')

  getEl('el_loading').hidden = false
  const parser = new DOMParser()
  const isLocalFile = VARS.IS_LOCAL

  console.time('load iframes')
  const iframes = Array.from(document.querySelectorAll('iframe[src2]'))
  if (isLocalFile) {
    await Promise.all(iframes.map(i => {
      const src2 = i.getAttribute('src2')
      if (src2.startsWith('tech') && !TREELIST.includes(src2.match(/tech\/(\w+).graphml/)[1])) {
        return true
      }
      return new Promise((resolve) => {
        i.onload = resolve
        i.src = src2
      })
    }
    ))
  } else {
    getEl('post_text_iframe').src = getEl('post_text_iframe').getAttribute('src2')
  }

  for (let i of TREELIST) {
    const src = `tech/${i}.graphml`
    if (isLocalFile) {
      try {
        const el = document.querySelector(`[src="${src}"]`)
        techData.graphmls[i] = parser.parseFromString(
          el.contentWindow.document.body.firstChild.innerHTML
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
          , 'text/xml')
      } catch (e) {
        alert('shit happened, see dev console')
        warn(`cannot read local files, run
        chrome with --allow-file-access-from-files
        or
        firefox with about:config - privacy.file_unique_origin : false`)
        warn(e)
        getEl('el_loading').hidden = true
        break
      }
    } else {
      // non-local, try to fetch data
      const xmlText = await fetch(src).then(e => e.text())
      techData.graphmls[i] = parser.parseFromString(xmlText, 'text/xml')
    }
  }
  console.timeEnd('load iframes')

  for (let i of document.querySelectorAll('#tech_tree_buttons button')) {
    i.id = `btn_${i.innerText}`
    i.disabled = true
  }

  await parseTechIframe(VARS.TREELIST_NOMIL[3])
  console.time('initial draw')
  drawTree(VARS.TREELIST_NOMIL[3])
  getEl('el_loading').hidden = true
  console.timeEnd('initial draw')

  setTimeout(async function init2() {

    console.time('player data ')

    const elPlayersData = getEl('el_data_players')
    await new Promise((resolve) => {
      elPlayersData.onload = resolve
      elPlayersData.src = elPlayersData.getAttribute('src2')
    })
    parseGDoc.lastResult = User.getAllUsersData()

    console.timeEnd('player data ')
    // log('User data version:', window[VARS.PLAYERS_TIMESTAMP_KEY])

    User.formUsersCheckboxes()

    HTMLUtils.initHotkeysLib()

    console.time('other parse ')
    Promise.all(TREELIST
      .filter(e => e != VARS.TREELIST_NOMIL[3])
      .map(e => parseTechIframe(e))
    )
      .then(async _ => {
        console.timeEnd('other parse ')
        console.time('other draw  ')
        for (let i of TREELIST) {
          drawTree(i)
        }
        drawTree(VARS.TREELIST_NOMIL[3])
        console.timeEnd('other draw  ')

        inverted.alltech = Object.fromEntries(
          [...Object.values(tech)]
            .map(e => Object.values(e))
            .flat()
            .map(e => [e.name, e])
        )

        console.time('node stat   ')
        try {
          for (let treeName of TREELIST) {
            for (let j in tech[treeName]) {
              let [cost, effects] = parseNode.costAndEffects(tech[treeName][j])
              tech[treeName][j].cost = cost
              tech[treeName][j].effect = effects
              doNodeStat(treeName, tech[treeName][j])
            }
          }
        } catch (err) {
          warn('node stat failed', err)
        } 

        console.timeEnd('node stat   ')

        getEl('players_selection').children.forEach(e => (e.tagName == 'LABEL')
          ? e.onclick = function () {
            if (e.children[0].checked) {
              let playerName = e.innerText.trim()
              parseGDoc.drawTech(playerName, techData.currentTreeName)
              if (!VARS.isInit && !getEl('el_playerQuiet').checked) {
                User.drawUserStat(playerName)
              }
            } else {
              User.activePlayer = null
              drawTree(techData.currentTreeName)
              getEl('el_reports_wrapper').hidden = true
              HTMLUtils.closeModal('report')
            }
            if (!VARS.isInit) {
              // isInit means 99% auto-click
              navigator.clipboard.writeText(e.innerText)
            }
          }
          : null
        )

        makeElDraggable('el_selected_tech_wrapper', 'el_selected_tech_header')
        makeElDraggable('el_reports_wrapper', 'el_reports_header')
        makeElDraggable('el_help', 'el_help_header')
        makeElDraggable('el_unitcreator_wrapper', 'el_unitcreator_header')
        makeElDraggable('el_turnplanner_wrapper', 'el_tp_header')

        setTimeout(async () => {
          // console.time('old tech load ')
          const elOldTechData = getEl('el_data_oldtech')
          await new Promise((resolve) => {
            elOldTechData.onload = resolve
            elOldTechData.onerror = resolve
            elOldTechData.src = elOldTechData.getAttribute('src2')
          })
          // console.timeEnd('old tech load ')
        }, 0)

        console.time('analysis    ')
        Analysis.onInit()
        HTMLUtils.checkForOpenedWindows()
        console.timeEnd('analysis    ')

        console.timeEnd('full load   ')
        setTimeout(_ => VARS.isInit = false, 200)
      })
  }, 0)
}

// eslint-disable-next-line no-unused-vars
const HTMLUtils = {
  initHotkeysLib() {
    let searchEnabled = false

    hotkeysLib.init({
      'Escape': _ => {
        if (searchEnabled) {
          setTimeout(_ => searchEnabled = false, 50)
        }
        else {
          let tgt = document.querySelector('.modal[style*="z-index: 1"]:not([hidden]) button.btn_close')
          if (!tgt) tgt = document.querySelector('.modal:not([hidden]) button.btn_close')
          if (!tgt) return
          tgt.click()
          this.focusModal(document.querySelector('.modal:not([hidden])'))
          // this.hideAllModals()
        }
      },
      'Ctrl F': _ => searchEnabled = true,
    }, {
      '1': _ => getEl('players_selection').querySelectorAll('label')[0].click(),
      '2': _ => getEl('players_selection').querySelectorAll('label')[1].click(),
      '3': _ => getEl('players_selection').querySelectorAll('label')[2].click(),
      '4': _ => getEl('players_selection').querySelectorAll('label')[3].click(),
      '5': _ => getEl('players_selection').querySelectorAll('label')[4].click(),
      '6': _ => getEl('players_selection').querySelectorAll('label')[5].click(),
      '7': _ => getEl('players_selection').querySelectorAll('label')[6].click(),
    })
  },

  addTableSorting(tableQuery) {
    // somewhere from SO
    const getCellValue = (tr, idx) =>
      tr.children[idx].innerText || tr.children[idx].textContent

    const comparer = (idx, asc) => (a, b) =>
      ((v1, v2) =>
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2)
          ? v1 - v2
          : v1.toString().localeCompare(v2))(
            getCellValue(asc ? a : b, idx),
            getCellValue(asc ? b : a, idx)
          )

    Array.from(document.querySelector(tableQuery).tHead.rows[0].cells).forEach(
      (th) =>
        th.addEventListener('click', function () {
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

  openModal(name, subName = null) {
    const tgt = Array.from(document.querySelectorAll('.modal'))
      .map(e => e.id)
      .filter(e => e.includes(name))[0]
    if (!tgt) return
    getEl(tgt).hidden = false
    this.registerModalPath(name, subName)
    this.focusModal(getEl(tgt))
  },

  focusModal(el) {
    if (!el) return
    for (let i of document.querySelectorAll('.modal:not([hidden])')) {
      i.style.zIndex = 0
    }
    el.style.zIndex = 1
  },

  registerModalPath(name, subName) {
    if (VARS.IS_LOCAL) {
      if (!name) {
        location.hash = ''
        return
      }

      HTMLUtils.unregisterModalPath(name)

      location.hash += `#${name}${subName ? `__${subName}` : ''}`
    }
  },

  unregisterModalPath(name) {
    let q = location.hash.split('#').filter(e => e)
    location.hash = q.filter(e => !e.startsWith(name)).join('#')
  },

  collapsedModalsList: [],

  collapseModals() {
    let tgts = Array.from(document.querySelectorAll('.modal:not([hidden])')).map(e => e.id)
    if (!tgts.length) return
    if (this.collapsedModalsList.length) tgts = tgts.concat(this.collapsedModalsList)
    this.collapsedModalsList = tgts
    for (let i of this.collapsedModalsList) {
      getEl(i).hidden = true
    }
    getEl('btn_expand_modals').hidden = false
  },

  expandModals() {
    if (!this.collapsedModalsList.length) return
    for (let i of this.collapsedModalsList) {
      getEl(i).hidden = false
    }
    this.collapsedModalsList = []
    getEl('btn_expand_modals').hidden = true
  },

  closeModal(name) {
    const tgt = Array.from(document.querySelectorAll('.modal:not([hidden])')).map(e => e.id).filter(e => e.includes(name))[0]
    if (!tgt) return
    getEl(tgt).hidden = true
    this.unregisterModalPath(name)
  },

  checkForOpenedWindows() {
    if (location.hash.length <= 1) return

    const path = decodeURIComponent(location.hash).split('#')
      .filter(e => e)
      .map(e => e.split('__'))

    location.hash = ''

    const modals = {
      'report': i1 => {
        Analysis.drawReportsList()
        if (i1) {
          Analysis.openReport(i1)
        }
      },
      'unitcreator': _ => setTimeout(UnitCreator.open),
      [TurnPlanner.NAME]: subname => {
        if (subname) User.activePlayer = subname
        setTimeout(TurnPlanner.open)
      },
      // MAYBE add processing from localstorage
      'selected_tech': _ => setTimeout(playerPost.open)
    }

    for (let i of path) {
      if (modals[i[0]]) {
        modals[i[0]](i[1])
      } else {
        warn('Unknown modal: ', i[0])
      }
    }
  },

  hideAllModals() {
    for (let i of document.querySelectorAll('.modal:not([hidden])')) {
      i.hidden = true
    }
    location.hash = ''
  },
}

const Analysis = {
  // statistics and various checks
  onInit() {
    // extracted from Init
    Analysis.reportBadY()
    Analysis.reportBadUserData()
    Analysis.reportBadSymbolsInTechName()

    Analysis.insertTechLevels()
    Analysis.countTechSubtreesBorders()

    // console.log(TechUtils.listParam('cost', false))
    if (techData.badTechCount) console.log('unrecognized tech:', techData.badTechCount)

    Analysis.searchBadTechRefs()

    log('countTechPrices disabled')
    // Analysis.countTechPrices()

    setTimeout(_ => {
      // record subtrees
      Object.keys(inverted.alltech).forEach(
        key => {
          inverted.alltech[key].subtree =
            capitalizeFirstLetter(Analysis.getSubtreeName(TechUtils.byName(key)))
        })
    })

    setTimeout(_ => {
      // all output to clear timestamps
      // console.log(TechUtils.listParam('costClear'))
      // console.log(TechUtils.listAllWithoutMilitary())
      Analysis.totalTechCount()
    }, 20)
  },

  insertTechLevels() {
    for (let treeName of TREELIST) {
      for (let j in tech[treeName]) {
        tech[treeName][j].lvl = +techData.levels[treeName].indexOf(tech[treeName][j].y.toString()) + 1
      }
    }
  },

  countTechPrices() {
    let cnt = 0
    for (let i of Object.keys(tech)) {
      // console.group(i)
      for (let j of Object.values(tech[i])) {
        const lvl = j.lvl
        const mult = VARS.DIFFICULTY_MULTS[lvl]
        let tcost = 0
        let teff = 0
        let fail = false

        // TODO
        // inverted.alltech[j.name].effect[0][1] = +inverted.alltech[j.name].effect[0][1]*+j.lvl

        for (let k of j.cost) {
          if (KEYWORDS.COLONY_PARAMS.includes(k[0])) tcost += +k[1]
          // else if(k[0] == KEYWORDS.ANY_PARAM_KEYWORD) tcost += +k[1]
          // // eslint-disable-next-line no-empty
          // else if(KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(k[0])) {}
          else if (k[0] == 'Этапы') tcost *= 2
          else if (k[1] == KEYWORDS.REWARD_KEYWORD) {
            // TODO rework maybe
            tcost = tcost * 1.6
            break
          }
          // else if(KEYWORDS.SPECIAL_TECH_COST.includes(k[0])) tcost += +k[1]
          else if (KEYWORDS.MATERIALS.map(e => e.toLowerCase()).includes(k[0])) {
            tcost += +k[1] * 0.5
          }
          // // eslint-disable-next-line no-empty
          // else if(['Технология', "Слоты"].includes(k[0])) {}
          else if (
            k[1] == 'чудо'
            // || j.lvl >= techData.MAX_TECH_LVL-1
          ) {
            tcost = 0
            break
          }
          else {
            // log('what is this?', j.name, k)
            // fail = true
            // break
          }
        }

        tcost = +tcost.toFixed(2)

        const itIsMilitaryModule = ['octagon', 'trapezoid', 'trapezoid2', 'fatarrow'].includes(j.type)
          || ['космическая база', 'наземная база'].includes(j.effect[0][1])

        // tcost<10 in case is's some superstructure
        if (Math.abs(tcost - mult) > 0.5 && tcost > 0 && tcost < 10
          // do-not-touch-military-costs-dammit
          && !itIsMilitaryModule
          && !j.cost[j.cost.length - 1][1] === KEYWORDS.REWARD_KEYWORD
        ) {
          log(i, `\n${j.name}\n`, `cost looks bad: ${tcost}->${mult}`, j)
          techData.badTechList.cost.push([j.name, mult])
          cnt++
          continue
        }

        //hulls regulated manually
        if (![NODE_TYPE.HULL].includes(j.type) && j.effect[0][1] !== 'наземная база') {
          for (let k of j.effect) {
            if (k[0] == KEYWORDS.ANY_PARAM_KEYWORD) {
              if (mult <= 2) teff += +k[1]
              else teff += +k[1] * 2
            }
            else if (KEYWORDS.COLONY_PARAMS.includes(k[0])) teff += +k[1]
            else if (k[0] == 'Сверхадаптация' || k[0] == KEYWORDS.RESERVE_KW || k[0].startsWith(KEYWORDS.IGNORE_CRITFAIL_KW + ' (')) {
              teff += +k[1] * 2
            }
            else if (
              KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(k[0].toLowerCase())
              || KEYWORDS.TECH_EFFECTS.includes(k[0])
              || k[0].startsWith(KEYWORDS.RESEARCH_KEYWORD + ' (')
            ) {
              teff += +k[1] / 2
            } else if (
              k[0].startsWith(KEYWORDS.CREATION_KEYWORD)
              || k[0].startsWith(KEYWORDS.UNIT_POINTS_KEYWORD)
              || KEYWORDS.IDEOLOGIES.includes(k[0])
              || k[0].startsWith('Ремонт')
            ) {
              teff += +k[1] / 1.6
            }
            else if (KEYWORDS.MATERIALS.includes(k[0])) {
              teff += +k[1] * TechUtils.getMaterialSeries(k[0])
            }
            else if (KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(k[0])) {
              // TODO do better later
              teff += +k[1] * 0.6
            }
            // eslint-disable-next-line no-empty
            else if (KEYWORDS.UNIT_TYPES.includes(k[0])) { }
            // hacky but at least somehow checks efficency
            else if (VARS.WAR_MODULES_ARR.includes(j.type) && KEYWORDS.UNIT_SLOTS_KEYWORD === k[0]) {
              teff -= +k[1] * 1.5
            }
            else if (KEYWORDS.MILITARY_PARAMS.includes(k[0])) {
              if (j.type !== NODE_TYPE.TECH) {
                teff += +k[1] / 2.5
              } else {
                teff += +k[1]
              }
            }
            else if (KEYWORDS.MILITARY_PARAMS_ADDITIONAL.includes(k[0])) teff += +k[1] / 2
            else if (KEYWORDS.MODULE_NUM_PROPS.includes(k[0])) teff += +k[1] * 1.3
            else if (KEYWORDS.DAMAGE_TYPES.includes(k[1])) teff += 0.5
            // TODO разово
            else if (k[0] == KEYWORDS.ITS_SPECIAL) {
              continue
            }
            else if (k[0] == KEYWORDS.UNIT_SLOTS_KEYWORD
              || k[0] == KEYWORDS.UNIT_TYPES_KEYWORD
              || k[0].startsWith('Великий человек')
              || KEYWORDS.MILITARY_PARAMS.some(e => k[0].startsWith(e))
              || KEYWORDS.MILITARY_PARAMS_ADDITIONAL.some(e => k[0].startsWith(e))
            ) {
              continue
            } else {
              log('unrecognized effect', j.name, k)
              // fail = true
              // break
            }
          }
        }

        if (fail || tcost == 0 || teff == 0) {
          // unrecognized effects
          continue
        }

        let d = (+tcost / +teff).toFixed(1)
        // TODO should it be like this for itIsMilitaryModule?
        const delta = +(+tcost - +teff + (tcost > 1.1 && !itIsMilitaryModule ? -1 * 0 : 0)).toFixed(2)

        if (d && mult && j.lvl !== techData.MAX_TECH_LVL) {
          if (delta < -0.6 || delta > 1) {
            cnt++
            log(i, 'lvl', j.lvl, `\n${j.name}\n`, j.effect[0][0], j.effect[0][1], `delta:${delta}`, delta > 1 ? 'ДОРОГО' : 'ДЕШЕВО')
            techData.badTechList.effect.push([j.name, delta])
          }
        }
      }
      // console.groupEnd()
    }
    if (cnt) log('Bad prices:', cnt)
  },
  fixBadCosts() {
    const iframes = Array.from(document.querySelectorAll('iframe.tech'))
    const files = Object.fromEntries(iframes.map(e => [e.src.split('/').pop().split('.')[0], e.contentWindow.document.body.firstChild.innerText]))
    const changedFiles = Object.fromEntries(Object.keys(files).map(e => [e, false]))

    // cost
    if (techData.badTechList.cost.length === 0) {
      log('no costs to fix')
    } else {
      log(`fixBadCosts, fixing ${techData.badTechList.cost.length} bad costs`)
    }
    for (let i of techData.badTechList.cost) {
      const treeName = inverted.alltech[i[0]].treeName
      files[treeName] = files[treeName].replace(new RegExp(`(${i[0]}\nСложность: )\\d+`, 'i'), `$1${i[1]}`)
      changedFiles[treeName] = true
    }

    // effect
    if (techData.badTechList.effect.length === 0) {
      log('no effects to fix')
    } else {
      log(`fixBadCosts, fixing ${techData.badTechList.effect.length} bad effects`)
    }
    for (let i of techData.badTechList.effect) {
      const tTech = inverted.alltech[i[0]]
      const treeName = tTech.treeName
      let [fullEff, beforeEff, effName, effValue, afterEff] =
        [].concat(...files[treeName].matchAll(new RegExp(`(${i[0]}\nСложность:[^\n]*\nЭффект: )([^\\d\\-\\+]*[+-]?)(\\d+)([^<]*)`, 'ig'), `$1${i[1]}`))
      if (!fullEff) {
        log('fixBadCosts cant parse effect', i[0])
        continue
      }
      const effCleanName = effName.replace(/[+-]/, '').trim()
      effValue = +effValue
      let correctionDelta = i[1]
      // probably free cubes
      if (effName.length < 2) correctionDelta = correctionDelta / 2
      else if (KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(effCleanName)
        || KEYWORDS.TECH_EFFECTS.includes(effCleanName)
        || effCleanName.startsWith(KEYWORDS.RESEARCH_KEYWORD + ' (')
      ) correctionDelta = correctionDelta * 2

      const tgtValue = +(effValue + correctionDelta).toFixed(0)
      // log(correctionDelta, tgtValue, {fullEff, beforeEff, effCleanName, effValue, afterEff})
      if (tgtValue < 1) {
        log(i[0], 'correctionDelta ducked up')
        continue
      }
      const resultStr = `${beforeEff}${effName}${tgtValue}${afterEff}`
      log(i[0], `${effCleanName} ${effValue} -> ${tgtValue}`)
      files[treeName] = files[treeName].replace(fullEff, resultStr)
      changedFiles[treeName] = true
    }

    for (let i in files) {
      if (!changedFiles[i]) continue
      savingOps.saveFile(`${i}.graphml`, files[i])
    }
  },
  reportBadY() {
    // collapse stat bad Y's
    for (let i of Object.keys(stat)) {
      const keys = Object.keys(stat[i])
      for (let j in keys) {
        if (!techData.levels[i].includes(keys[j])) techData.levels[i].push(keys[j])
        if (!keys[j - 1]) continue
        const delta = keys[j] - keys[j - 1]
        if (delta > 0 && delta < 10) {
          warn('bad y:', i, keys[j - 1], keys[j])
        }
      }
    }
    Object.keys(techData.levels).map(i => techData.levels[i].sort((a, b) => a < b))
  },
  reportBadUserData() {
    // useful when transitions happen
    for (let username of User.listUsers()) {
      const data = UserUtils.getSavedUserData(username)
      const objNames = [].concat(data.localProjs, data.buildings, data.orbital, data.astroProjs)
        .flat()
        .map(name => name.replace(/ ?\([^)]+\)/, ''))
        .filter(name => !name.startsWith(':'))
      for (let name of objNames) {
        const tek = TechUtils.byName(name)
        if (!tek) {
          warn(`player ${username} bad object name`, name)
          continue
        }
      }
      // TODO check if correct block
    }
  },

  reportBadSymbolsInTechName() {
    // see playerPost.extractRolls
    const prohibitedStrings = [',', '.', ' - ']
    for (let name of Object.keys(inverted.alltech)) {
      for (let badToken of prohibitedStrings) {
        if (name.includes(badToken)) {
          warn(`tech "${name}", bad token in name: "${badToken}"`)
        }
      }
    }
  },

  countTechSubtreesBorders() {
    techData.subtreeBorders = Object.fromEntries(
      Object.entries(techData.badCells)
        .map(e => [e[0], e[1]
          .filter(e2 => e2.fullText.length > 2)
          .map(({ fullText, x, w, fill }) => ({ fullText: fullText.toLowerCase(), x1: x, x2: x + w, fill }))
        ]))
  },
  /**
   * @param {TTechObject} techObj 
   */
  getSubtreeName(techObj) {
    if (!techObj || !techObj.nodeCenter) return null
    for (let i of techData.subtreeBorders[techObj.treeName]) {
      if (techObj.nodeCenter.x > i.x1 && techObj.nodeCenter.x < i.x2)
        return i.fullText
    }
  },
  searchBadTechRefs() {
    for (let i of Object.keys(tech)) {
      for (let j of Object.values(tech[i])) {
        j.cost
          .filter(e => e[0] == KEYWORDS.TECH_KW)
          .forEach(e => {
            if (!(e[1] in inverted.alltech)) warn('unknown tech name here:', i, j.name, [e[1]])
          })
      }
    }
  },
  totalTechCount() {
    let sum = 0
    for (let i of Object.keys(tech)) sum += (Object.keys(tech[i]).length)
    log('Total tech count', sum)
  },

  // counting win possibility for debils
  // eslint-disable-next-line no-unused-vars
  countSuccessPossibility(threshold, nOfCubes) {
    const n = 250000
    let wins = 0
    for (let i = 0; i < n; i++) {
      let goodCubes = 0
      for (let j = 0; j < nOfCubes; j++) {
        goodCubes += +(Math.random() * 10).toFixed(0) % 10 > 3 ? 1 : 0
      }
      if (goodCubes >= threshold) wins += 1
    }
    return +(wins / n).toFixed(3)
  },

  countSuccessTable() {
    for (let i = 1; i < 15; i++) {
      let j = i
      let p = Analysis.countSuccessPossibility(i, j)
      while (p <= 0.6) {
        j++
        p = Analysis.countSuccessPossibility(i, j)
      }
      console.log(i, j - 1, Analysis.countSuccessPossibility(i, j - 1))
      console.log(i, j, p)
    }
  },

  /**
   * @returns {Record<string, Record<string, number>>}
   */
  countTechBalanceBySubtree() {
    const res = {}
    for (let user of User.listUsers()) {
      const techNames = User.getFlatUserTech(user)
      res[user] = {}
      for (let i of techNames) {
        let subtreeName = TechUtils.byName(i)?.subtree
        if (!subtreeName) continue
        if (!res[user][subtreeName]) res[user][subtreeName] = 0
        res[user][subtreeName] += 1
      }
    }
    return res
  },

  filterObjectByDict(obj, dict) {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => dict.includes(key)))
  },

  excludeByDict(obj, dict) {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => !dict.includes(key)))
  },

  drawReportsList() {
    HTMLUtils.openModal('report')
    getEl('el_reports_home').hidden = true
    getEl('el_reports_list').innerHTML = ''

    for (let name of Object.keys(Analysis.Reports)) {
      if (name.startsWith('_')) {
        getEl('el_reports_list').innerHTML += `<br><b>${name.replace(/_/g, ' ')}</b>`
        continue
      }

      getEl('el_reports_list').innerHTML += `<li 
      onclick="Analysis.openReport('${name}')">
      ${name.replace(/_/g, ' ')}</li>`
    }
  },

  openReport(reportName, reportArgs = null) {
    HTMLUtils.registerModalPath('report', reportName)
    getEl('el_reports_home').hidden = false
    if (Analysis.Reports[reportName])
      Analysis.Reports[reportName](reportArgs)
    else {
      // probably its user report
      User.drawUserStat(reportName)
    }
  },

  closeReports() {
    HTMLUtils.closeModal('report')
  },

  reportTable(obj, HTMLbefore = '<span></span>') {
    if (!Object.keys(obj).length) return

    getEl('el_reports_list').innerHTML = HTMLbefore + '<table><thead></thead><tbody></tbody></table>'
    const tbody = qs('#el_reports_list table').tBodies[0]

    const entries = Object.entries(obj)
    const isObj = typeof entries[0][1] == 'object'
    let res = ''

    qs('#el_reports_list table').tHead.innerHTML =
      `<tr><th>(index)</th><th>${isObj ? Object.keys(entries[0][1]).join('</th><th>') : 'value'}</th></tr>`

    for (let i of entries) {
      res += `<tr><td data-value='${i[0]}'>${i[0]}</td><td>${isObj ? Object.values(i[1]).join('</td><td>') : i[1]}</td></tr>`
    }

    tbody.innerHTML = res

    HTMLUtils.addTableSorting('#el_reports_list table')
    setTimeout(_ => {
      qs('#el_reports_list table').tHead.children[0].children[1].click()
      qs('#el_reports_list table').tHead.children[0].children[1].click()
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
      .filter(e => (VARS.WAR_MODULES_ARR.includes(e.type)))
  },

  /**
   * @param {{name: any, value: any}} techObjsObj 
   * @returns {{Object<string, {count: number, list: string, sum: number}>}}
   */
  allEffectsVerbose(techObjsObj) {
    return Object.values(techObjsObj)
      .reduce((acc, techObj) => {
        for (let [key, v] of techObj.effect) {
          const k = key
          if (!acc[k])
            acc[k] = {
              count: 0,
              sum: 0,
              list: '',
            }

          if (!TechUtils.isSpecial(k) && !isNaN(+v)) {
            acc[k].count += 1
            acc[k].sum += +v
            acc[k].list += `${techObj.name}(${+v}), `
          } else {
            acc[k].count += 1
            acc[k].list += `${techObj.name}("${v}"), `
          }
        }
        return acc
      }, {})
  },

  // leading underscore makes it non-clickable head of section
  Reports: {
    кнопочки() {
      Analysis.reportTable({
         'только проекты': `<button onclick=
          "Object.values(tech[techData.currentTreeName]).filter(e=>e.type!=='hexagon').forEach(e=>getEl(e.id).setAttribute('fill','white'))"
          >do</button>`,
          'подсветить tech thresholds': `<button onclick=
          "Object.values(window['DATA__TECH_THRESHOLDS'].data[techData.currentTreeName])
            .flat().map(([k,v])=> ([TechUtils.get(k)?.id,v]))
            .filter(([k,v])=>k)
            .forEach(([id,v])=>{getEl(id).setAttribute('fill','lawngreen'); })"
          >do</button>`,
        })
    },

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
        ['Слоты', 'Тип юнита', 'Тип урона', 'особое'],
      )
      let result = Object.values(inverted.alltech)
        .reduce((acc, e) => {
          for (let i of e.effect) {
            const k = i[0]
            if (filter.includes(k)) continue

            if (!acc[k])
              acc[k] = {
                count: 0,
                sum: 0,
                list: [],
              }

            acc[k].count += 1
            acc[k].sum += +i[1]

            acc[k].list.push(e.name)
          }

          return acc
        }, {})
      Analysis.reportTable(result)
    },

    особые_эффекты() {
      const result = Object.values(inverted.alltech)
        .reduce((acc, e) => {
          for (let i of e.effect) {
            if (i[0] == KEYWORDS.ITS_SPECIAL) {
              acc[i[1]] = acc[i[1]] ? acc[i[1]] + 1 : 1
            }
          }
          return acc
        }, {})
      Analysis.reportTable(result)
    },

    вообще_все_эффекты() {
      const result = Object.values(inverted.alltech)
        .reduce((acc, e) => {
          for (let i of e.effect) {
            const k = i[0]
            if (!acc[k])
              acc[k] = {
                count: 0,
                sum: 0,
              }
            acc[k].count += 1
            acc[k].sum += +i[1]
          }
          return acc
        }, {})
      Analysis.reportTable(result)
    },

    вообще_все_эффекты_подробно() {
      const result = Analysis.allEffectsVerbose(inverted.alltech)
      Analysis.reportTable(result)
    },

    // TODO fix
    эффекты_игрока_подробно(reportArgs) {
      let playerName
      if(reportArgs && reportArgs.playerName) {
        playerName = reportArgs.playerName
      } else {
        playerName = prompt('player name')
      }
      if(!playerName) return
      const userDataObj = UserUtils.getSavedUserData(playerName)
      const namesList = [].concat(
        userDataObj.astroProjs,
        userDataObj.buildings,
        userDataObj.localProjs,
        userDataObj.orbital,
        Object.values(userDataObj.techTable).flat(),
      )

      const extractedObj = User.extractEffectsFromUserObj(userDataObj)
      for(let i in extractedObj) {
        extractedObj[i] = {
          name: i,
          effect: extractedObj[i]
        }
      }
      const techObjsList = Object.assign({}, 
        namesList.map(e => inverted.alltech[e]).filter(e => e),
        extractedObj
      )

      const result = Analysis.allEffectsVerbose(techObjsList)
      Analysis.reportTable(result, `<a class="fake_link" 
        onclick="getEl('${playerName}').checked=false; getEl('${playerName}').click();">Сводный отчет: ${playerName}</a>`
      )
    },

    эффекты_на_ТУ() {
      let TL = prompt(`TL? 1-${techData.MAX_TECH_LVL}/+`)
      if (!TL) return
      if (TL == '+') TL = techData.MAX_TECH_LVL
      TL = +TL
      const techs = Object.values(inverted.alltech)
        .filter(e => e.lvl <= TL)
        .map(e => e.name)

      const result = Object.entries(User.countSummaryCostAndEffect(techs).effect)
        .filter(e => [].concat(
          KEYWORDS.COLONY_PARAMS,
          // KEYWORDS.MATERIALS,
          KEYWORDS.TECH_EFFECTS,
          [KEYWORDS.RESERVE_KW],
        ).includes(e[0]))

      result.push(['ВСЕГО', result
        .filter(e => KEYWORDS.COLONY_PARAMS.includes(e[0]))
        .reduce((s, e) => s + +e[1], 0)
      ])

      const obj = Object.fromEntries(result)

      Analysis.reportTable(obj)
    },

    _Списки_объектов_() { },

    список_корпусов() {
      Analysis.reportTable(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => e.type == NODE_TYPE.HULL)
          .map(e => [e.name, {
            'Тип': e.effect[0][1],
            'Цена': +e.cost[0][1],
            'Слоты': +e.effect[1][1],
            'Свойства': Analysis.formatReportEffects(e.effect.slice(2)),
          }])
      ))
    },

    список_модулей() {
      Analysis.reportTable(Object.fromEntries(
        Analysis.listModuleObjs()
          .map(obj => {
            let slots = ''
            // TODO FIXME
            const eff = obj.effect.filter(eff => eff[0] === 'Слоты')
            const cost = obj.cost.filter(eff => eff[0] === 'Слоты')
            if (eff.length) slots = eff[0][1]
            if (cost.length) slots = cost[0][1]

            return [obj.name, {
              Цена: obj.cost[0][1],
              Слоты: slots,
              Тип: VARS.NODE_TYPE_2_NAME[obj.type].replace('MODULE_', '').toLowerCase(),
              'Свойства': Analysis.formatReportEffects(obj.effect),
            }]
          })
      ))
    },

    список_зданий() {
      Analysis.reportTable(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => (e.type == 'parallelogram'))
          .map(e => [e.name, {
            Цена: e.cost[0][1],
            'Свойства': Analysis.formatReportEffects(e.effect),
          }])
      ))
    },

    список_проектов() {
      Analysis.reportTable(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => (e.type == NODE_TYPE.ASTROPROJECT || e.type == NODE_TYPE.ASTROPROJECT))
          .map(e => [e.name, {
            Цена: e.cost[0][1],
            'Свойства': Analysis.formatReportEffects(e.effect),
          }])
      ))
    },

    список_технологий_по_типу() {
      Analysis.reportTable(
        Object.values(inverted.alltech)
          .reduce((acc, e) => {
            if (!acc[e.type])
              acc[e.type] = 1
            else
              acc[e.type] += 1
            return acc
          }, {})
      )
    },

    _Оценка_игроков_() { },

    // чтобы прикинуть сколько давать вкатившимся после начала игры
    суммарная_стоимость_проектов_игроков() {
      const result = Object.fromEntries(
        Object.entries(User.getAllUsersData())
          .map(e => [e[0], {
            'Кол-во': e[1].buildings.length
              + e[1].orbital.length
              + e[1].localProjs.length
              + e[1].astroProjs.length
              + Object.values(e[1].techTable).flat().length,
            'Цена': [].concat(
              e[1].buildings,
              e[1].orbital,
              e[1].localProjs,
              e[1].astroProjs,
              Object.values(e[1].techTable).flat(),
            )
              .map(e2 => inverted.alltech[e2] ? inverted.alltech[e2].cost[0][1] : null)
              .filter(e2 => e2)
              .reduce((acc, i) => acc + +i, 0)
          }])
      )
      Analysis.reportTable(result, draw.createCаnvasHTML({ size: 300, title: 'Цены' }))
      setTimeout(() => {
        const data = Object.entries(result)
          .map(([name, val]) => ([
            name, val['Цена'], UserUtils.getSavedUserData(name).playerColor
          ]))
        draw.pieChart(data)
      })
    },

    основные_параметры_игроков() {
      const result = Object.fromEntries(
        Object.entries(User.getAllUsersData())
          .map(e => [e[0],
          Object.fromEntries(
            [].concat(
              [[
                'Итого',
                Object.values(e[1].colonyParams)
                  .map(e2 => +e2)
                  .filter(e2 => !isNaN(e2))
                  .reduce((acc, e2) => acc + e2, 0)
              ]],
              Object.entries(e[1].colonyParams)
                .filter(e2 => !isNaN(+e2[1]))
            )
          )
          ])
      )
      Analysis.reportTable(result, draw.createCаnvasHTML({ size: 300, title: 'Итого' }))
      setTimeout(() => {
        const data = Object.entries(result)
          .map(([name, val]) => ([
            name, val['Итого'], UserUtils.getSavedUserData(name).playerColor
          ]))
        draw.pieChart(data)
      })
    },

    планетарная_чуждость_и_погода() {
      /**
       * @type {[string, ReturnType<typeof countPlanetRawMisery>][]}
       */
      const arr = []
      const antiHostility = {}

      for (let username in User.getAllUsersData()) {
        const userData = UserUtils.getSavedUserData(username)
        const userEff = User.countUserEffects(userData)
        const misery = countPlanetRawMisery(userData)
        arr.push([username, misery])

        antiHostility[username] =
          (userEff.Сверхадаптация || 0) * 2 +
          (userEff.Адаптация || 0) +
          Math.floor((userEff['Защита колонии'] || 0) / 2)

        if (
          userData.additionalParams['чуждая среда'] != misery.alien ||
          userData.additionalParams['непривычная среда'] != misery.unfamiliar
        ) {
          warn(`User ${username}: misery should be a${misery.alien}u${misery.unfamiliar}`)
        }
      }

      // TODO FIXME log(Object.entries(User.getAllUsersData()).map(([name, data])=>`${name}: ##${data.additionalParams.осуждение}d10##`).join('\n'))
      Analysis.reportTable(Object.fromEntries(arr),
        '<div onclick="navigator.clipboard.writeText(this.textContent); this.style.backgroundColor=\'darkgrey\'"'
        + 'title="click to copy"><pre>'
        + arr.map(el => {
          const totalHostlility = el[1].alien * 2 + el[1].unfamiliar - antiHostility[el[0]]
          return `${el[0].padEnd(13, ' ')}: Враждебность среды: ##${totalHostlility}d10##`
        }).join('\n') + '</pre></div>'
      )
    },

    любимые_техдрева_игроков() {
      const t = Object.entries(Analysis.countTechBalanceBySubtree())
        .map(([name, list]) => [name, Object.entries(list).sort((a, b) => b[1] - a[1]).slice(0, 5)])
      const mostUsedMaxColumn = 3
      const mostUsed = Object.entries(t
        .map(([_, list]) => list.map(e => e[0]).slice(0, mostUsedMaxColumn))
        .flat()
        .reduce((prev, el) => {
          return (
            prev[el] ? ++prev[el] : (prev[el] = 1),
            prev
          )
        }, {})
      )
        .sort((a, b) => b[1] - a[1])

      Analysis.reportTable(
        Object.fromEntries(t),
        '<strong>Сумма по первым стобцам</strong><br>' +
        mostUsed.map(([k, v]) => k + ': ' + v)
          .join('<br>')
      )
    },    

    // drawGraph() {

    // },

    _Прочее_() { },

    countTechByCostParamType() {
      const sum = {}
      Object.values(inverted.alltech).forEach(e => {
        let paramType = VARS.colorToParameterType[e.borderColor]
        if (!sum[paramType]) {
          sum[paramType] = 1
        } else {
          sum[paramType] += 1
        }
      })
      Analysis.reportTable(sum)
    },

    идеологии_по_поддревам() {
      const result = {};

      for (const key in inverted.alltech) {
        const item = inverted.alltech[key];
        const { subtree, effect } = item;

        // Если subtree ещё нет в result, создаём его с пустым объектом ideology
        if (!result[subtree]) {
          result[subtree] = {

          };

          // Инициализируем все поля из KEYWORDS.IDEOLOGIES нулём
          for (const ideologyKey of KEYWORDS.IDEOLOGIES) {
            result[subtree][ideologyKey] = 0;
          }
        }

        // Обрабатываем эффекты
        if (Array.isArray(effect)) {
          for (const [ideology, value] of effect) {
            if (KEYWORDS.IDEOLOGIES.includes(ideology)) {
              result[subtree][ideology] += +value;
            }
          }
        }
      }

      Analysis.reportTable(result)
    },

    технологии_с_комментариями() {
      Analysis.reportTable(
        Object.fromEntries(Object.values(inverted.alltech)
          .filter(e => e.title)
          .map(e => [e.name, e.title])
        )
      )
    },

    технологии_дающие_материалы() {
      const res = Object.values(inverted.alltech)
        .filter(e => e.effect.some(eff => KEYWORDS.MATERIALS.includes(eff[0])))
        .map(({ lvl, name, effect }) => ([name, {
          lvl, effect:
            effect
              .filter(eff => KEYWORDS.MATERIALS.includes(eff[0]))
              .map(e => e[0])
              .flat()
              .join(', ')
        }]))
      Analysis.reportTable(Object.fromEntries(res))
    },

    // тип_критпровала_по_таблицам() {
    //   const field = {
    //     1: 'Социальный',
    //     2: 'Экологический',
    //     3: 'Научный',
    //     4: 'Технический',
    //     5: 'Военный',
    //   }
    //   const exactEvent = {
    //     1: 'Инопланетное вторжение',
    //     9: 'Астрономическое событие',
    //     19: 'Научное событие',
    //     29: 'Природное происшествие',
    //     39: 'Культурный феномен / Социальное изменение',
    //     49: 'Геологическая аномалия',
    //     59: 'Политическое движение',
    //     69: 'Преступление',
    //     79: 'Болезнь',
    //     89: 'Опыт лидеру',
    //     99: 'Инопланетный артефакт',
    //     100: 'Контакт',
    //   }
    //   const t = prompt('Кубы?')
    //   // getEl('el_reports_list').innerHTML = 
    //   const result = t.split('\n').map(s => {
    //     s = s.replace(/\dd5/, 'D5').replace(/\dd100/, 'D100')
    //     const s1 = s.split('D5:')
    //     const s2 = s1[1].split('D100:')
    //     return [
    //       s1[0].trim(),
    //       s2[0].trim().replace(/\) =.+$/, '').match(/\d+/g),
    //       s2[1].trim().replace(/\) =.+$/, '').match(/\d+/g),
    //     ]
    //   })
    //     .map(arr => [
    //       arr[0],
    //       arr[1].map(e => field[+e]).join('+'),
    //       arr[2].map(e => getDictKey(exactEvent, +e)).join('+'),
    //     ])
    //   Analysis.reportTable(result, `<pre onclick="navigator.clipboard.writeText(this.innerText)"
    //   >
    //     ##2d5## ##2d100##
    //   </pre>`) 
    // },

    выделить_близкие_звезды() {
      var locXY = prompt('Location? X Y with space between')
      var json = JSON.parse(prompt('stars.json here'))
      var m = Object.entries(json)

      function hexMapDist(coordStr1, coordStr2) {
        const [x1, y1] = coordStr1.split(' ')
        const [x2, y2] = coordStr2.split(' ')
        return Math.sqrt(Math.abs(+x1 - +x2) ** 2 + Math.abs(+y1 - +y2) ** 2)
      }

      log(m
        .filter(([key, _]) => hexMapDist(locXY, key) < 5)
        .filter(([key, _]) => key !== locXY)
        .map(([k, v]) => [k, v.StarsL.map(({ mass, spectral_type }) => ({ mass, spectral_type }))])
      )
    },

    async генератор_патчноута() {
      if(VARS.isInit) {
        setTimeout(Analysis.Reports.генератор_патчноута, 100)
        return
      }
      const isFilePresent = typeof DATA__OLD_TECH !== 'undefined'
      /**
       * @type {Record<string, TTechObject>}
       */
      let oldTech = isFilePresent ? Object.fromEntries(DATA__OLD_TECH.map(obj => [obj.name, obj])) : {}
      if(!isFilePresent) {
        let oldJSONStr
        try {
          oldJSONStr = await navigator.clipboard.readText()
        } catch (error) {
          return
        }
        try {
          oldTech = JSON.parse(oldJSONStr.replace(/(^`|`$)/, ''))
        } catch (error) {
          alert('you need to have old, stringified inverted.alltech JSON in clipboard')
          return  
        }
      }

      const delta = {
        added: [],
        changed: [],
        removed: [],
      }

      // analysis

      for (let techName of Object.keys(inverted.alltech)) {
        if (!oldTech[techName]) {
          delta.added.push(techName)
          continue
        }

        if (oldTech[techName].fullText !== inverted.alltech[techName].fullText) {
          delta.changed.push(techName)
        }
      }

      for (let techName in oldTech) {
        if (!inverted.alltech[techName]) {
          delta.removed.push(techName)
        }
      }

      // output

      /**
       * @param {string} s1 
       * @param {string} s2 
       * @param {string} prefix 
       */
      function stringDiff(s1, s2, prefix) {
        // https://stackoverflow.com/questions/8024102/compare-strings-and-get-end-difference
        var  string1 = new Array(),
          string2 = new Array(),
          result = new Array(),
          longString
        let hasDiff = false

        if(!s1 || !s2) return

        string1 = s1.split(',').map(str => str.trim())
        string2 = s2.split(',').map(str => str.trim())

        if (s1.length > s2.length) {
          longString = string1
        } else {
          longString = string2
        }

        for (let x = 0; x < longString.length; x++) {
          if (string1[x] != string2[x]) {
            hasDiff = true
            if(string2[x]) {
              // TODO join spans if(result[result.length - 1].startsWith('<span')) {
              result.push(`<span class='${prefix}-text'>${string2[x]}</span>`)
            } else {
              result.push(undefined)
            }
          } else {
            result.push(string2[x])
          }
        }

        if(!hasDiff) return ''

        return result.filter(e => e).join(', ')
      }

      const removedColor = 'lightcoral'
      const addedColor = 'lightgreen'
      const colorWrap = (str, fill) => `<span style="background: ${fill}">${str.replace(/\n/g, ' ')}</span>`
      const addedStr = delta.added.map(name => colorWrap(inverted.alltech[name].fullText, inverted.alltech[name].fill)).join('<br>')
      const removedStr = delta.removed.map(name => colorWrap(oldTech[name].fullText, TREE_TYPE_2_FILL[oldTech[name].treeName])).join('<br>')

      let str = `<style>
        .removed-text {
          background: ${removedColor};
        }
        
        .added-text {
          background: ${addedColor};
        }

        #el_reports_list {
          font-size: 15px;
        }

        #el_reports_list div {
          width: 48%;
          display: inline-block;
        }
      </style>
      <b>Дата старого файла:</b> ${DATA__OLD_TECH_TIME.split('T')[0]}<br>
      <b>Добавлены:</b><br> ${addedStr}<br>
      <b>Удалены:</b><br> ${removedStr}<br>
      <br><b>Изменены:</b><br>`
      for (let name of Object.values(delta.changed)) {
        const fullOld = oldTech[name].fullText.replace(/\n/g, ' ').replace(/^.*(?=Сложность:)/, '').split('Эффект: ')
        const fullNew = inverted.alltech[name].fullText.replace(/\n/g, ' ').replace(/^.*(?=Сложность:)/, '').split('Эффект: ')

        const lvlStr = oldTech[name].lvl !== inverted.alltech[name].lvl
          ? `Уровень: ${colorWrap(oldTech[name].lvl.toString(10), removedColor)}<br>Уровень: ${colorWrap(inverted.alltech[name].lvl.toString(10), addedColor)}`
          : ''

        const costStr = 
          stringDiff(fullNew[0], fullOld[0], 'removed') 
          + '<br>'
          + stringDiff(fullOld[0], fullNew[0], 'added')

        const effectStr = 'Эффект: ' + stringDiff(fullNew[1], fullOld[1], 'removed')
          + '<br>'
          + 'Эффект: ' + stringDiff(fullOld[1], fullNew[1], 'added')

        str += '<div class=border>' + colorWrap(name, inverted.alltech[name].fill) + '<br>' 
          + (lvlStr.length > 0 ? lvlStr + '<br>' : '') 
          + (costStr.length > 20 ? costStr + '<br>' : '') 
          + (effectStr.length > 20 ? effectStr + '<br>' : '') 
          + '<br></div>'
      }

      getEl('el_reports_list').innerHTML = str
    },

    // formListForComparison
    скачать_список_технологий() {
      if(confirm('Скачать?')) {
        savingOps.saveFile('oldTechData.js', 
          `var DATA__OLD_TECH_TIME='${window[VARS.PLAYERS_TIMESTAMP_KEY]}'\n`
          + `var DATA__OLD_TECH=${TechUtils.formTechListForPatchNote()}` 
        )
      }
      Analysis.drawReportsList()
    },
  }
}

const TreeView = {
  tspanHighlightOnClick() {
    for (const i of document.querySelectorAll('tspan')) {
      i.addEventListener('click', function (e) {
        getEl('highlight_css').innerHTML = `.${e.target.className.baseVal} { fill: orange }`
      })
    }
  },

  copyFirstTechLineOnClick() {
    for (let i of document.querySelectorAll('text')) {
      let el = i.children[0]
      el ? el.addEventListener('click', function () {
        navigator.clipboard.writeText(getEl(el.id).textContent)
      }) : 0
    }
  },

  addTurnPlannerThings() {
    if (!TurnPlanner.active) return
    for (let i of svg.children) {
      if (!i.id) continue
      const id = i.id.split('_')[0]
      i.addEventListener('click', function (evt) {
        if (!TurnPlanner.addTech(tech[techData.currentTreeName][id].name)) return
        getEl(id).style.fill = 'orange'
        evt.stopPropagation()
      })
    }
    TurnPlanner.highlightSelected()
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

  if (techData.cache.trees[tree_name].html) {
    svg.innerHTML = techData.cache.trees[tree_name].html
    svg.setAttribute('viewBox', techData.cache.trees[tree_name].viewBox)
    setTimeout(TreeView.tspanHighlightOnClick, 1)
    setTimeout(TreeView.copyFirstTechLineOnClick, 1)
    setTimeout(TreeView.addTurnPlannerThings, 1)
    techData.currentTreeName = tree_name
    User.drawActiveUser(tree_name)
    getEl('btn_' + tree_name).disabled = false
    return
  }

  TreeView.tspanHighlightOnClick()
  TreeView.copyFirstTechLineOnClick()
  TreeView.addTurnPlannerThings()

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
  svg.setAttribute('viewBox', viewBox)

  techData.cache.trees[tree_name].html = svg.innerHTML
  techData.cache.trees[tree_name].viewBox = viewBox

  techData.currentTreeName = tree_name
  User.drawActiveUser(tree_name)
  getEl('btn_' + tree_name).disabled = false
}

const TechUtils = {
  createEffectsTable(effectsListArr, tableName = '') {
    if (effectsListArr.length == 0) return ''
    return `<br><table data-tablename="${tableName}"><tbody><tr>` +
      (tableName ? `<tr><td colspan=2 align=center style="background: lightgrey">${tableName}</td></tr>` : '') +
      effectsListArr.map(e =>
        `<td ${e[1] === 0 ? 'colspan=2' : ''} data-effect="${e[0]}">${e[0]}</td>` +
        (e[1] === 0 ? '' : `<td>${`${+e[1] >= 0 ? '&nbsp;' : ''}${e[1]}`}`)
      ).join('</tr><tr>') +
      '</tr></tbody></table>'
  },

  byName(techName) {
    const cleanName = techName.replace(/ \([^)]+\)/, '')
    return inverted.alltech[cleanName] || VARS.defaultProjectsList[cleanName] || null
  },

  get(techName) {
    return this.byName(techName)
  },

  /** check if string key contains SPECIAL words meaning its not number field and you shouldn't process it so */
  isSpecial: (str) => 
    [KEYWORDS.ITS_SPECIAL, KEYWORDS.ONLY_ONCE_KW].includes(str),

  countCosts(techNames) {
    let t = [].concat.apply([], techNames
      .map(e => inverted.alltech[e]?.cost || VARS.defaultProjectsList[e]?.cost))
    let res = {}

    for (let i of t) {
      if (i[0] === KEYWORDS.ITS_SPECIAL || i[0].startsWith(KEYWORDS.TECH_KW)) {
        i[0] = ':' + i[1]
        i[1] = null
      }

      if (!res[i[0]])
        res[i[0]] = +i[1]
      else
        res[i[0]] += +i[1]
    }

    return Object.entries(res)
  },

  formTechListForPatchNote() {
    const list = Object.values(inverted.alltech)
    .map(
      ({id, type, treeName, borderColor, fullText, name, req, next, title, x, y, lvl, subtree }) => 
      ({id, type, treeName, borderColor, fullText, name, req, next, title, x, y, lvl, subtree })
    )
    return JSON.stringify(list, 0, 2)
    /* 
     "id": "n0",
    "type": "rectangle",
    "treeName": "Science",
    "borderColor": "#0000FF",
    "name": "Телепортация",
    "cost": [],
    "effect": [],
    "req": [],
    "next": [],
    // "fullText": "Телепортация\nСложность: 6\nЭффект: :телепортация",
    "title": null,
    "x": 334.33,
    "y": 1359,
    "fill": "#99CCFF",
    "lvl": 15,
    "subtree": "Физика пространства"
    */
  },

  /**
   * Номер ряда для ресурса
   */
  getMaterialSeries(materialName) {
    return Math.floor(KEYWORDS.MATERIALS.indexOf(materialName) / 2 + 1)
  },

  // а ведь еще юнитов учесть желательно и газовые гиганты
  /**
   * @param {*} rawExpr 
   * @param {*} effects 
   * @param {TGoogleDocUserObj} userDataObj 
   * @param {Record<str, any>} effects we use already calculated simple effects here
   * @returns {number | null}
   * @example '[Орбитальные здания (шт.)/2 + 1 - Технологии ветки "Добыча"]'
   * @example '[Орбитальные здания - 1]'
   * @example '[Чистота]'
   * названия категорий берутся из NODET_2_RU
   * keywords: formulae variable
   */
  parseExpression(rawExpr, userDataObj, effects) {
    /** @type {string[]} */
    let nodes = rawExpr
      .replace(/[[\]]/g,'')
      .replace(/ \(шт.?\)/g,'')
      .replace(/\s?([+-])\s?/g,'$1')
      .match(/(^[^+-]+|[+-][^+-]+)/g)

    let result = 0

    const paramLists = [
      KEYWORDS.IDEOLOGIES,
      KEYWORDS.MATERIALS,
    ]

    for(let str of nodes) {
      str = str.trim()
      const sign = str.startsWith('-') 
        ? -1
        : 1

      str = str.replace(/^[+-]/,'')

      const mults = str.match(/[*/]\d/g) || []
      let mult = 1
      
      if(mults.length > 0) {
        if(mults.length > 1) {
          warn('parseExpression multipliers WTF', {nodes, str: str, mults})
          return null
        }
        
        if(mults[0]) {
          str = str.replace(mults[0], '')
          if(mults[0].startsWith('*')) {
            mult = +mults[0].slice(1)
          } else {
            mult = 1/+mults[0].slice(1)
          }
          // log({mult})
        }
      }

      const int = Number(str)
      if(!isNaN(int)) {
        //FIXME clear logs
        // log({int})
        result += sign*int*mult
        continue
      }

      let subtree = ''
      if(str.includes(' ветви ')) {
        const subtreeRegexp = / вет[вк]и "?([^"]+)"?$/
        subtree = str.match(subtreeRegexp)[1]
        // log({subtree})
        str = str.replace(subtreeRegexp, '')
      }

      let tgtNodeType = null
      for(let nodeT in NODET_2_RU) {
        if(NODET_2_RU[nodeT] === str) {
          tgtNodeType = nodeT
          break
        }
      }
      
      const PARAM_TYPE = 'param'
      if(!tgtNodeType) {
        for(let paramList of paramLists) {
          for(let paramName of paramList) {
            if(paramName === str) {
              tgtNodeType = PARAM_TYPE
              break
            }
          }
          if(tgtNodeType) break
        }
      }

      if(!tgtNodeType) {
        warn('unknown tgtNodeType:',str, {nodes})
        return null
      }

      /** what is value of tgt param/size of tgt array */
      let tgtValue = 0

      /** @type {string} */
      let tgtArr = []
      switch(tgtNodeType) {
        case NODE_TYPE.TECH:
          tgtArr = Object.values(userDataObj.techTable).flat()
          break
        case NODE_TYPE.BUILDING:
          tgtArr = userDataObj.buildings
          break
        case NODE_TYPE.ORBITAL:
          tgtArr = userDataObj.orbital
          break
        case NODE_TYPE.PROJECT:
          tgtArr = userDataObj.localProjs
          break
        case NODE_TYPE.ASTROPROJECT:
          tgtArr = userDataObj.astroProjs
          break        
        case PARAM_TYPE:
          // TODO
          tgtValue = effects[str]
          if(!tgtValue) warn('not allowed as param in expression:', str)
          break
      }

      // log({tgtArr})

      if(subtree && !tgtValue) {
        tgtArr = tgtArr.filter( objName => 
          (
            (
              inverted.alltech[objName] &&
              inverted.alltech[objName].subtree 
            )
            || capitalizeFirstLetter(Analysis.getSubtreeName(TechUtils.byName(objName)))
          )
          === subtree
        )
      }
      
      // log({tgtArr})

      if(!tgtValue) tgtValue = tgtArr.length

      let interm = sign * tgtValue * mult
      if(mult < 1) interm = +interm.toFixed(0)
      result += interm
    }

    return result
  },

  listParam(param = 'costClear', fuckMilitary = true) {
    //delete stat['Military']
    const t = extractParam(param, fuckMilitary)
    let res = param + '\n'
    for (let i in t) {
      res += i + '\t'
    }
    res = res.slice(0, -1)
    res += '\n'
    // eslint-disable-next-line no-unused-vars
    for (let i in range(techData.MAX_TECH_LVL)) {
      for (let j in t) {
        res += (t[j].shift() || 0) + '\t'
      }
      res = res.slice(0, -1)
      res += '\n'
    }
    return res
  },

  listAllWithoutMilitary() {
    //delete stat['Military']
  
    let list = {}
    let res = []
  
    for (let i of KEYWORDS.COLONY_PARAMS) {
      list[i] = TechUtils.listParam(i).split('\n')
      for (let j in list[i]) {
        if (typeof res[j] == 'undefined')
          res[j] = list[i][j] + '\t'
        else
          res[j] += list[i][j] + '\t'
      }
    }
    return res.map(e => e.slice(0, -1)).join('\n').replace('Общество	Производство	Наука	Свободный', 'Общество				Производство				Наука				Свободный')
  },
}

const Colony =  /** @type {const} */({
  createColonyDescription(playerName) {
    if (!window['DATA__TECH_THRESHOLDS']) return ''
    const techThresholds = window['DATA__TECH_THRESHOLDS'].data
    // const planetDescriptions = window['DATA__TECH_THRESHOLDS'].planetDescriptions

    let res = '<br><b>ПЛАНЕТА</b><br>'

    const { planetParams } = UserUtils.getSavedUserData(playerName)

    res += VARS.effectsOfPlanetSize[planetParams['Тип планеты']].map(e => e.join(' ')).join('<br>')

    res += '<br><b>ТЕХНОЛОГИИ</b><br>'
    for (let tree in techThresholds) {
      for (let subtree in techThresholds[tree]) {
        let lastProperStr = null
        for (let conditionBlock of techThresholds[tree][subtree]) {
          if (subtree !== 'other') {
            if (
              conditionBlock[0] !== 'BASE'
              && !User.checkIfUserHasTech(playerName, conditionBlock[0])
            ) break
            lastProperStr = conditionBlock[1]
          } else {
            if (User.checkIfUserHasTech(playerName, conditionBlock[0])) res += `${conditionBlock[1]}. `
          }
        }
        if (lastProperStr) res += `${lastProperStr}. `
      }
      res += '<br><br>'
    }

    setTimeout(() => {
      const balanceData = Analysis.countTechBalanceBySubtree()[playerName]
      let chartData = []

      for (let treeName in techData.subtreeBorders) {
        const subtreeList = techData.subtreeBorders[treeName]
        const x = [treeName, 0, subtreeList[0].fill]
        for (let subtreeObj of subtreeList) {
          x[1] += +balanceData[capitalizeFirstLetter(subtreeObj.fullText)] || 0
        }
        chartData.push(x)
      }
      draw.pieChart(chartData)
    }, 10)

    res += '<br><b>СООТНОШЕНИЕ ТЕХНОЛОГИЙ</b><br>'
    res += draw.createCаnvasHTML({ size: 400, title: `${playerName}` })

    return res
  },
})

// semi-static methods
const UserUtils = /** @type {const} */({
  /**
   * @param {string} playerName 
   * @returns {TGoogleDocUserObj}
   */
  getSavedUserData(playerName) {
    return window[VARS.PLAYERS_DATA_KEY][playerName]
  },
})

const User = /** @type {const} */({

  activePlayer: null,

  drawActiveUser(treeName) {
    if (!this.activePlayer) return
    parseGDoc.drawTech(this.activePlayer, treeName)
  },

  /**
   * @returns {Object <string, TGoogleDocUserObj>}
   */
  getAllUsersData() {
    const filtered = Object.keys(window[VARS.PLAYERS_DATA_KEY])
      .filter(name => !name.startsWith('-'))
      .reduce((obj, key) => {
        return {
          ...obj,
          [key]: window[VARS.PLAYERS_DATA_KEY][key]
        }
      }, {})

    return filtered
  },

  listUsers() {
    return Object.keys(window[VARS.PLAYERS_DATA_KEY]).filter(name => !name.startsWith('-'))
  },

  formUsersCheckboxes() {
    // only after user data aquired
    let ts = ''
    for (let i of User.listUsers()) {
      const bgColor = UserUtils.getSavedUserData(i).playerColor
      ts += `<label><input type="checkbox" id="${i}">${i}</label>&nbsp;<span style="background-color: ${bgColor}">&emsp;</span><br>`
    }
    getEl('players_selection').innerHTML = ts
  },

  /**
   * @param {string} treeName 
   * @param {string[]} tech_list 
   * @returns 
   */
  highlightStudiedTech(treeName, tech_list) {
    let res = []
    const targets = Array.from(svg.getElementsByTagName('rect'))
      .concat(Array.from(svg.getElementsByTagName('polygon')))
      .concat(Array.from(svg.getElementsByTagName('ellipse')))
      .filter(e => typeof techData.badCells[treeName].find(a => a.id == e.id) === 'undefined')

    let list = tech_list
    const bad = {
      enemy: list
        .filter(e => e.search(/\(.*чужое/) != -1)
        .map(e => e.replace(/ \([^)]+\)/, '')),
      broken: list
        .filter(e => e.search(/\(.*сломано/) != -1)
        .map(e => e.replace(/ \([^)]+\)/, '')),
      inactive: list
        .filter(e => e.search(/\(.*неактивно/) != -1)
        .map(e => e.replace(/ \([^)]+\)/, '')),
    }
    list = list.map(e => e.replace(/ \([^)]+\)/, ''))

    for (let i of targets) {
      const name = tech[treeName][i.id].name
      const pos_tech = list.indexOf(name)
      if (pos_tech != -1) {
        if (bad.enemy.includes(name)) {
          i.setAttribute('fill', 'red')
          continue
        } else if (bad.broken.includes(name)) {
          i.setAttribute('fill', 'salmon')
          continue
        } else if (bad.inactive.includes(name)) {
          i.setAttribute('fill', 'gray')
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
   * @param {string|null} treeName 
   * @param {*} techList 
   * @returns {TTechObject[]}
   */
  listAvalTech(treeName, techList) {
    return techList
      .map(e => e.search('(чужое)') == -1 ? e : '')
      .map(e => e.replace(/\([^)]+\)/, '').trim())
      .filter(e => e)
      .map(
        /**
         * @param {TTechObject} e 
         */
        (e) => {
          const t = inverted.alltech[e]
          if (!t) return null
          if (treeName && t.treeName !== treeName) return null
          // if(t.req.length == 0) return t.id
          return t.next.map(e2 => tech[t.treeName][e2])
        })
      .flat()
      .filter(e => e)
  },

  /**
   * @returns {string[]}
   */
  getFlatUserTech(username) {
    if (techData.cache.usersFlatTech[username]) return techData.cache.usersFlatTech[username]
    const data = UserUtils.getSavedUserData(username)
    let projList = [].concat(data.buildings, data.orbital, data.localProjs, data.astroProjs)
    const result = Object.values(data.techTable).concat(projList).flat()
    techData.cache.usersFlatTech[username] = result
    return result
  },

  checkIfUserHasTech(playerName, techName) {
    return this.getFlatUserTech(playerName).includes(techName)
  },

  /**
   * @param {*} treeName 
   * @param {*} techList 
   * @param {*} projList 
   */
  highlightAvaltech(treeName, techList) {
    User.listAvalTech(treeName, techList)
      .map(e => e.id)
      .forEach(i => {
        if (getEl(i) && getEl(i).getAttribute('fill') == 'lightgrey') {
          getEl(i).setAttribute('fill', 'lightyellow')
        }
      })
  },

  /**
   * @param {TGoogleDocUserObj | undefined} userDataObj 
   */
  extractEffectsFromUserObj(userDataObj) {
    let result = {}

    if (userDataObj.colonyParams['Начальные кубы'])
      result['Начальные кубы'] = [].concat(
        userDataObj.colonyParams['Начальные кубы'].split('/')
          .map((e, i) => [KEYWORDS.COLONY_PARAMS[i], +e])
      )
    if (userDataObj.startingFeature) result.startingFeature = [].concat(userDataObj.startingFeature
      .map(i => TechUtils.isSpecial(i[0]) ? [':' + i[1], null] : [i[0], +i[1]])
    )
    if (userDataObj.uniqueResources) result.uniqueResources = [].concat(userDataObj.uniqueResources
      .map(i => TechUtils.isSpecial(i[0]) ? [':' + i[1], null] : [i[0], +i[1]])
    )
    if (userDataObj.planetParams) result.planetParams = [].concat(VARS.effectsOfPlanetSize[userDataObj.planetParams['Тип планеты']])
    if (userDataObj.greatPeople) result.greatPeople = [].concat(userDataObj.greatPeople
      .map(i => i.effect.map(j => j[0] === KEYWORDS.ITS_SPECIAL ? [':' + j[1], null] : [j[0], +j[1]]))
      .flat()
    )
    if (userDataObj.secondaryColonies) result.secondaryColonies = [].concat(userDataObj.secondaryColonies
      .map(colony => colony.effect.map(j => j[0] === KEYWORDS.ITS_SPECIAL ? [':' + j[1], null] : [j[0], +j[1]]))
      .flat()
    )
    return result
  },

  // TODO применять defaultProjectsList в эффектах
  /**
   * @param {string[]} techList list of tech names
   * @param {TGoogleDocUserObj | undefined} userDataObj 
   * @param {boolean} isVerbose TODO DOESN'T WORK NOW if record where effects came from
   * @returns {{cost: [string, effValue][], effect: [string, effValue][]}}
   */
  countSummaryCostAndEffect(techList, userDataObj = null) {
    let techListFiltered = techList
      .map(e => e.search('(сломано|неактивно)') == -1 ? e : '')
      .map(e => e.replace(/\([^)]+\)/, '').trim())
      .filter(techName => inverted.alltech[techName] || VARS.defaultProjectsList[techName])

    /**
     * @type {[effKey, number | string]}
     */
    let effectsData = [].concat.apply(
      [],
      techListFiltered.map(name => inverted.alltech[name]?.effect || VARS.defaultProjectsList[name]?.effect)
    )
    let costData = TechUtils.countCosts(techListFiltered)


    if (userDataObj) {
      effectsData = effectsData.concat(
        Object.values(this.extractEffectsFromUserObj(userDataObj)).flat()
      )
    }

    const addIfOnce = (str) => KEYWORDS.ONLY_ONCE_KW === str ? `${KEYWORDS.ONLY_ONCE_KW}: ` : ''

    const effect = {}
    const specEffectsList = []
    for (let [k, v] of effectsData) {
      if (TechUtils.isSpecial(k)) {
        k = ':' + addIfOnce(k) + v
        v = null
      }

      if(typeof v === 'string' && v.includes('[')) {
        specEffectsList.push([k, v])
        continue
      }

      if (!effect[k])
        effect[k] = +v
      else
        effect[k] += +v
    }

    for(let [k, v] of specEffectsList) {
      const res = TechUtils.parseExpression(v, userDataObj, effect) || 0
      effect[k] += res
      log('expression effect: ', k, res)
    }

    const cost = costData
      .filter(e => !KEYWORDS.COLONY_PARAMS.includes(e[0]))
      .filter(e => KEYWORDS.ANY_PARAM_KEYWORD !== e[0])

    return { cost, effect }
  },

  /**
   * @param {TGoogleDocUserObj} userDataObj 
   * @param {boolean} isVerbose DOESNT WORK if record where effects came from
   * @returns {Object.<string, effValue>}
   */
  countUserEffects(userDataObj, isVerbose = false) {
    if (!userDataObj) return null

    let data =
      // local: 
      // global: 
      this.countSummaryCostAndEffect([].concat(
        userDataObj.astroProjs,
        userDataObj.buildings,
        userDataObj.orbital,
        userDataObj.localProjs,
        Object.values(userDataObj.techTable).flat(),
      ), userDataObj, isVerbose).effect
    // }

    return data
  },

  /**
   * @param {*} playerName 
   * @returns {Object.<string, effValue>}
   */
  getUserEffects(playerName) {
    if (!playerName) return null
    return this.countUserEffects(UserUtils.getSavedUserData(playerName))
  },

  /**
   * 
   * @param {*} costListArr 
   * @param {Object <string, string>} userEff 
   * @returns 
   */
  createTechCostTable(costListArr, userEff) {
    if (!costListArr) return ''

    if (userEff) {
      costListArr = costListArr.map(([k, v]) => {
        if (KEYWORDS.MATERIALS.includes(capitalizeFirstLetter(k))) {
          const aval = userEff[capitalizeFirstLetter(k)]
          const resK = k + ` (есть ${aval})` +
            (aval < v ? ' (МАЛО)' : '')

          return [resK, v]
        }
        return [k, v]
      })
    }

    return TechUtils.createEffectsTable(costListArr, 'COST')
  },

  /**
   * @param {[string, effValue][]} effectsListArr 
   * @returns 
   */
  createUserTechEffectsTable(effectsListArr) {
    effectsListArr = effectsListArr
      .filter(e => {
        return !KEYWORDS.SINGLE_TIME_EFFECTS.includes(e[0])
          && KEYWORDS.SINGLE_TIME_EFFECTS.filter(e2 => e[0].endsWith(e2)).length == 0
          && KEYWORDS.MODULE_PROPS.filter(e2 => e[0].endsWith(e2)).length == 0
          && !KEYWORDS.PLANET_PARAMS.includes(e[0])
          && e[0] !== KEYWORDS.UNIT_TYPES_KEYWORD
          && e[0] !== KEYWORDS.UNIT_SLOTS_KEYWORD
          && !e[0].startsWith(':?')
      })
      .sort()
      .sort((a, b) => {
        if (KEYWORDS.COLONY_PARAMS.includes(a[0]) && !KEYWORDS.COLONY_PARAMS.includes(b[0])) return -1
        if (!KEYWORDS.COLONY_PARAMS.includes(a[0]) && KEYWORDS.COLONY_PARAMS.includes(b[0])) return 1
        if (KEYWORDS.COLONY_PARAMS.includes(a[0]) && KEYWORDS.COLONY_PARAMS.includes(b[0])) {
          return KEYWORDS.COLONY_PARAMS.indexOf(a[0]) - KEYWORDS.COLONY_PARAMS.indexOf(b[0])
        }
        return 0
      })
    // t = [].concat(t.main, t.additional)

    const militaryBonusesFn = ([key, _]) => key.startsWith(KEYWORDS.CREATION_KEYWORD)
      || KEYWORDS.MILITARY_PARAMS.some(paramName => key.startsWith(paramName))
      || KEYWORDS.MILITARY_PARAMS_ADDITIONAL.some(paramName => key.startsWith(paramName))

    return (
      TechUtils.createEffectsTable(effectsListArr.filter(e => KEYWORDS.COLONY_PARAMS.includes(e[0])), 'Параметры')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => e[0].startsWith(':')), 'Особые эффекты')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => KEYWORDS.IDEOLOGIES.includes(e[0]) || e[0].startsWith(KEYWORDS.IGNORE_CONDEMN_KW)), 'Идеология')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => KEYWORDS.TECH_EFFECTS.concat([KEYWORDS.RESERVE_KW]).includes(e[0])), 'Специализированные бонусы')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => e[0].startsWith(KEYWORDS.RESEARCH_KEYWORD) || e[0].startsWith(KEYWORDS.IGNORE_CRITFAIL_KW)), 'Исследования')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => KEYWORDS.MATERIALS.includes(e[0])), 'Ресурсы')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(e[0])), 'Дополнительные параметры')
      + TechUtils.createEffectsTable(effectsListArr.filter(militaryBonusesFn), 'Военные бонусы')
      + TechUtils.createEffectsTable(effectsListArr.filter(e => !KEYWORDS.COLONY_PARAMS.includes(e[0])
        && !e[0].startsWith(':')
        && !KEYWORDS.TECH_EFFECTS.includes(e[0])
        && !e[0].startsWith(KEYWORDS.RESERVE_KW)
        && !KEYWORDS.IDEOLOGIES.includes(e[0]) && !e[0].startsWith(KEYWORDS.IGNORE_CONDEMN_KW)
        && !e[0].startsWith(KEYWORDS.RESEARCH_KEYWORD) && !e[0].startsWith(KEYWORDS.IGNORE_CRITFAIL_KW)
        && !KEYWORDS.MATERIALS.includes(e[0])
        && !KEYWORDS.ADDITIONAL_COLONY_PARAMS.includes(e[0])
        && !militaryBonusesFn(e)
        // && !KEYWORDS.MILITARY_PARAMS.includes(e[0])
      ), 'Неотфильтрованные техи')
    )
  },

  drawUserStat(playerName) {
    const userData = UserUtils.getSavedUserData(playerName)
    const effectsDataObj = User.countUserEffects(userData)
    const effectsDataArr = Object.entries(effectsDataObj)
      .filter(e => !e[0].startsWith(`:${KEYWORDS.ONLY_ONCE_KW}`))

    const mainParamsSum = effectsDataArr.filter(e => KEYWORDS.COLONY_PARAMS.includes(e[0]))
      .reduce((acc, el) => acc += +el[1], 0)

    log(playerName, mainParamsSum, 'Эффективная Рождаемость:',
      (+effectsDataObj.Рождаемость || 0)
      - +(userData.additionalParams['чуждая среда'] || 0)
      - ((+(userData.additionalParams['непривычная среда'] || 0) > 0) ? 1 : 0)
      + +(effectsDataObj.Сверхадаптация || 0)
      + (+effectsDataObj.Метеозащита || 0))

    // checking if params in doc are bad
    effectsDataArr
      .forEach(eff => {
        if (KEYWORDS.COLONY_PARAMS.includes(eff[0]) && +userData.colonyParams[eff[0]] !== +eff[1]) {
          warn(`${eff[0]} ${userData.colonyParams[eff[0]]} should be ${eff[1]}`)
        }
        if (KEYWORDS.MATERIALS.includes(eff[0]) && +userData.materials[eff[0]] !== +eff[1]) {
          warn(`${eff[0]} ${userData.materials[eff[0]]} should be ${eff[1]}`)
        }
      })

    getEl('el_reports_list').innerHTML = `<br>
      <strong>Сводный отчет: ${playerName}</strong><br>
      <a target=_blank 
        href="./StarSystem.html#${userData.starSystemParams.generatorCode}&user=${playerName}&systemName=${userData.starSystemParams.name}">Звездная система</a>
      <br>
      <a target=_blank 
        href="./ColonyVisual.html?user=${playerName}">Внешний вид колонии</a>
      <br>
      `      
      + `<a onclick="Analysis.openReport('эффекты_игрока_подробно', {playerName: '${playerName}'})"
      class="fake_link">Эффекты игрока подробно</a>` 
      + this.createUserTechEffectsTable(effectsDataArr)

      + Colony.createColonyDescription(playerName)

    HTMLUtils.openModal('report', playerName)
  },
})

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

  Object.defineProperty(tech[tree_name], 'props', {
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
      if (!t) {
        // possibly empty cell
        continue
      }

      if (t.badCell) {
        const num = parseInt(t.fullText, 10)
        if( num  && num >= 1 && num <= techData.MAX_TECH_LVL) {
          const kardLvl = num <= 9 
            ? 0.1 * num + 0.2 
            : 1.1 + (num-9) * 0.2
          t.title = `Кардышев ${kardLvl.toFixed(1)} (E${((kardLvl+0.7)*10).toFixed(0)})`
        }
        techData.badCells[tree_name].push(t)
        continue
      }
      tech[tree_name][t.id] = t
    } catch (e) {
      warn(i, e)
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
      // just ignore it
      if (tree_name === 'Unique') {
        log('"Unique" parse err')
        continue
      }
      console.log(e, tree_name, target, tech[tree_name][target], source)
    }
  }

  inverted.tech[tree_name] = Object.fromEntries(
    Object.values(tech[tree_name]).map(e => [e.name, e.id])
  )

  draw.tech = tech
}

const parseGDoc = {
  lastRaw: null,
  lastNodes: null,
  lastResult: null,
  async HTML(rawHTML) {
    var arr
    if (!rawHTML) {
      warn('parseDoc: empty HTML')
      return
    }
    const html = Array.from((new DOMParser).parseFromString(rawHTML, 'text/html').body.childNodes[0].children)
    arr = html
      .filter(e => e.tagName !== 'BR')
      .map(({ tagName, innerText, children }) =>
        ({ tagName, innerText: innerText.trim(), el: children[0].parentElement }))

    if (arr.length < 3) {
      log('pretty sure it\'s not a proper google doc')
      return this.lastResult
    }

    // const CONTENT_TAGS = ['DIV', 'P', 'UL']
    let usersData = {}
    /**
     * @type {Object<string,TGoogleDocUserObj>}
     */
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
    for (let i in arr) {
      let el = arr[i]
      // its user
      if (el.tagName == 'H1') {
        if (last.user) {
          // res[last.planet] = interm.user
          usersData[last.user] = interm.user
        }
        last.user = el.innerText
        interm.user = {}
        continue
      }
      if (el.tagName == 'H2' && el.innerText !== 'Данные экспедиции' && el.innerText !== 'Чертежи') {
        interm.user.systemName = el.innerText
      }
      if (el.tagName.match(/H\d/)) {
        last.H = el.innerText
        continue
      }
      interm.user[last.H] = el.el
    }
    usersData[last.user] = interm.user
    this.lastNodes = usersData

    for (let username in usersData) {
      if (username === '[Персонаж]' || username === '[Разведанные миры]') {
        log('special name, skip:', username)
        continue
      }

      usersRes[username] = parseGDoc.playerHTML(username, usersData[username])

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
      this.lastResult = await parseGDoc.HTML(raw)
    } else {
      raw = await rawClipboardObj.getType('text/plain').then(e => e.text())
      warn('can\'t parse plaintext: deprecated and removed')
      // this.lastResult = parseDoc.text(raw)
    }
    this.lastRaw = raw
    if (getEl('el_doPlayersData').checked) {
      parseGDoc.GDocToJS()
    }
  },

  async redoLast() {
    this.lastResult = await parseGDoc.HTML(this.lastRaw)
  },

  playerHTML(playerName, obj) {
    /**
     * @param {string} str 
     * @returns {string[]}
     */
    const splitFilter = (str, treeRuName) => {
      let res = str.split(',').map(e => e.trim()).filter(e => e)

      if (treeRuName !== 'Уникальные') {
        res = res.filter(thingName => {
          const name = thingName.replace(/\([^)]+\)/, '').trim()
          const isKnown = name in inverted.alltech || name in VARS.defaultProjectsList || name.startsWith(':')
          if (!isKnown) {
            warn('unknown thing', playerName, thingName)
          }
          return isKnown
        })
      }

      return res
    }
    /**
     * there is usually the sixth block, "Unique"
     * @param {HTMLTableElement} el 
     * @returns 
     */
    const tech5TableToObj = el =>
      Object.fromEntries(
        Array.from(el.rows)
          .map(e => [VARS.TREELIST_RU2EN[e.children[0].innerText],
          splitFilter(e.children[1].innerText, e.children[0].innerText)]
          )
      )

    let colonyParams = Array.from(obj.Параметры.children[0].rows)
      .slice(1)
      .map(e => {
        return [e.children[0].innerText.trim().replace('Свободные кубы', 'Свободный'), e.children[1].innerText.trim()]
      })
    colonyParams = Object.fromEntries(colonyParams)

    let additionalParamsRaw = Array.from(obj['Дополнительные параметры'].children[0].rows)
      .map(e => Array.from(e.children))
    let ak = [].concat(additionalParamsRaw[0], additionalParamsRaw[2], additionalParamsRaw[4])
      .map(e => e.innerText.trim().toLowerCase().replace('неприв. среда', 'непривычная среда'))
    let av = [].concat(additionalParamsRaw[1], additionalParamsRaw[3], additionalParamsRaw[5])
      .map(e => e.innerText.trim())
    let additionalParams = {}
    while (ak.length) {
      let nextK = ak.pop()
      let nextV = av.pop()
      if (!nextK) continue
      additionalParams[nextK] = nextV
    }

    let materialsRaw = Array.from(obj['Ресурсы'].children[0].rows)
      .map(e => Array.from(e.children))
    ak = [].concat(materialsRaw[0], materialsRaw[2])
      .map(e => e.innerText.trim())
    av = [].concat(materialsRaw[1], materialsRaw[3])
      .map(e => e.innerText.trim())
    let materials = []
    while (ak.length) {
      let nextK = ak.shift()
      let nextV = av.shift()
      if (!nextK) continue
      materials.push([nextK, +nextV || 0])
    }
    materials = Object.fromEntries(materials.filter(e => e[0] !== '-'))

    const planetParams = Object.fromEntries(
      Array.from(obj['Характеристики планеты'].children[0].rows)
        .map(e => Array.from(e.children).map(e2 => e2.innerText.replace(/\([^)]*\)/g, '').replace(/\+\d+/g, '').trim()))
        .reduce((acc, e) => acc = acc.concat(e), [])
        .map((e, i, arr) => i % 2 ? [arr[i - 1], +arr[i]] : null)
        .filter(e => e)
    )

    // planet / system
    const systemNameData = obj.systemName.replace(/(Планета | ?звезда )/gi, '').trim().split(',')

    let starSystemParams = Array.from(obj['Характеристики звездной системы'].children[0].rows)
      .map(e => Array.from(e.children).map(e2 => e2.innerText))
    starSystemParams = {
      name: systemNameData[1],
      planetName: systemNameData[0],
      x: +starSystemParams[1][0],
      y: +starSystemParams[1][1],
      // Тип, масса и возраст звезды
      [starSystemParams[2][0]]: starSystemParams[2][1],
      // Плотность звёздной системы
      [starSystemParams[3][0]]: +starSystemParams[3][1].replace(/\([^)]+\)/g, '').trim(),
      generatorCode: starSystemParams[4][1]
    }

    const startingFeature = parseNode.effects(
      obj['Данные экспедиции'].children[0].rows[2].children[1].innerText
        .replace(/^[^-]+- ?/, '')
        .replace(/\([^)]+\)/g, ''),
      { treeName: null, name: 'Данные экспедиции' }
    )

    const playerColor = obj['Данные экспедиции'].children[0].rows[0].children[5].innerText

    let greatPeople = Array.from(obj['Великие люди'].children[0].rows)
    greatPeople.splice(0, 1)
    greatPeople = greatPeople
      .map(e => Array.from(e.children))
      .map(e2 => ({ name: e2[0].innerText, lvl: +e2[1].innerText, effect: e2[2].innerText.replace(/^.*-/, '').trim() }))
      .filter(e => e.lvl > 0)
    greatPeople.forEach(e => {
      e.effect = e.effect
        .replace('Х/2', Math.floor(e.lvl / 2))
        .replace(/2\*?Х/, e.lvl * 2)
        .replace('Х', e.lvl)
      // FIXME TODO
      e.effect = parseNode.effects(e.effect, { treeName: null, name: playerName + ': великие люди' })
    })

    let secondaryColonies = !obj['Вторичные колонии'] ? [] : Array.from(obj['Вторичные колонии'].querySelectorAll('tbody tr'))
      .map(row => Array.from(row.children).map(el => el.innerText))
    secondaryColonies.splice(0, 1)
    secondaryColonies = secondaryColonies.map(row => ({
      lvl: row[1],
      specialty: row[2],
      effect: parseNode.effects(row[3], { treeName: null, name: playerName + ' вторичные колонии' })
    }))

    let uniqueResources = Array.from(obj['Уникальные ресурсы'].children[0].rows)
    uniqueResources.splice(0, 1)
    if (uniqueResources.length == 1 && uniqueResources[0].innerText == '') uniqueResources = null
    else {
      uniqueResources = parseNode.effects(
        uniqueResources.map(e => e.children[2].innerText).join(','),
        { treeName: null, name: playerName + ' уникальные ресурсы' }
      )
    }

    const prepaired = obj.Здания.children[0].rows[0].children[1].innerText
      .trim()
      .split(',')
      .filter(e => e)

    const data = {
      playerColor,
      startingFeature,
      techTable: tech5TableToObj(obj['Изученные технологии'].children[0]),
      planetParams,
      starSystemParams,
      colonyParams,
      additionalParams,
      buildings: [].concat(
        // наземные
        splitFilter(obj.Здания.children[0].rows[2].children[1].innerText),
        // подземные
        splitFilter(obj.Здания.children[0].rows[3].children[1].innerText),
      ),
      orbital: splitFilter(obj.Здания.children[0].rows[4].children[1].innerText),
      astroProjs: splitFilter(obj.Здания.children[0].rows[5].children[1].innerText),
      prepaired,
      greatPeople,
      secondaryColonies,
      materials,
      uniqueResources,
      localProjs: splitFilter(obj.Здания.children[0].rows[1].children[1].innerText),
    }
    // log(Object.values(data).map(e=> e && e.innerHTML ? e.innerHTML.replace(/ style="[^"]+"/g,'') : e))

    return data
  },

  drawTech(playerName, treeName) {
    if (!this.lastResult) return
    const data = this.lastResult[playerName]

    let projList = [].concat(data.buildings, data.orbital, data.localProjs, data.astroProjs)
    User.highlightStudiedTech(treeName, data.techTable[treeName].concat(projList))
    User.highlightAvaltech(treeName, data.techTable[treeName].concat(projList))

    User.activePlayer = playerName
  },

  /**
   * 
   * @param {*} playerName 
   * @param {TGoogleDocUserObj} data 
   */
  drawAndSaveTechs(playerName, data) {
    for (let i of TREELIST) {
      drawTree(i)
      let projList = [].concat(data.buildings, data.orbital, data.localProjs, data.astroProjs)
      User.highlightStudiedTech(i, data.techTable[i].concat(projList))
      User.highlightAvaltech(i, data.techTable[i].concat(projList))
      savingOps.saveSvgAsPng(svg, `${playerName} ${i}.png`)
    }
  },

  GDocToJS() {
    if (!this.lastResult) {
      log('nothing to save')
      return
    }
    savingOps.saveFile('playersData.js', `var ${VARS.PLAYERS_TIMESTAMP_KEY} = '${(new Date()).toJSON()}'`
      + `\nvar ${VARS.PLAYERS_TURN_KEY} = ${window[VARS.PLAYERS_TURN_KEY]}`
      + `\nvar ${VARS.PLAYERS_DATA_KEY} = ` + JSON.stringify(this.lastResult, null, 2)
        .replace(/[“”]/g, '\\"')
        .replace(/\\"\\"/g, '\\"')
    )
  },
}

const TFiveTechObj = {
  Biology: [],
  Industry: [],
  Military: [],
  Science: [],
  Sociology: [],
  Unique: [],
}

// eslint-disable-next-line no-unused-vars
class TGoogleDocUserObj {
  startingFeature = []
  techTable = TFiveTechObj
  planetParams = {
    Вода: 0,
    Гористость: 0,
    'Масштаб аномалии': 0,
    'Расстояние до звезды': 0,
    'Ресурсы': 0,
    'Тип аномалии': 0,
    'Тип планеты': 0,
  }
  starSystemParams = {
    name: '',
    planetName: '',
    'x': 0,
    'y': 0,
    'Плотность звёздной системы': '',
    'Тип, масса и возраст звезды': 0,
  }
  colonyParams = {
    'Наука': 0,
    'Начальные кубы': '',
    'Общество': 0,
    'Производство': 0,
    'Свободные кубы': 0,
  }
  additionalParams = {}
  /** @type {Object<string, number>} */
  materials = {}
  /** @type {string[]} */
  astroProjs = []
  /** @type {string[]} */
  buildings = []
  /** @type {string[]} */
  orbital = []
  prepaired = []
  greatPeople = []
  /** @type { {lvl: string; specialty: string; effect: any[]}[] }  */
  secondaryColonies = []
  uniqueResources = []
  localProjs = []
}

// eslint-disable-next-line no-unused-vars
const playerPost = {
  playerName: null,

  open() {
    const p = getEl('post_text_iframe').contentWindow.document.body.firstChild.innerHTML
    playerPost.process(p)
    HTMLUtils.openModal('selected_tech')
  },
  prompt() {
    let p = prompt('player post here')
    if (!p) return
    playerPost.process(p)
    HTMLUtils.openModal('selected_tech')
  },
  close() {
    HTMLUtils.closeModal('selected_tech')
  },

  process(text) {
    // console.time('playerPost parse')
    this.playerName = this.detectPlayer(text)
    this.remindSpecialEffects(this.playerName)
    this.parse(text)
    setTimeout(_ => HTMLUtils.addTableSorting('#el_selected_tech_list table'), 50)
    setTimeout(() => {
      // console.time('playerPost countTechStudyResult')
      this.countTechStudyResult(this.playerName)
      setTimeout(_ => this.selectTreeByTableCellColor(), 400)
    }, 70)
  },

  selectTreeByTableCellColor() {
    try {
      const colorArr = qs('#el_selected_tech_list table td').style.backgroundColor
        .split('(')[1]
        .slice(0, -1)
        .split(',')
        .map(e => +e)
      const treeName = FILL_2_TREE_TYPE[rgbToHex(...colorArr).toUpperCase()]
      if (treeName) drawTree(treeName)
    } catch (err) { }
  },

  extractRolls(text) {
    // L means "location in array returned by regexp"
    const L = {
      before: 1,
      edges: 2,
      rolls: 3,
      // TODO looks like it is never used and shouldn't be
      after: 3,
    }
    const res = [...text.matchAll(/([^\nd]*)\d+d(\d{1,2}0): \((\d+(?: \+ \d+){0,20})\) = \d+([^\n]*)/g)]
      .map(e => {
        const s = (e[L.before].length ? e[L.before] : e[L.after]).trim()
        const threshold = [...(e[L.before] + e[L.after]).matchAll(/(?:Сложность|Цена):? ?(\+?\d+)/gi)]

        const isExp = s.search(/опыт /i)
        if (isExp === 0) {
          console.log('ОПЫТ detected:', s, s.search(/опыт/i))
          return {}
        }
        let resThreshold = null
        if (threshold.length) {
          if (threshold[0][1].startsWith('+')) {
            resThreshold = threshold[0][1]
          } else {
            resThreshold = '+' + threshold[0][1]
          }
        }

        return {
          text: s
            .replace(/\([^)]+\)/g, '')
            .replace(/^\d[).] ?/gi, '')
            // TODO scream test: was used to remove numeration? do not remove at least for two active turns
            // .replace(/^[^а-яёa-z0-9]+/gi,'')
            // reportBadSymbolsInTechName()
            .split(',')[0]
            .split('.')[0]
            .split(' – ')[0]
            .replace(/,? ?Сложность:? ?\d+/gi, '')
            .replace(/[- :]+$/g, '')
            .trim(),
          rolls: e[L.rolls],
          rawRolls: e[L.rolls],
          threshold: resThreshold,
          edges: +e[L.edges],
          index: e.index,
        }
      })
      .filter(e => e)

    // const res = [...text.matchAll(/([^\n]*)\d+d10: \((\d+(?: \+ \d+){0,20})\)(?:[^\n]*Сложность:? ?(\d+))?/g)]
    //   .map(e => ({ text: (e[1].length ? e[1] : '').trim(), rolls: e[2], threshold: +e[3], index: e.index, rawRolls: e[2] }))
    //   .map(({text, rolls, rawRolls, threshold, index} ) => ( {
    //      text: text.replace(/\([^)]+\)/g,'').replace(/^[^а-яёa-z]+/gi,''), 
    //      rolls, rawRolls, threshold, index 
    //   }))
    return res
  },

  detectPlayer(text) {
    const firstWord = text.slice(0, Math.min(text.indexOf(' '), text.indexOf('\n'), text.indexOf(':')))
    const playerName = User.listUsers().filter(playerName => playerName.startsWith(firstWord))[0]
    if (!playerName) return

    for (let i of getEl('players_selection').querySelectorAll('label')) {
      if (i.innerText.startsWith(firstWord)) {
        if (!i.querySelector('input[type="checkbox"]').checked) {
          i.click()
        }
        return i.innerText
      }
    }
  },

  remindSpecialEffects(playerName) {
    if (!playerName) {
      // Напоминание об эффектах
      getEl('el_special_tech_eff_reminder').innerHTML = 'нет (не установлен игрок)'
      return
    }
    const userEff = User.getUserEffects(playerName)

    const remindTechs = Object.entries(userEff).filter(([key, _]) => {
      return key.startsWith(KEYWORDS.IGNORE_CRITFAIL_KW)
        || key === KEYWORDS.RESERVE_KW
        || key.endsWith(KEYWORDS.NO_CONDEMN_KW)
        || key.endsWith(KEYWORDS.IGNORE_CONDEMN_KW)
    }).map(([key, value]) => value ? key + ': ' + value : key)

    const currGreatPplCost = Math.max(
      Math.floor(UserUtils.getSavedUserData(playerName).greatPeople.length / 2)
      , 2
    )

    getEl('el_special_tech_eff_reminder').innerHTML = `${playerName}: цена Великого человека: ${currGreatPplCost}; ` + remindTechs.join(', ')
  },

  parse(text) {
    let requests = this.extractRolls(text)

    for (let i of requests) {
      let rolls = {
        sum: 0,
        critfails: 0,
        wins: 0,
        critwins: 0,
        delta: 0,
        critdelta: 0
      }
      for (let j of i.rolls.split(' + ')) {
        rolls.sum += 1
        if (j == '1') rolls.critfails += 1
        if (j == '10') {
          rolls.critwins += 1
          continue
        }
        if (+j > 4) rolls.wins += 1
      }
      rolls.delta = rolls.critwins * 2 + rolls.wins
      rolls.critdelta = rolls.critwins - rolls.critfails
      i.rolls = rolls
    }

    let bonusThings = [...text.matchAll(/\+\+([^+]+)\+\+/g), ...text.matchAll(/\n(===)+/g)].map(e => ({
      text: e[1],
      rolls: {
        sum: null,
        critfails: null,
        wins: e[1].startsWith('-') ? -1 : null,
        critwins: null,
        delta: null,
        critdelta: null,
      },
      index: e.index,
      rawRolls: null
    }))
    requests = requests.concat(bonusThings)
      .sort((a, b) => a.index - b.index)
    const rollsTotal = requests.reduce((sum, e) => sum + +e.rolls.sum, 0)

    // Array.from(document.querySelectorAll('#el_selected_tech_list tbody tr:not([style="background-color: goldenrod;"]) td:nth-child(2)')).map(e => +e.textContent).reduce((partialSum, a) => partialSum + a, 0)
    getEl('el_selected_tech_list').innerHTML = `<table class=hide-interm-columns>
    <thead>
      <th>${['Субд', 'Технология', 'Цена', 'КПров', 'Усп', 'КУсп', 'Брош.', 'Дельт', 'КДлт'].join('</th><th>')}</th>
      <th 
        onclick="this.parentNode.parentNode.parentNode.tBodies[0].appendChild(this.parentNode.parentNode.parentNode.tBodies[0].rows[0].cloneNode(true))">
      <button>+</button>
      </th>
    </thead>
    <tbody>
    <tr>
    ${requests.map(e => '<td>' + ['', e.text, e.threshold, e.rolls.critfails, e.rolls.wins, e.rolls.critwins, e.rolls.sum, e.rolls.delta, e.rolls.critdelta].join('</td><td>') + '</td>' +
      '<td><button onclick=this.parentNode.parentNode.remove()>X</button></td>')
        .join('</tr><tr>')}
    </tr>
    </tbody><tbody>
    <tr>
      <td></td>
      <td>ВСЕГО</td>
      <td>${requests.reduce((sum, e) => sum + +(e.threshold || 0), 0)}</td>
      <td>${requests.reduce((sum, e) => sum + +e.rolls.critfails, 0)}</td>
      <td>${requests.reduce((sum, e) => sum + Math.max(+e.rolls.wins, 0), 0)}</td>
      <td>${requests.reduce((sum, e) => sum + +e.rolls.critwins, 0)}</td>
      <td>${rollsTotal}</td>
    </tr>
    <tr>
      <td></td>
      <td>СТЕПЕНЬ ОТКАЗА ТЕОРВЕРА</td>
      <td contenteditable=false><button onclick="qs('#el_selected_tech_list table').className=''" title='Expand hidden columns'>E</button></td>
      <td>${(requests.reduce((sum, e) => sum + +e.rolls.critfails, 0) / rollsTotal / 0.1 * 100 - 100).toFixed(0)}%</td>
      <td>${(requests.reduce((sum, e) => sum + Math.max(+e.rolls.wins, 0), 0) / rollsTotal / 0.6 * 100 - 100).toFixed(0)}%</td>
      <td>${(requests.reduce((sum, e) => sum + +e.rolls.critwins, 0) / rollsTotal / 0.1 * 100 - 100).toFixed(0)}%</td>
      <td></td>
    </tr>
    
    </tbody></table>
    Чтобы "Цена" не перезаписывалась - добавь в начало '+'`
  },

  fieldPositionsInTable: /** @type {const} */({
    subtree: 0,
    name: 1,
    price: 2,
    critfails: 3,
    wins: 4,
    critwins: 5,
    sum: 6,
    delta: 7,
    critdelta: 8,
  }),

  formBattleRolls() {
    const pos = playerPost.fieldPositionsInTable
    let result = Array.from(getEl('el_selected_tech_list').children[0].tBodies[0].rows)
      .map(e => {
        return e.children[pos.name].innerText + ': ' +
          (+e.children[pos.wins].innerText + +e.children[pos.critwins].innerText)
      }).join('\n')
    navigator.clipboard.writeText(result)
    alert('copied')
  },

  countTechStudyResult(playerName = playerPost.playerName) {
    const pos = playerPost.fieldPositionsInTable

    const isSpecialCost = (resourceName) =>
      KEYWORDS.SPECIAL_TECH_COST.includes(resourceName)
      || KEYWORDS.MATERIALS.includes(capitalizeFirstLetter(resourceName))
    // TODO
    // || TechUtils.get(resourceName.replace(':', ''))

    const userEffects = User.getUserEffects(playerName)

    const currRes = Object.assign({}, userEffects)
    for (let resourceName of Object.keys(currRes)) {
      if (!isSpecialCost(resourceName))
        delete currRes[resourceName]
    }

    getEl('el_selected_tech_list').hidden = true
    let techList = Array.from(getEl('el_selected_tech_list').children[0].tBodies[0].rows)
      .map(e => {
        if (!e.children[pos.name]) return null

        let result = null

        // in case we are reparsing
        e.style.backgroundColor = ''
        // e.children[pos.name].style.backgroundColor = ''
        // e.children[pos.critfails].style.backgroundColor = ''
        // e.children[pos.critwins].style.backgroundColor = ''
        e.children[pos.delta].style.backgroundColor = ''
        e.children[pos.critdelta].style.backgroundColor = ''
        e.children[pos.name].title = ''

        // // collapse critfails/critwins
        // const critfails = +e.children[pos.critfails].innerText
        // const critwins = +e.children[pos.critwins].innerText
        // const critdelta = Math.abs(critfails-critwins) || critfails
        // if(critfails > 0 && critwins > 0) {
        //   e.children[pos.critfails].innerText = critfails - critdelta
        //   e.children[pos.critwins].innerText = critwins - critdelta
        // }

        /**
         * @type {string}
         */
        const techText = e.children[pos.name].innerText.trim()

        const isReserve = techText.startsWith('Резерв')

        if (+e.children[pos.critfails].innerText > 0 && !isReserve) {
          e.children[pos.critfails].style.backgroundColor = 'tomato'
        }

        if (+e.children[pos.critwins].innerText > 0 && !isReserve) {
          e.children[pos.critwins].style.backgroundColor = 'lawngreen'
        }

        const critdelta = +e.children[pos.critdelta].innerText
        if (critdelta > 0) {
          e.children[pos.critdelta].style.backgroundColor = 'lawngreen'
        } else if (critdelta < 0) {
          e.children[pos.critdelta].style.backgroundColor = 'tomato'
        }

        const sum = +e.children[pos.wins].innerText
          + +e.children[pos.critwins].innerText * 2
          - +e.children[pos.critfails].innerText

        const tTech = TechUtils.get(techText)

        if (tTech) {

          e.children[pos.name].style.backgroundColor = tTech.fill
          
          if(tTech.subtree) {
            e.children[pos.subtree].innerText = tTech.subtree.slice(0, 3)
            e.children[pos.subtree].title = tTech.subtree
            e.children[pos.subtree].style.backgroundColor = tTech.fill
          }

          // special cost
          const materialsCost = tTech.cost
            .filter(([k2, _v]) => isSpecialCost(k2))
          if (materialsCost.length) {
            // e.children[pos.price].innerText = 
            //   +e.children[pos.price].innerText + specCost.reduce((acc, [_k,v])=> acc += +v, 0)
            e.children[pos.price].title = materialsCost.map(([k, v]) => `${k} ${+v}; `)
            e.children[pos.price].style.backgroundColor = 'aquamarine'
            for (let [name, val] of materialsCost) {
              name = capitalizeFirstLetter(name)
              if (currRes[name]) {
                if (currRes[name] - val < 0) {
                  e.children[pos.price].title += `ДЕФИЦИТ ${name}: ${val - currRes[name]}; `
                  currRes[name] = 0
                  e.children[pos.price].style.backgroundColor = 'tomato'
                } else {
                  currRes[name] -= val
                }
              } else {
                e.children[pos.price].title += `НЕДОСТУПНЫЙ РЕСУРС ${name}; `
                e.children[pos.price].style.backgroundColor = 'tomato'
              }
            }

          }
          if (!e.children[pos.price].innerText.startsWith('+')) {
            e.children[pos.price].innerText = tTech.cost[0][1]
          } else {
            e.children[pos.price].title = 'Обычная цена: ' + tTech.cost[0][1] + '; ' + e.children[pos.price].title
          }

          result = techText
        } else {
          console.log('Не найдено', techText)
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
        if (+e.children[pos.delta].innerText > 1) {
          e.children[pos.delta].style.backgroundColor = 'aquamarine'
        }
        return result
      })
      .filter(e => e)

    // getEl('el_selected_tech_list').children[0].tBodies[1].rows[0].children[pos.delta-1].innerText = summaryDelta
    const studyResult = User.countSummaryCostAndEffect(techList)

    // можно добавить как "разово"
    // почти наверняка ресурсы выше вычитаются неправильно
    // const unusedMaterials = Object.keys(currRes)
    //   .reduce((acc, i) => acc + TechUtils.getMaterialSeries(i)*currRes[i], 0)

    getEl('el_tech_result_list').innerHTML =
      User.createTechCostTable(studyResult.cost, userEffects) +
      // TechUtils.createEffectsTable(costListArr, 'COST') +
      User.createUserTechEffectsTable(Object.entries(studyResult.effect))

    const byType = {
      [NODE_TYPE.TECH]: [],
      [NODE_TYPE.BUILDING]: [],
      [NODE_TYPE.ORBITAL]: [],
      [NODE_TYPE.PROJECT]: [],
      [NODE_TYPE.ASTROPROJECT]: [],
    }

    techList.forEach(techName => {
      if (VARS.NON_WAR_NODE_TYPES_ARR.includes(TechUtils.get(techName).type)
        && !Object.keys(VARS.defaultProjectsList).includes(techName)
      )
        byType[TechUtils.get(techName).type].push(techName)
    })

    // Раскладка по типам
    getEl('el_tech_by_type_list').innerHTML = [
      ['Технологии', byType[NODE_TYPE.TECH]],
      ['Здания', byType[NODE_TYPE.BUILDING]],
      ['Орбитальные здания', byType[NODE_TYPE.ORBITAL]],
      ['Проекты', byType[NODE_TYPE.PROJECT]],
      ['Астропроекты', byType[NODE_TYPE.ASTROPROJECT]],
    ].map(([columnName, namesList]) => {
      if (!namesList.length) return ''
      let tableStr
      if (columnName === 'Технологии') {
        //sort and display by tree type
        tableStr = Object.entries(namesList
          .reduce((acc, name) => {
            const field = TechUtils.get(name).fill
            if (acc[field] instanceof Array) {
              acc[field].push(name)
            } else {
              acc[field] = [name]
            }
            return acc
          }, {}))
          .sort((a, b) =>
            TREELIST.indexOf(VARS.fill2TreeType[a[0]])
            - TREELIST.indexOf(VARS.fill2TreeType[b[0]])
          )
        tableStr = tableStr.map(e2 =>
          `
          <span style="background-color:${e2[0]}">
            ${VARS.fill2TreeType[e2[0]]}
          </span>
          <span onclick="navigator.clipboard.writeText(this.textContent); this.style.backgroundColor='darkgrey'"
          >${e2[1].join(', ')}, </span>
          <br>`).join('')
      } else {
        tableStr = `
        <span onclick="navigator.clipboard.writeText(this.textContent); this.style.backgroundColor='darkgrey'"
        >${namesList.join(', ')}, </span>`
      }

      return `<strong>${columnName}</strong>
      <div>
        ${tableStr}
      </div>`
    }
    ).join('')
    getEl('el_selected_tech_list').hidden = false
  }
}

// eslint-disable-next-line no-unused-vars
class TTechObject {
  id = ''
  type
  treeName = ''
  subtree = ''
  borderColor
  name
  lvl = 0
  /** @type {[string, string]} */
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

// просто копируй ключевое слово вперёд нужного списка, если нужно его включить
var KEYWORDS = /** @type {const} */ ({
  ITS_SPECIAL: 'особое',
  ALL_RIGHT: 'особое:$1',
  // alter with caution, used in decoding of "Начальные параметры"
  COLONY_PARAMS: [
    'Наука'
    , 'Производство'
    , 'Общество'
    , 'Свободный'
  ],
  ANY_PARAM_KEYWORD: 'Свободный',
  ADDITIONAL_COLONY_PARAMS: [
    'осуждение',
    'волнения',
    'непривычная среда',
    'чуждая среда',
    'защита колонии',
    'щит планеты',
    'снабж. отряды',
    //особые
    'Образцы',
    'Экзоты',
    'Аномалия',
  ],
  SPECIAL_TECH_COST: [
    'затраты',
    'специалисты',
  ],
  PLANET_PARAMS: [
    'Вода',
    'Гористость',
    'Ресурсы',
    'Отказ',
  ],
  // TECH_PROPS: [],
  MATERIALS: [
    // 1 ряд
    'Сталь',
    'Нефть',
    // 2 ряд
    'Редкие металлы',
    'Трансураны',
    // 3 ряд
    'Наноматериалы',
    'Антиматерия',
    // 4 ряд
    'Стазокерамика',
    // TODO whoopsie, breaks material series detection
    'Экзотическая материя',
    'Экзотматерия',
    // 5 ряд
    'Нейтроний',
    'Гиперплазма',
  ],
  RESEARCH_KEYWORD: 'Исследования',
  TECH_KW: 'Технология',
  IGNORE_CRITFAIL_KW: 'Игнорирование критпровала',
  IGNORE_CONDEMN_KW: 'Игнорирование осуждения',
  NO_CONDEMN_KW: 'не приносит осуждения',
  RESERVE_KW: 'Резерв',
  TECH_EFFECTS: [
    // индустрия
    'Планетарная разведка',
    'Солнце',
    'Строительство',
    'Пуски',
    'Орбита',
    'Астроинженерия',
    // биология и терраформинг
    'Метеозащита',
    'Терраформинг',
    'Генные модификации',
    'Адаптация',
    'Сверхадаптация',
    'Взаимодействие с местной биосферой',
    // социальные
    'Дипломатия',
    'Шпионаж',
    'Контршпионаж',
    'Пропаганда',
    'Полиция',
    'Устранение последствий',
    'Осуждение',
    'Доверие',
    // военные
    'Конверсия',
    'Ремонт',
    'Ремонт (?:армий|флотов)',
    'Бомбардировка',
    'Скорость FTL',
  ],
  IDEOLOGIES: [
    // идеологии/zeals
    'ГМО',
    'Хром',
    'Чистота',
  ],
  // приз за цепочку технологий, может нарушать правила стоимости
  REWARD_KEYWORD: 'приз',
  TECH_COST_MODS: [
    'базовое',
    'чудо',
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
    'в системе',
    'вне родной системы',
  ],
  ONLY_ONCE_KW: 'разово',
  ONE_USE_KW: 'одноразовый',
  SINGLE_TIME_EFFECTS: [
    '\\?',
    'одноразовый',
    'выдаётся при высадке',
    'выдаётся на старте',
    'позволяет перебросить куб на Ресурсы \\(только вверх\\)',
  ],
  TECH_EFFECT_MODS: [
    'наземное',
  ],
  UNIT: {
    price: 'Цена',
    initialParams: 'Исходные А/З/С',
    experience: 'Опыт',
    home: 'Родина',
    location: 'Локация',
    hp: 'Здоровье',
    shield: 'Щит',
    modules: 'Модули',
    specials: 'Особенности',
  },
  MILITARY_PARAMS: [
    'Атака',
    'Защита',
    'Скорость',
  ],
  MILITARY_PARAMS_ADDITIONAL: [
    'Уклонение',
    'Щит',
  ],
  UNIT_SLOTS_KEYWORD: 'Слоты',
  UNIT_TYPES_KEYWORD: 'Тип юнита',
  CREATION_KEYWORD: 'Создание',
  UNIT_POINTS_KEYWORD: 'Очки распределения',
  UNIT_TYPES: Object.keys(VARS.hulls),
  DAMAGE_TYPES: [
    'био',
    'рад',
    'нано',
    'странглет',
  ],
  MODULE_NUM_PROPS: [
    'Полёт',
    'Защита колонии',
    'Щит планеты',
    'Мины',
    'Гарантированная защита',
    'Двигатель',
    'Регенерация',
    'Любимец',
  ],
  MODULE_PROPS: [
    'ДУ',
    'роботы',
    'гигер',
    'нет FTL',
    'ужас',
    'массовое',
    'ракеты',
    'ЭМИ',
    'ББ',
    //!!!
    'осадное',
    'экранирование',
    'FTL',
    'пред-FTL',
    'автономность',
    'ПКО',
  ],
})

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

  cost(costRaw, { treeName, name }, studyCubesType) {
    const cost = costRaw
      .split(',')
      .map(e => e
        .trim()
        .replace(/:/g, VARS.DISABLE_PARSE_IMMUNITY ? '' : KEYWORDS.ITS_SPECIAL + ':')
        .replace(/ {2,}/g, ' ')
        .replace(new RegExp(`^(${KEYWORDS.REWARD_KEYWORD})$`), KEYWORDS.ALL_RIGHT)
        .replace(new RegExp(`^(${KEYWORDS.TECH_COST_MODS.join('|')})$`), KEYWORDS.ALL_RIGHT)
        .replace(/^(\d+)$/i, studyCubesType + ':$1')
        .replace(/^(\d+) этапа$/i, 'Этапы:$1')
        .replace(/^любая тех. (.+)$/i, 'Любая технология:$1')
        .replace(/^(\d+) слот(а|ов)$/i, 'Слоты:$1')
        .replace(/^тех. (.+)$/i, KEYWORDS.TECH_KW + ':$1')
        .replace(new RegExp(`^(${KEYWORDS.SPECIAL_TECH_COST.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.ADDITIONAL_COLONY_PARAMS.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.IDEOLOGIES.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MATERIALS.join('|').toLowerCase()}) ?\\((\\d+)\\)$`), '$1:$2')
        .split(':')
      )

    if (cost.some(e => e.length < 2)) {
      warn('bad cost', treeName, name, cost, costRaw)
      techData.badTechCount++
    }

    return cost
  },

  effects(effectRaw, { treeName, name } = { treeName: null, name: null }) {
    if (!effectRaw.length) return []

    const digitRE = '([+-]?(\\d+|\\[[^\\]]+\\]))'

    const effect = effectRaw
      // .trim()
      .split(',')
      .map(e => e
        .trim()
        .replace(/:/g, VARS.DISABLE_PARSE_IMMUNITY ? '' : KEYWORDS.ITS_SPECIAL + ':')
        .replace(/ {2,}/g, ' ')
        .replace(new RegExp(`^(${KEYWORDS.COLONY_PARAMS.join('|')}) ${digitRE}$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.ADDITIONAL_COLONY_PARAMS.join('|')}) ${digitRE}$`), '$1:$2')
        .replace(/^\+?(\d+) свободн(ый|ых) куба?$/i, 'Свободный:$1')
        .replace(new RegExp(`^${KEYWORDS.ONLY_ONCE_KW} (.*)`, 'i'), `${KEYWORDS.ONLY_ONCE_KW}:$1`)
        // вещества
        .replace(new RegExp(`^(${KEYWORDS.MATERIALS.join('|')}) ${digitRE}$`), '$1:$2')
        // параметры планеты
        .replace(new RegExp(`^(${KEYWORDS.PLANET_PARAMS.join('|')}) ${digitRE}`), '$1:$2')
        // Эффекты и бонусы:
        .replace(new RegExp(`^(${KEYWORDS.TECH_EFFECTS.concat([KEYWORDS.RESERVE_KW]).join('|')}) ${digitRE}$`), '$1:$2')
        // идеологии
        .replace(new RegExp(`^(${KEYWORDS.IDEOLOGIES.join('|')}) ${digitRE}$`), '$1:$2')
        // Плюсы к научным веткам
        .replace(/^Вет(?:ка|вь) "?([^"]+)"? ([+-]?\d+)/i, KEYWORDS.RESEARCH_KEYWORD + ' (ветка "$1"):$2')
        .replace(/^\+?(\d+) (?:куб(?:а|ов)? )?к вет(?:ке|ви) "([^"]+)"/i, KEYWORDS.RESEARCH_KEYWORD + ' (ветка "$2"):$1')
        // игнорирование осуждения принесенного за ход
        .replace(new RegExp(`^(${KEYWORDS.IGNORE_CONDEMN_KW} \\([^\\)]+\\)) ${digitRE}$`), '$1:$2')
        // игнорирование критпровала, всегда +1
        .replace(new RegExp(`^(${KEYWORDS.IGNORE_CRITFAIL_KW} \\([^\\)]+\\))$`), '$1:+1')
        // армии и звездолёты
        .replace(new RegExp(`^(${KEYWORDS.UNIT_TYPES.join('|')})$`), KEYWORDS.UNIT_TYPES_KEYWORD + ':$1')
        // .replace(/(армия|$/, 'Тип отряда:$1')
        .replace(/(\d+) слот(?:а|ов)?$/i, KEYWORDS.UNIT_SLOTS_KEYWORD + ':$1')
        // .replace(/(\d+) слота? (МО|ПКО)$/i, KEYWORDS.UNIT_SLOTS_KEYWORD + '($2):$1')
        // модули и оружие, глобальные военные эффекты
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) ${digitRE}$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS_ADDITIONAL.join('|')}) ${digitRE}$`), '$1:$2')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) (армий|флотов) ${digitRE}$`), '$1 $2:$3')
        .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS_ADDITIONAL.join('|')}) (армий|флотов) ${digitRE}$`), '$1 $2:$3')
        .replace(/^\+?(\d+) очк(?:о|а|ов)? распределения (армиям|флотам)? ?/, 'Очки распределения $2:$1')
        .replace(new RegExp(`^(${KEYWORDS.MODULE_NUM_PROPS.join('|')}) \\+?([\\d.]+)$`), '$1:$2')
        .replace(/^Создание (армий|флотов|модулей|гигеров|(?:наземных|космических) баз|хабитатов) \+?(\d+)$/, KEYWORDS.CREATION_KEYWORD + ' $1:$2')
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

    if (effect.some(e => e[0] && e.length < 2)) {
      // it is non-split => not recognized string
      techData.badTechCount++
      warn(treeName, name, effect.filter(e => e.length < 2)[0], effectRaw)
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
    if (descrDataEl) {
      title = descrDataEl.innerHTML.replace(/(<!\[CDATA\[|\]\]>)/g, '')
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

      if (t.fullText.length <= 2) {
        // its number, lessen width
        t.w = t.w / 1.4
        t.x = +t.x + +t.w - 5
      }
      t.nodeCenter = {
        x: ++t.x + ++t.w / 2
        , y: ++t.y + ++t.h / 2
      }
      return t
    }

    if (nodeText.indexOf(sepDifficulty) == -1 || nodeText.indexOf(sepEffect) == -1) {
      // possibly empty node
      // warn(nodeText)
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

function doNodeStat(filename, t) {
  var effects = t.effect,
    cost = t.cost

  if (!stat[filename][t.y]) {
    /*
      sum is sum of all param cubes avaliable,
      cost is full cost of level, 
      costClear is param-tech-only cost
    */
    stat[filename][t.y] = {
      Общество: 0, Производство: 0, Наука: 0, Свободный: 0,
      cost: 0, costClear: 0, sum: 0
    }
  }

  for (let effect of effects) {

    if (!KEYWORDS.COLONY_PARAMS.includes(effect[0])) continue

    stat[filename][t.y][effect[0]] += +effect[1]

    stat[filename][t.y].sum += +effect[1]
  }

  if (!KEYWORDS.COLONY_PARAMS.includes(effects[0][0])) return

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

// eslint-disable-next-line no-unused-vars
class TUnit {
  name = ''
  hull = ''
  price = 0
  experience = 0
  home = ''
  location = ''

  initialParams = []
  attack = 0
  defense = 0
  speed = 0

  hp = 0
  shield = 0
  modules = []
  specials = []

  static parse(text) {
    // TODO Локация Уровень 
    const arr = text.replace(/\n/g, ' - ').split(' - ').map(e => e.trim())
    var result = {
      hull: arr[0],
      name: arr[1] || '',
      price: +arr.find(el => el.startsWith('Цена')).replace('Цена', ''),
      initialParams: arr.find(el => el.startsWith('Исходные А/З/С')),
      experience: +arr.find(el => el.startsWith('Опыт')).replace(/Опыт/i, ''),
      home: arr.find(el => el.startsWith('Родина')).replace(/Родина/i, ''),
      hp: arr.find(el => el.startsWith('Здоровье')).replace(/Здоровье/i, ''),
      shield: arr.find(el => el.startsWith('Щит')).replace('Щит ', ''),
      modules: arr.find(el => el.startsWith('Модули')).replace(/Модули:/i, '') || '',
      specials: arr.find(el => el.startsWith('Особенности:'))?.replace(/Особенности:/i, '') || '',
    }
    console.log(result)
    return result
  }

  /**
   * @param {TUnit} unit 
   * @param {TGoogleDocUserObj} userObj - to count possible global effects
   */
  static stringify(unit, userObj = {}) {
    //TODO
    return `${unit.hull} - ${unit.name} - 
${KEYWORDS.UNIT.price} ${unit.price} - ${KEYWORDS.UNIT.home} ${unit.home} - Локация ${unit.location || unit.home} -
Уровень 0 - Опыт ${unit.experience} - Слоты 1
Суммарные А/З/С Атака 1. Защита 2. Скорость 1
Исходные А/З/С 1/2/4
Здоровье ${unit.hp}/4 - Щит ${unit.shield}/0
Модули: ${unit.modules.join(', ')}
Особенности: ${unit.specials.join(', ')}
`
  }
}

const UnitCreator = {
  open() {
    getEl('el_uc_hull').innerHTML = Object.keys(VARS.hulls).map(e => `<option value="${e}">${e} - ${VARS.hulls[e]}</option>`)
    this.fillModulesList()
    HTMLUtils.openModal('unitcreator')
  },
  fillModulesList() {
    getEl('el_uc_modules_datalist').innerHTML = Analysis.listModuleObjs()
      .map(e => `<option value="${e.name}">${e.effect}</option>`)
    getEl('el_uc_modules_search').onchange = e => {
      // if(!e.isTrusted) return 
      log(e)
      getEl('el_uc_modules').value += getEl('el_uc_modules_search').value + '\n'
      getEl('el_uc_modules_search').value = ''
    }
  },
  createUnit(hullName, modulesList = [], startParams = []) {
    const hullEffect = parseNode.effects(VARS.hulls[hullName])

    const sum = User.countSummaryCostAndEffect(modulesList, { startingFeature: hullEffect }).effect
    KEYWORDS.MILITARY_PARAMS.forEach(e => !sum[e] ? sum[e] = 0 : null)
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
        .filter(e => effectsObj[e])
        .map(e =>
          `<td>${e}</td>` +
          `<td>${effectsObj[e]}`
        ).join('</tr><tr>') +
      '</tr></tbody></table>'

      + '<table><tbody><tr>' +
      [].concat(KEYWORDS.DAMAGE_TYPES, KEYWORDS.MODULE_PROPS)
        .filter(e => e in effectsObj || `:${e}` in effectsObj)
        .join(', ') +
      '</tr></tbody></table>'

    return str
  },
  processInput() {
    const hull = getEl('el_uc_hull').value
    const modules = getEl('el_uc_modules').value.split('\n').filter(e => e && inverted.alltech[e])
    const unit = this.createUnit(hull, modules)
    getEl('el_uc_unit').innerHTML = this.createUnitTable(unit)
  },
  close() {
    HTMLUtils.closeModal('unitcreator')
  },
}

const TurnPlanner = {
  NAME: 'turnplanner',
  active: false,
  activePlayer: 'Беглецы',
  selectedTechs: [],
  open() {
    // getEl('el_uc_hull').innerHTML = Object.keys(VARS.hulls).map(e => `<option value="${e}">${e} - ${VARS.hulls[e]}</option>`)
    // this.fillModulesList()
    getEl('el_tp_player').innerHTML = User.listUsers().map(e => `<option value="${e}">${e}</option>`)
    getEl('el_tp_player').onchange = evt => {
      TurnPlanner.activePlayer = evt.target.options[evt.target.selectedIndex].value
      TurnPlanner.onSetUser()
    }

    if (User.activePlayer) {
      getEl('el_tp_player').value = User.activePlayer
      this.activePlayer = User.activePlayer
      TurnPlanner.onSetUser()
    } else {
      getEl('el_tp_player').selectedIndex = -1
      getEl('el_tp_techs_search').disabled = true
    }

    HTMLUtils.openModal(TurnPlanner.NAME, this.activePlayer)
    TurnPlanner.active = true

    // so it can calculate subtrees on startup
    setTimeout(() => TurnPlanner.fillTechsDatalist())
  },

  onSetUser() {
    const data = Object.entries(
      User.getUserEffects(this.activePlayer)
    ).filter(e => !e[0].startsWith(`:${KEYWORDS.ONLY_ONCE_KW}`))

    parseGDoc.drawTech(this.activePlayer, techData.currentTreeName)
    getEl('el_tp_resources').innerHTML = User.createUserTechEffectsTable(data)
    // getEl('el_tp_tech').innerHTML = 
    TurnPlanner.fillTechsDatalist()
    getEl('el_tp_techs_search').disabled = false
    getEl('el_tp_techs_search').onchange = _ => {
      // if(!e.isTrusted) return 
      this.addTech(getEl('el_tp_techs_search').value)
      getEl('el_tp_techs_search').value = ''
    }
    HTMLUtils.registerModalPath(TurnPlanner.NAME, this.activePlayer)
  },

  getFilteredAvalTechList() {
    const exclude = this.selectedTechs
      .concat(User.getFlatUserTech(this.activePlayer))
      .filter(techName => inverted.alltech[techName]
        && (VARS.NON_WAR_NODE_TYPES_ARR.includes(inverted.alltech[techName].type))
      )
    return User.listAvalTech(techData.currentTreeName, User.getFlatUserTech(this.activePlayer))
      .filter(techObj => !exclude.includes(techObj.name))
      .sort((a, b) => a.treeName > b.treeName ? 1 : -1)
  },

  fillTechsDatalist() {
    getEl('el_tp_techs_datalist').innerHTML = this.getFilteredAvalTechList()
      .map(
        /**
         * @param {TTechObject} obj 
         */
        (obj) => `<option value="${obj.name}">[${VARS.TREELIST_EN2RU[obj.treeName]} ${obj.subtree}] ${obj.effect.map(e2 => e2.join(': ')).join('; ')}</option>`)
  },

  addTech(techName) {
    if (!this.getFilteredAvalTechList().map(e => e.name).includes(techName)) return false
    getEl('el_tp_tech').innerText += `${techName} (${Analysis.getSubtreeName(TechUtils.byName(techName))})\n`
    this.selectedTechs.push(techName)
    if (!inverted.alltech[techName]) return false
    this.fillTechsDatalist()
    this.highlightSelected()
    return true
  },

  highlightSelected() {
    for (let i of TurnPlanner.selectedTechs) {
      if (inverted.alltech[i].treeName !== techData.currentTreeName) continue
      getEl(inverted.alltech[i].id).style.fill = 'orange'
    }
  },

  countSelectedCost() {
    // TODO wrong wrong wrong, techs can be studied by multiple params!
    log(TechUtils.countCosts(this.selectedTechs))
  },

  close() {
    this.active = false
    drawTree(techData.currentTreeName)
    HTMLUtils.closeModal(this.NAME)
  },
}

const savingOps = {
  saveAllTechAsPng() {
    for (const i of document.querySelectorAll('#tech_tree_buttons button')) {
      i.click()
      const playerName = (document.querySelector('#players_selection input:checked') || {}).id

      if (playerName) {
        savingOps.saveSvgAsPng(svg, `${playerName} ${i.innerText}.png`)
      } else {
        savingOps.saveSvgAsPng(svg, `${i.innerText}.png`)
      }
    }
  },
  // eslint-disable-next-line no-unused-vars
  saveSVG(filename) {
    savingOps.saveFile(filename + '.svg', svg.outerHTML)
  },
  saveFile(filename, data) {
    var file = new Blob([data], { type: 'text' })
    var a = document.createElement('a'),
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
    var containerElements = ['svg', 'g']
    for (var cd = 0; cd < destinationNode.childNodes.length; cd++) {
      var child = destinationNode.childNodes[cd]
      if (containerElements.indexOf(child.tagName) != -1) {
        savingOps.copyStylesInline(child, sourceNode.childNodes[cd])
        continue
      }
      var style = sourceNode.childNodes[cd].currentStyle || window.getComputedStyle(sourceNode.childNodes[cd])
      if (style == 'undefined' || style == null) continue
      for (var st = 0; st < style.length; st++) {
        child.style.setProperty(style[st], style.getPropertyValue(style[st]))
      }
    }
  },

  triggerDownload(imgURI, fileName) {
    var evt = new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    })
    var a = document.createElement('a')
    a.setAttribute('download', fileName)
    a.setAttribute('href', imgURI)
    a.setAttribute('target', '_blank')
    a.dispatchEvent(evt)
  },

  saveSvgAsPng(svg, fileName) {
    var copy = svg.cloneNode(true)
    savingOps.copyStylesInline(copy, svg)
    var canvas = document.createElement('canvas')
    var bbox = svg.getBBox()
    canvas.width = bbox.width
    canvas.height = bbox.height
    var ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, bbox.width, bbox.height)
    var data = (new XMLSerializer()).serializeToString(copy)
    var DOMUrl = window.URL || window.webkitURL || window
    var img = new Image()
    var svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    var url = DOMUrl.createObjectURL(svgBlob)
    img.onload = function () {
      ctx.drawImage(img, 0, 0)
      DOMUrl.revokeObjectURL(url)
      if (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob) {
        var blob = canvas.msToBlob()
        navigator.msSaveOrOpenBlob(blob, fileName)
      }
      else {
        var imgURI = canvas
          .toDataURL('image/png')
          .replace('image/png', 'image/octet-stream')
        savingOps.triggerDownload(imgURI, fileName)
      }

      try {
        document.removeChild(canvas)
      } catch (error) { }
    }
    img.src = url
  },
}


