/* global

*/

const VERSION = '1.0.0'
console.log(VERSION)

// UTILS

const log = console.log

function getEl(id) {
  return document.getElementById(id)
}

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
  ]
}

const cache = Object.fromEntries(TREELIST.map(e=>[e,{html: null, viewBox: null}]))

  ; (() => {
    NodeList.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.filter = Array.prototype.filter
  })()

const graphmls = {}
const tech = {}
const techData = {
  badCells: Object.fromEntries(TREELIST.map(e=>[e,[]])),
  levels: Object.fromEntries(TREELIST.map(e => [e,[]])),
  badTechCount: 0,
}
const stat = {}
const inverted = {
  tech: {},
  alltech: {},
}

const svg = document.getElementById('svg')

window.onload = Init
async function Init() {
  getEl('el_loading').hidden = false
  const parser = new DOMParser()
  const isLocalFile = location.href.startsWith('file:///')

  const iframes = Array.from(document.querySelectorAll('iframe.tech'))
  if(isLocalFile) {
      await Promise.all(iframes.map(i => 
        new Promise((resolve) => {
          i.onload = resolve
          i.src = i.getAttribute('src2')
        })
      ))
  }
  
  for (let i of TREELIST) {
    const src = `tech/${i}.graphml`
    if(isLocalFile) {
      try {
        const el = document.querySelector(`[src="${src}"]`)
        graphmls[i] = parser.parseFromString(
          el.contentWindow.document.body.firstChild.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          , 'text/xml')
      } catch(e) {
        console.warn(`cannot read local files, run
        chrome with --allow-file-access-from-files
        or
        firefox with about:config - privacy.file_unique_origin : false`)
        console.warn(e)
        break
      }
    } else {
      // non-local, try to fetch data
      const xmlText = await fetch(src).then(e=>e.text())
      graphmls[i] = parser.parseFromString(xmlText, 'text/xml')
    }
  }

  await parseTechIframe(VARS.TREELIST_NOMIL[0])
  drawTree(VARS.TREELIST_NOMIL[0])
  getEl('el_loading').hidden = true

  setTimeout(function() {

    Promise.all(TREELIST
      .filter(e => e != VARS.TREELIST_NOMIL[0])
      .map(e => parseTechIframe(e))
    )
    .then(_ => {
      for (let i of TREELIST) {
        drawTree(i)
      }
      drawTree(VARS.TREELIST_NOMIL[0])

      inverted.alltech = Object.fromEntries(
        [...Object.values(tech)]
          .map(e => Object.values(e))
          .flat()
          .map(e => [e.name, e])
      )

      for (let treeName of TREELIST) {
        for (let j in tech[treeName]) {
          let [cost, effects] = parseCostAndEffects(tech[treeName][j])
          tech[treeName][j].cost = cost
          tech[treeName][j].effect = effects
          doNodeStat(treeName, tech[treeName][j])
        }
      }

      Analysis.reportBadY()

      // console.log(listParam('cost', false))
      console.log(listParam('costClear'))
      console.log(listAllWithoutMilitary())
      if(techData.badTechCount) console.log('unrecognized tech:', techData.badTechCount)

      Analysis.searchBadTechRefs()

      // Analysis.countTechPrices()
      // log(statAllEffects)

      Analysis.totalTechCount()
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

const Analysis = {
  // statistics and various checks
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

  Reports: {
    showEffectsStatWithoutGarbage() {
      let filter = [].concat(
        KEYWORDS.COLONY_PARAMS,
        KEYWORDS.ADDITIONAL_COLONY_PARAMS,
        KEYWORDS.SPECIAL_TECH_COST,
        KEYWORDS.DAMAGE_TYPES,
        KEYWORDS.MATERIALS,
        KEYWORDS.MODULE_PROPS,
        KEYWORDS.UNIT_TYPES,
        KEYWORDS.MILITARY_PARAMS,
        ["Слоты", "Тип отряда", "особое"],
      )
      console.table(Analysis.excludeByDict(statAllEffects, filter))
    },
  
    showEffectsStat(filter = KEYWORDS.TECH_EFFECTS) {
      if(!filter) {
        console.table(statAllEffects)
      } else {
        console.table(Analysis.filterObjectByDict(statAllEffects, filter))
      }
    },
  
    listHulls() {
      console.table(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => e.type == 'octagon')
          .map(e => [e.name, {
            "Блок": e.effect[0][1], 
            "Цена": +e.cost[0][1], 
            "Слоты": +e.effect[1][1],
            "Свойства": e.effect.slice(2).map(e => e.join(':')).join(','),
          }])
      ))
    },

    listModules() {
      console.table(Object.fromEntries(
        Object.values(inverted.alltech)
          .filter(e => (e.type == "trapezoid" || e.type == 'trapezoid2' || e.type == 'fatarrow'))
          .map(e => [e.name, {
            "Свойства": e.effect.map(e => e.join(':')).join(','),
          }])
      ))
    },

    drawGraph() {
      
    }
  }
}

function tspanHighlightOnClick() {
  for (const i of document.querySelectorAll('tspan')) {
    i.onclick = function(e) {
      getEl('highlight_css').innerHTML = `.${e.target.className.baseVal} { fill: orange }`
    }        
  }
}

function drawTree(tree_name) {
  if (!tech[tree_name] || Object.keys(tech[tree_name]).length == 0) {
    parseTechIframe(tree_name)
  }

  
  if (cache[tree_name].html) {
    svg.innerHTML = cache[tree_name].html
    svg.setAttribute("viewBox", cache[tree_name].viewBox)
    setTimeout(tspanHighlightOnClick,1)
    return
  }
  tspanHighlightOnClick()

  svg.innerHTML = VARS.SVG_DEFAULT

  const values = Object.values(tech[tree_name]).concat(Object.values(techData.badCells[tree_name]))
  for (let i of values)
    draw.Node(tree_name, i)

  const x = getMinMax(values, 'x')
    , y = getMinMax(values, 'y')
    , PAD_MIN = 20
  const viewBox = (x[0] - PAD_MIN)
    + ' ' + (y[0] - PAD_MIN)
    + ' ' + (x[1] + 300 - x[0])
    + ' ' + (y[1] + 100 - y[0])
  svg.setAttribute("viewBox", viewBox)

  cache[tree_name].html = svg.innerHTML
  cache[tree_name].viewBox = viewBox
}

function getMinMax(arr, attr) {
  const t = arr.map(e => e[attr])
  return [Math.min.apply(null, t), Math.max.apply(null, t)]
}

const User = {
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

    for (let i of targets) {
      const pos_tech = list.indexOf(tech[treeName][i.id].name)
      if (pos_tech != -1) {
        res.push(i.id)
        list.splice(pos_tech, 1)
      } else if (tech[treeName][i.id].fullText.includes('базовое')) {
        continue
      } else {
        i.setAttribute('fill', 'lightgrey')
      }
    }

    if (list.length) log(`unrecognized tokens for ${treeName}: ` + tech_list)

    return list
  },

  highlightAvaltech(treeName, techList, projList) {
    techList
      .concat(projList)
      .map(e => inverted.alltech[e].next)
      .flat()
      .forEach( i =>{
        if(getEl(i).getAttribute('fill') == 'lightgrey') {
          getEl(i).setAttribute('fill','lightyellow')
        }
      })
  },
}



async function parseTechIframe(tree_name) {

  graphmls[tree_name] = graphmls[tree_name].getElementsByTagName('graph')[0]
  graphmls[tree_name].getElementsByTagName('data')[0].remove()
  // graphmls[filename].getElementsByTagName('y:Fill').forEach(e => e.remove())
  // graphmls[filename].getElementsByTagName('y:BorderStyle').forEach(e => e.remove())
  graphmls[tree_name].getElementsByTagName('y:LabelModel').forEach(e => e.remove())
  graphmls[tree_name].getElementsByTagName('y:ModelParameter').forEach(e => e.remove())

  tech[tree_name] = {}
  stat[tree_name] = {}

  const FILL_COLOR = graphmls[tree_name]
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

  for (let i of graphmls[tree_name].getElementsByTagName('y:ShapeNode')) {
    try {
      const t = parseShapeNode(tree_name, i)
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
  for (let i of graphmls[tree_name].getElementsByTagName('edge')) {
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
}

const parseDoc = {
  lastResult: null,
  async HTML(rawHTML) {
    var arr
    const html = Array.from((new DOMParser).parseFromString(rawHTML, 'text/html').body.childNodes[0].children)
    arr = html
      .filter(e => e.tagName !== 'BR')
      .map(({ tagName, innerText, children }) => 
        ({ tagName, innerText: innerText.trim(), el: children[0].parentElement }))
    // const CONTENT_TAGS = ['DIV', 'P', 'UL']
    let res = {}
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
          res[last.user] = interm.user
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
    res[last.user] = interm.user
    for(let i in res)
    parseDoc.techTableHTML(i, res[i])
    return res
  },
  
  text(raw) {
    // old parser
  
    let players = raw.split('Данные экспедиции')
    players.shift()
    players.shift()
    for (let i of players) {
      const player = {}
      var t = i
        .replace(/Изученные технологии/, 'SPLITME')
        .replace(/Общеимперские бонусы/, 'SPLITME')
        .replace(/Квента/, 'SPLITME')
        .replace(/Здания\s*\n\s*Наземные/, 'SPLITME')
        //4 - buildings
        .replace(/Орбитальные\n/, 'SPLITME')
        //5 - local_projects
        .replace(/Планетарные проекты\n/, 'SPLITME')
        .split('SPLITME')
  
      player.name = t[0].split('Трип')[0].slice(5, -1).trim()
  
      // EXCLUDE_PLAYERS.includes(player.name)
      if (player.name.indexOf('-') == 0) {
        log('marked as excluded, skipping', player.name)
        continue
      }
  
      if (!getEl(player.name) || !getEl(player.name).checked) {
        log(player.name, 'not marked to draw, skipping')
        continue
      }
  
      var buildings = t[4]
        .replace(/\([^)]+\)/g, '')
        .split(',')
        .map(e => e.trim())
        .filter(e => e != '')
      // .map(e => e.toLowerCase())
  
      var local_projects = t[6]
        .split('\n')
        .map(e => e.trim())
        .filter(e => e != '')
  
      // if(!confirm(player+'?')) continue
  
      log({ t, buildings, local_projects })
      this.techTableOld(player.name, t[1], buildings, local_projects)
    }
  },
  
  // eslint-disable-next-line no-unused-vars
  async file(event) {
    let raw
    const MIME_HTML = 'text/html'
    const rawClipboardObj = (await navigator.clipboard.read())[0]
  
    // eslint-disable-next-line no-constant-condition
    if (rawClipboardObj.types.includes(MIME_HTML)) {
      raw = await rawClipboardObj.getType(MIME_HTML).then(e => e.text())
      this.lastResult = await parseDoc.HTML(raw)
    } else {
      raw = await rawClipboardObj.getType('text/plain').then(e => e.text())
      this.lastResult = parseDoc.text(raw)
    }
  },

  techTableOld(player, raw, buildings, local_projects){
    //may be empty
    var res = raw.split('\n')
      .filter(e => e != '')
      .filter((_, i) => i % 2)
      .map(e =>
        e.split(',')
          .map(e => e.replace(/(^\s+|\s+$)/g, ''))
          .filter(e => e != '')
        //  .map(e => e.toLowerCase())
      )
  
    res = TREELIST.map((e, i) =>
      [e, res[i]]
    )
    res = new Map(res)
    res = Object.fromEntries(res)
    // log(res)
  
    let built = buildings
      .concat(local_projects)
  
    for (let i of TREELIST) {
      drawTree(i)
      const studied = res[i]
  
      // built = 
      User.highlightStudiedTech(i, studied, built)
  
      const withoutReqires = Object.values(tech[i])
        .filter(e => e.req.length == 0)
        .map(e => e.id)
  
      // TODO doesn't work
      // eslint-disable-next-line no-unused-vars
      const avaliableTech = studied
        .map(e => inverted.tech[i][e])
        .filter(e => e)
        .concat(withoutReqires)
        .map(e => tech[i][e].name)
        .filter((elem, pos, arr) => arr.indexOf(elem) == pos)
      //TODO make_array_unique() func
  
      // log(player, {avaliableTech})
  
      savingOps.saveSvgAsPng(svg, `${player} ${i}.png`)
    }
  
    if (built.length)
      log('unrecognized tokens for buildings: ' + built)
  },

  techTableHTML(playerName, obj) {
    /**
     * it is usually the sixth block, "specials"
     * @param {HTMLTableElement} el 
     * @returns 
     */
    const tech5TableToObj = el =>  
      Object.fromEntries(Array.from(el.rows).map(e=>[e.children[0].innerText, e.children[1].innerText]))
    const data = {
      techTable: tech5TableToObj(obj['Изученные технологии'].children[0]),
      buildings: obj.Здания.children[0].rows[0].children[1].innerText,
      orbital: obj.Здания.children[0].rows[1].children[1].innerText,
      localProjs: tech5TableToObj(obj['Планетарные проекты'].children[0]),
    }
    // foo = data
    log(Object.values(data).map(e=> e && e.innerHTML ? e.innerHTML.replace(/ style="[^"]+"/g,'') : e))
  }
}

var KEYWORDS = {
  COLONY_PARAMS: [
    'Общество'
    , 'Производство'
    , 'Наука'
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
    "Политика",
    "Устранение последствий",
    "Осуждение",
    // военные
    "Конверсия",
    "Регенерация",
    "Ремонт (?:армий|флотов)",
    "Бомбардировка",
  ],
  MILITARY_PARAMS: [
    "Атака",
    "Защита",
    "Скорость",
    "Уклонение",
    "Щит",
    "Полёт",
  ],
  UNIT_TYPES: [
    "пехота",
    "танки",
    "титан",
    "звездолёт",
    "хабитат",
    "наземная база",
    "космическая база",
  ],
  DAMAGE_TYPES: [
    "био",
    "рад",
    "нано",
    "странглет",
  ],
  // MODULE_NUM_PROPS: [],
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
  ],
}

function parseCostAndEffects(t) {
  const ITS_SPECIAL = 'особое:'
  const ALL_RIGHT = ITS_SPECIAL+'$1'

  const DISABLE_PARSE_IMMUNITY = false

  const colorToParameterType = {
    '#FF0000': 'Производство',
    '#00FF00': 'Общество',
    '#0000FF': 'Наука',
    '#000000': "Любой",
  }

  const studyCubesType = colorToParameterType[t.borderColor]

  const costRaw = t.cost
  const effectRaw = t.effect

  const cost = costRaw
    .split(',')
    .map(e => e
      .trim()
      .replace(/:/g, DISABLE_PARSE_IMMUNITY ? '' : ITS_SPECIAL)
      .replace(/ {2,}/g, ' ')
      .replace(/(базовое|суперпроект|астропроект)/, ALL_RIGHT)
      .replace(/(почва|первый контакт|черная дыра)/, ALL_RIGHT)
      .replace(/(электростанция)/, ALL_RIGHT)
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
    console.warn('bad cost', t.name, cost, costRaw)
    techData.badTechCount++
  }

  let effect = effectRaw
    .split(',')
    .map(e => e
      .trim()
      .replace(/:/g, DISABLE_PARSE_IMMUNITY ? '' : ITS_SPECIAL)
      .replace(/ {2,}/g, ' ')
      .replace(/^(Общество|Производство|Наука) [+-](\d+)/, '$1:$2')
      .replace(/^\+?(\d+) свободн(ый|ых) куба?/i, 'Свободный:$1')
      // временный бонус
      .replace(/^на (\d+) хода?/i, 'Временно:$1')
      // вещества
      .replace(new RegExp(`^(${KEYWORDS.MATERIALS.join('|')}) \\+(\\d+)`), '$1:$2')
      // Эффекты и бонусы:
      .replace(new RegExp(`^(${KEYWORDS.TECH_EFFECTS.join('|')}) [+-](\\d+)$`), '$1:$2')
      // Плюсы к научным веткам
      .replace(/^\+?(\d+) (?:куба? )?к вет(?:ке|ви) "([^"]+)"/i, 'Исследования (ветка "$2"):$1')
      // армии и звездолёты
      .replace(new RegExp(`^(${KEYWORDS.UNIT_TYPES.join('|')})$`), 'Тип юнита:$1')
      // .replace(/(армия|$/, 'Тип отряда:$1')
      .replace(/(\d+) слот(?:а|ов)?$/i, 'Слоты:$1')
      .replace(/(\d+) слота? (МО|ПКО)$/i, 'Слоты($2):$1')
      // модули и оружие, глобальные военные эффекты
      .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) [+-]?(\\d+)$`), '$1:$2')
      .replace(new RegExp(`^(${KEYWORDS.MILITARY_PARAMS.join('|')}) (армий|флотов) [+-]?(\\d+)$`), '$1 $2:$3')
      .replace(/^\+?(\d+) очк(?:о|а|ов)? распределения (армиям|флотам)? ?/, 'Очки распределения $2:$1')
      .replace(/^(Защита колонии|планетарный щит|Мины|Гарантированная защита) \+?(\d+)/, '$1:$2')
      .replace(/^Создание (армий|флотов|(?:наземных|космических) баз|хабитатов) \+?(\d+)/, 'Создание $1:$2')
      .replace(/^(Двигатель|Скорость FTL) \+?(\d+)/, '$1:$2')
      // типы урона, эффекты оружия
      .replace(new RegExp(`^(${KEYWORDS.DAMAGE_TYPES.join('|')})$`), 'Тип урона:$1')
      .replace(new RegExp(`^(${KEYWORDS.MODULE_PROPS.join('|')})$`), ALL_RIGHT)
      // эффекты, дающие великих людей
      .replace(/^\+?(\d+) велик(?:ий|их) (?:человека?)$/i, 'Великий человек:$1')
      .replace(/^\+?(\d+) велик(?:ий|их) (?:человека?)? ?(.+)?$/i, 'Великий человек ($2):$1')
      // базовые вещи
      .replace(/^(выдаётся при высадке|выдаётся на старте)/, ALL_RIGHT)
      .replace(/^(немедленно)/, ALL_RIGHT)
      .replace(/^(электростанция|наземное)/, ALL_RIGHT)
      .replace(/^(неуязвимость к обычным болезням|взлом систем связи невозможен)/, ALL_RIGHT)
      .replace(/^(при подавлении армией|в военное время|на нечуждых планетах|в системе|вне родной системы)/, ALL_RIGHT)
      .replace(/^(пред-FTL)/, ALL_RIGHT)
      // особый эффект - победа
      .replace(/(победа)/, ALL_RIGHT)
      .split(':')
    )

  if (effect.some(e => e.length < 2)) {
    // it is non-split => not recognized string
    // effect = null
    techData.badTechCount++
    console.warn(t.name, effect.filter(e=>e.length<2)[0], effectRaw)
  }

  return [cost, effect]
}

function parseShapeNode(filename, i) {

  const sepDifficulty = 'Сложность:'
  const sepEffect = 'Эффект:'

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
    , borderColor
    , name: ''
    , cost: []
    , effect: []
    , req: []
    , next: []
    , fullText

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

const draw = {
  SVG_NS: "http://www.w3.org/2000/svg",
  POLYGON_DELTA: 20,
  Node: function (treeName, t) {
    //  for modules
    //  for projects - rounded rect
    switch (t.type) {
      case 'rectangle':
        draw.SVG.Rect(t)
        break
      case 'parallelogram':
        draw.SVG.Prlg(t)
        break
      case 'trapezoid':
        draw.SVG.Trapezioid(t)
        break
      case 'trapezoid2':
        draw.SVG.Trapezioid2(t)
        break
      case 'hexagon':
        draw.SVG.Hexagon(t)
        break
      case 'fatarrow':
        draw.SVG.FatArrow(t)
        break
      case 'octagon':
        draw.SVG.Octagon(t)
        break
      case 'ellipse':
        draw.SVG.Rect(t)
        break
      default:
        console.error('drawing not implemented for type ' + t.type)
        return
    }

    draw.SVG.Text(t.nodeCenter, t.name, t.fullText, t.id, t.fontSize)

    for (let i of t.next) {
      this.connectNodes(t, tech[treeName][i])
    }
  },

  connectNodes(n1, n2) {
    draw.SVG.Line(
      n1.x + n1.w / 2
      , n1.y + n1.h / 2
      , n2.x + n2.w / 2
      , n2.y + n2.h / 2
    )
  },

  SVG: {
    Prlg: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x + d},${y}
        ${x + w},${y}
        ${x + w - d},${y + h}
        ${x},${y + h}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Hexagon: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x + d},${y}
        ${x},${y + h / 2}
        ${x + d},${y + h}
        ${x + w - d},${y + h} 
        ${x + w},${y + h / 2}
        ${x + w - d},${y}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Trapezioid: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = 30
      var points = `
        ${x + d},${y}
        ${x},${y + h}
        ${x + w},${y + h} 
        ${x + w - d},${y}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Trapezioid2: function ({ id, x, y, h, w, borderColor, fill }) {
      //delta
      const d = 30
      var points = `
        ${x},${y}
        ${x + d},${y + h}
        ${x + w - d},${y + h} 
        ${x + w},${y}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    FatArrow: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x},${y}
        ${x + d},${y + h / 2}
        ${x},${y + h}
        ${x + w - d},${y + h} 
        ${x + w},${y + h / 2}
        ${x + w - d},${y}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Octagon: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x + d},${y}
        ${x},${y + h / 3}
        ${x},${y + h * 2 / 3}
        ${x + d},${y + h}
        ${x + w - d},${y + h} 
        ${x + w},${y + h * 2 / 3}
        ${x + w},${y + h / 3}
        ${x + w - d},${y}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Poly(points, { id, borderColor, fill }) {
      var el = document.createElementNS(draw.SVG_NS, 'polygon')
      el.setAttributeNS(null, 'id', id)
      el.setAttributeNS(null, 'points', points)
      el.setAttributeNS(null, 'fill', fill)
      el.setAttributeNS(null, 'stroke', borderColor)
      el.setAttributeNS(null, 'stroke-width', 3)

      // if(title) el.innerHTML += '<title>'+title+'</title>'
      document.getElementById('svg').appendChild(el)
      return el
    },

    Line: function (x1, y1, x2, y2) {
      var line = document.createElementNS(draw.SVG_NS, 'line')
      line.setAttribute('x1', x1)
      line.setAttribute('y1', y1)
      line.setAttribute('x2', x2)
      line.setAttribute('y2', y2)
      line.setAttribute("stroke", "black")
      line.setAttributeNS(null, 'stroke-width', 2)

      getEl('svg').insertBefore(line, getEl('svg').firstChild)
    },

    Text: function ({ x, y }, text, fullText, id, fontSize) {

      var el = document.createElementNS(draw.SVG_NS, 'text')
      el.setAttributeNS(null, 'x', x)
      el.setAttributeNS(null, 'y', y)
      el.setAttributeNS(null, 'id', id + '_t')
      el.setAttributeNS(null, 'fill', 'black')
      el.setAttributeNS(null, 'text-anchor', 'center')
      // center right
      el.setAttributeNS(null, 'font-size', fontSize || '12')
      getEl('svg').appendChild(el)

      const arr = fullText.split('\n')
      let curr = null,
        curr_dx = 0,
        curr_w = 0
      // let acc = ''
      const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1
      for (let i in arr) {
        if (i == 0) {
          let dy = arr.length == 3 ? '-0.6' : '-1.4'
          if(fontSize) dy = '+0.35'
          el.innerHTML = `<tspan id="${id}_t0" dx='0' dy="${dy}em">${arr[i]}</tspan>`
        }
        else {
          el.innerHTML += `<tspan id="${id}_t${i}" dx='0' dy="1.2em" 
          class="">${arr[i]}</tspan>`
          // it breaks dnload  for some reason
          // class="${arr[i].replace(/(^.+:|\+\d)/g,'').replace(/[\d)(,.ё_)]/g,'').trim().replace(/ /g,'_')}"
          curr = getEl(id + '_t' + i)
          curr_dx = -(getEl(id + '_t' + (i - 1)).getBBox().width / 2)
          curr_w = +curr.getBBox().width
          const dx = isFirefox 
            ? -getEl(id + '_t' + (i - 1)).getBBox().width - curr_w / 2
            : curr_dx - curr_w / 2
          curr.setAttribute('dx', dx)
        }
      }

      curr_dx = -getEl(id + '_t').getBBox().width / 2
      getEl(id + '_t0').setAttribute('dx', curr_dx )
    },

    Point: function (x, y) {
      var el = document.createElementNS(draw.SVG_NS, 'circle')
      el.setAttributeNS(null, 'cx', x)
      el.setAttributeNS(null, 'cy', y)
      el.setAttributeNS(null, 'r', 3)
      el.setAttributeNS(null, 'fill', 'black')
      el.setAttributeNS(null, 'stroke', 'red')
      el.setAttributeNS(null, 'stroke-width', 1)
      getEl('svg').appendChild(el)
    },

    Rect: function ({ id, x, y, h, w, borderColor, fill }) {
      var rect = document.createElementNS(draw.SVG_NS, 'rect')
      rect.setAttributeNS(null, 'id', id)
      rect.setAttributeNS(null, 'x', x)
      rect.setAttributeNS(null, 'y', y)
      rect.setAttributeNS(null, 'height', h)
      rect.setAttributeNS(null, 'width', w)
      rect.setAttributeNS(null, 'fill', fill)
      rect.setAttributeNS(null, 'stroke', borderColor)
      rect.setAttributeNS(null, 'stroke-width', 3)
      // if(title) rect.innerHTML += '<title>'+title+'</title>'
      document.getElementById('svg').appendChild(rect)
      return rect
    }
  }
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
      document.removeChild(canvas)
    }
    img.src = url
  },
}


