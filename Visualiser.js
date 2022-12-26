/* global

*/

// UTILS

const log = console.log
// eslint-disable-next-line no-unused-vars
const warn = console.warn
// eslint-disable-next-line no-unused-vars
const error = console.error

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
const TREELIST_NOMIL = TREELIST.filter(e => e != 'Military')
const cache = {}

  ; (() => {
    NodeList.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.forEach = Array.prototype.forEach
    HTMLCollection.prototype.filter = Array.prototype.filter
  })()

const graphmls = {}
const tech = {}
const badCells = Object.fromEntries(TREELIST.map(e=>[e,[]]))
const stat = {}
const inverted = {
  tech: {},
  alltech: {},
}

const svg = document.getElementById('svg')
const SVG_DEFAULT = `<style> text {
  font-family: Helvetica;
  // font-size: 12;
} </style>`

window.onload = Init
async function Init() {
  const parser = new DOMParser()
  for (let i of document.querySelectorAll('iframe.tech')) {
    let tree_name = i.src.replace(/.*\/([^/]*).graphml$/, '$1')
    try {
      graphmls[tree_name] = parser.parseFromString(
        i.contentWindow.document.body.firstChild.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        , 'text/xml')
    } catch (e) {
      warn(`cannot read files, run
      chrome with --allow-file-access-from-files
      or
      firefox with about:config - privacy.file_unique_origin : false`)
      warn(e)
      break
    }
  }

  await parseTechIframe(TREELIST_NOMIL[0])
  drawTree(TREELIST_NOMIL[0])

  setTimeout(function() {
    Promise.all(TREELIST
      .filter(e => e != TREELIST_NOMIL[0])
      .map(e => parseTechIframe(e))
    )
    .then(_ => {
      // FIXME uncomment as soon as tech effects debugged
      /*
      console.log(tech)
    
      console.log(listParam('cost', false))
      console.log(listParam('costClear'))
      console.log(listAllWithoutMilitary())
      */
      console.log('unrecognized tech:', badTechCount)

      for (let i of TREELIST) {
        drawTree(i)
      }
      drawTree(TREELIST_NOMIL[0])

      inverted.alltech = Object.assign(...Object.values(inverted.tech))

      for (let i of Object.keys(tech)) {
        for (let j of Object.values(tech[i])) {
          // log(j)
          j.cost
            .filter(e => e[0] == 'Технология')
            .forEach(e => {
              if (!(e[1] in inverted.alltech)) log('unknown tech name here:', i, j.name, [e[1]])
            })
        }
      }

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

function drawTree(tree_name) {
  if (!tech[tree_name] || Object.keys(tech[tree_name]).length == 0) {
    parseTechIframe(tree_name)
  }

  if (cache[tree_name]) {
    svg.innerHTML = cache[tree_name].html
    svg.setAttribute("viewBox", cache[tree_name].viewBox)
    return
  }

  svg.innerHTML = SVG_DEFAULT

  const values = Object.values(tech[tree_name]).concat(Object.values(badCells[tree_name]))
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

  cache[tree_name] = {}
  cache[tree_name].html = svg.innerHTML
  cache[tree_name].viewBox = viewBox

}

function getMinMax(arr, attr) {
  const t = arr.map(e => e[attr])
  return [Math.min.apply(null, t), Math.max.apply(null, t)]
}

function highlightStudiedTech(field, tech_list, proj_list) {
  let res = []
  const targets = Array.from(svg.getElementsByTagName('rect'))
    .concat(Array.from(svg.getElementsByTagName('polygon')))

  for (let i of targets) {
    const pos_tech = tech_list.indexOf(tech[field][i.id].name)
    const pos_proj = proj_list.indexOf(tech[field][i.id].name)
    if (pos_tech != -1) {
      res.push(i.id)
      tech_list.splice(pos_tech, 1)
    } else if (pos_proj != -1) {
      res.push(i.id)
      proj_list.splice(pos_proj, 1)
    } else {
      i.setAttribute('fill', '#d9d9d9')
    }
  }

  if (tech_list.length) log(`unrecognized tokens for ${field}: ` + tech_list)

  return proj_list
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
        badCells[tree_name].push(t)
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

async function parseDocHTML(rawHTML) {
  var l
  const html = Array.from((new DOMParser).parseFromString(rawHTML, 'text/html').body.childNodes[0].children)
  l = html
    .filter(e => e.tagName !== 'BR')
    .map(({ tagName, innerText, innerHTML }) => ({ tagName, innerText, innerHTML }))
  // const CONTENT_TAGS = ['DIV', 'P', 'UL']
  let hs = []
  let content = []
  let interm = {}
  let res = {}
  let t = {}
  // doesnt work
  for (let i of l) {
    if (i.tagName.startsWith('H')) {
      // header
      if (!hs.length) {
        hs.push(i)
        continue
      }
      let last = hs[hs.length - 1]
      if (last.tagName > i.tagName) {
        // new H is lower
      } else if (last.tagName == i.tagName) {
        // new H is same
        interm[last.innerText] = content
        content = []
      } else if (last.tagName < i.tagName) {
        // new H is higher order
        interm[last.innerText] = content
        content = []

        let prelast
        while (hs.length) {
          prelast = hs.pop()
          if (prelast.tagName < last.tagName) {
            t = Object.assign({}, interm)
            interm = {}
            interm[prelast.innerText] = t
            break
          }
        }
        hs.push(prelast)
      }
      hs.push(i)
    } else {
      content.push(i)
    }
  }
  log(interm)
  return res
}

function parseDocText(raw) {
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

    player.name = t[0].split('Трип')[0].slice(5, -1)

    // EXCLUDE_PLAYERS.includes(player.name)
    if (player.name.indexOf('-') == 0)
      continue

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
    parseTechTable(player.name, t[1], buildings, local_projects)
  }
}

// eslint-disable-next-line no-unused-vars
async function parseDocFile(event) {
  let raw
  const MIME_HTML = 'text/html'
  const rawClipboardObj = (await navigator.clipboard.read())[0]

  // eslint-disable-next-line no-constant-condition
  if (rawClipboardObj.types.includes(MIME_HTML) && false) {
    raw = await rawClipboardObj.getType(MIME_HTML).then(e => e.text())
    parseDocHTML(raw)
  } else {
    raw = await rawClipboardObj.getType('text/plain').then(e => e.text())
    parseDocText(raw)
  }
}

function parseTechTable(player, raw, buildings, local_projects) {
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
    highlightStudiedTech(i, studied, built)

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

    saveSvgAsPng(svg, `${player} ${i}.png`)
  }

  if (built.length)
    log('unrecognized tokens for buildings: ' + built)
}

// eslint-disable-next-line no-unused-vars
function saveSVG(filename) {
  saveFile(filename + '.svg', svg.outerHTML)
}

const KEYWORDS = {
  DAMAGE_TYPES: [],
  UNIT_PROPS: [
    "ДУ",
    "роботы",
    "нет FTL",
  ],
  MODULE_PROPS: [
    "био",
    "биологическое",
    "рад",
    "нано",
    // damage types end
    "ЭМИ",
    "бронебойное",
    //!!!
    "осадное",
    "щит",
  ],
  COLONY_PARAMETERS: [],
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
    "Метакрис",
    "Экзотическая материя",
    "Экзотматерия",
    // 4 ряд
    "Нейтроний",
    "Кварк-плазма",
    //особые
    "Образцы",
    "Экзоты",
    "Аномалия"
  ],
}

var badTechCount = 0

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

  // this is not tech node
  if (nlabel.getAttribute('fontSize') != 12) {
    let t = {
      id: i.parentElement.parentElement.id
      , badCell: true
      , type: i.getElementsByTagName('y:Shape')[0].getAttribute('type')
      , borderColor: i.getElementsByTagName('y:BorderStyle')[0].getAttribute('color')
      , fullText
      , fontSize: nlabel.getAttribute('fontSize')
      , next: []
  
      , x: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('x')).toFixed(2)
      , y: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('y')).toFixed(0)
      , h: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('height')).toFixed(2)
      , w: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('width')).toFixed(2)
  
      , fill: i.getElementsByTagName('y:Fill')[0].getAttribute('color')
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
  const cost_raw = split1[1].split(sepEffect)[0].trim()

  const colorToParameterType = {
    '#FF0000': 'Производство',
    '#00FF00': 'Общество',
    '#0000FF': 'Наука',
    '#000000': "Любой",
  }
  const borderColor = i.getElementsByTagName('y:BorderStyle')[0].getAttribute('color')

  const ALL_RIGHT = ':$1'

  const DISABLE_PARSE_IMMUNITY = false

  //parse COST
  const cost = cost_raw
    .split(',')
    .map(e => e
      .trim()
      .replace(/:/g, DISABLE_PARSE_IMMUNITY ? '' : ':')
      .replace(/ {2,}/g, ' ')
      .replace(/(базовое)/, ALL_RIGHT)
      .replace(/(почва|первый контакт|черная дыра)/, ALL_RIGHT)
      .replace(/(электростанция)/, ALL_RIGHT)
      .replace(/(повторяемый)/, ALL_RIGHT)
      .replace(/^(\d+)$/i, colorToParameterType[borderColor] + ':$1')
      .replace(/^(\d+) этапа$/i, 'Этапы:$1')
      .replace(/^любая тех. (.+)$/i, 'Любая технология:$1')
      .replace(/^(\d+) слота$/i, 'Этапы:$1')
      .replace(/^тех. (.+)$/i, 'Технология:$1')
      .replace(/^(осуждение|волнения|непривычная среда) ?\((.+)\)$/i, '$1:+$2')
      .replace(/^(затраты|специалисты|ресурсы) ?\((.+)\)$/i, '$1:$2')
      .replace(new RegExp(`(${KEYWORDS.MATERIALS.join('|').toLowerCase()}) ?\\((.+)\\)$`), '$1:$2')
      .split(':')
    )

  if (cost.some(e => e.length < 2)) {
    log('bad cost', name, cost, cost_raw)
    badTechCount++
  }

  // parse EFFECTS
  const effect_unparsed = split1[1].split(sepEffect)[1].trim()
  let effect = effect_unparsed
    .split(',')
    .map(e => e
      .trim()
      .replace(/:/g, DISABLE_PARSE_IMMUNITY ? '' : ':')
      .replace(/ {2,}/g, ' ')
      .replace(/(Общество|Производство|Наука) [+-](\d+)/, '$1:$2')
      .replace(/^\+?(\d+) свободн(ый|ых) куба?/i, 'Свободный куб:$1')
      // временный бонус
      .replace(/^на (\d+) хода?/i, 'Свободный куб:$1')
      // вещества
      .replace(new RegExp(`(${KEYWORDS.MATERIALS.join('|')}) \\+(\\d+)`), '$1:$2')
      // Эффекты и бонусы:
      // : индустрия
      .replace(/(Планетарная разведка|Георазведка|Строительство|Пуски|Орбита|Астроинженерия) \+(\d+)/, '$1:$2')
      // : биология и терраформинг
      .replace(/(Терраформинг|Генные модификации|Адаптация|Сверхадаптация) \+(\d+)/, '$1:$2')
      // : социальные
      .replace(/(Дипломатия|Шпионаж|Контршпионаж|Пропаганда|Автозаки|Политика|Устранение последствий) [+-](\d+)/, '$1:$2')
      .replace(/(Осуждение) -(\d+)/, '$1:$2')
      // : военные
      .replace(/(Конверсия|Регенерация|Ремонт (?:армий|флотов)|Бомбардировка) \+(\d+)/, '$1:$2')
      // Плюсы к научным веткам
      .replace(/^\+?(\d+) (?:куба? )?к вет(?:ке|ви) "([^"]+)"/i, 'Исследования (ветка "$2"):$1')
      // армии и корпуса кораблей
      .replace(/(армия|корпус|(?:наземная|космическая) база)/, 'Тип отряда:$1')
      .replace(/(\d+) слот(?:а|ов)?$/i, 'Слоты:$1')
      .replace(/(\d+) слота? (МО|ПКО)$/i, 'Слоты($2):$1')
      // модули и оружие, глобальные военные эффекты
      .replace(/(Атака|Защита|Скорость|Уклонение) (армий|флотов)? ?\+?(\d+)/, '$1$2:$3')
      .replace(/\+?(\d+) очков? распределения (армиям|флотам)? ?/, 'Очки распределения $2:$1')
      .replace(/(Защита колонии|планетарный щит|Мины) \+?(\d+)/, '$1:$2')
      .replace(/Создание (армий|флотов|баз|хабитатов) \+?(\d+)/, 'Создание $1:$2')
      .replace(/(Двигатель) \+?(\d+)/, '$1:$2')
      // типы урона, эффекты оружия
      .replace(new RegExp(`(${KEYWORDS.DAMAGE_TYPES.join('|')}) ?(\\+\\d+)`), '$1:$2')
      .replace(new RegExp(`(${KEYWORDS.UNIT_PROPS.join('|')}) ?(\\+\\d+)?`), '$1:$2')
      .replace(new RegExp(`(${KEYWORDS.MODULE_PROPS.join('|')}) ?(\\+\\d+)?`), '$1:$2')
      // эффекты, дающие великих людей
      .replace(/^\+?(\d+) велик(?:ий|их) (?:человека?)? ?(.+)?$/i, 'Великий человек ($2):$1')
      // базовые вещи
      .replace(/(выдаётся при высадке)/, ALL_RIGHT)
      .replace(/(немедленно)/, ALL_RIGHT)
      .replace(/(электростанция|наземное)/, ALL_RIGHT)
      .replace(/(неуязвимость к обычным болезням|взлом систем связи невозможен)/, ALL_RIGHT)
      .replace(/(при подавлении армией|в военное время|на нечуждых планетах|в системе)/, ALL_RIGHT)
      .replace(/(пред-FTL)/, ALL_RIGHT)
      // особый эффект - победа
      .replace(/(победа)/, ALL_RIGHT)
      .split(':')
    )

  if (effect.some(e => e.length < 2)) {
    // it is non-split => not recognized string
    // effect = null
    badTechCount++
    log(name, effect, effect_unparsed)
  }

  var t = {
    id: i.parentElement.parentElement.id
    , type: i.getElementsByTagName('y:Shape')[0].getAttribute('type')
    , borderColor: i.getElementsByTagName('y:BorderStyle')[0].getAttribute('color')
    , name
    , cost
    , effect
    , req: []
    , next: []
    , fullText

    , x: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('x')).toFixed(2)
    , y: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('y')).toFixed(0)
    , h: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('height')).toFixed(2)
    , w: Number(i.getElementsByTagName('y:Geometry')[0].getAttribute('width')).toFixed(2)

    , fill: i.getElementsByTagName('y:Fill')[0].getAttribute('color')

  }

  t.nodeCenter = {
    x: ++t.x + ++t.w / 2
    , y: ++t.y + ++t.h / 2
  }

  t.textCoords = {
    x: t.x
    , y: ++t.y + ++t.h / 2
  }

  doNodeStat(filename, t)

  return t
}

function doNodeStat(filename, t) {
  var effects = t.effect,
    cost = t.cost

  for (let effect of effects) {
    if (effect == null)
      effect = ['Общество', 0]

    if (!stat[filename][t.y]) {
      /*
        sum is sum of all param cubes avaliable,
        cost is full cost of level, 
        costClear is param-tech-only cost
      */
      stat[filename][t.y] = { Общество: 0, Производство: 0, Наука: 0, Свободный: 0, cost: 0, costClear: 0, sum: 0 }
      stat[filename][t.y][effect[0]] = +effect[1]

    }
    else
      stat[filename][t.y][effect[0]] += +effect[1]

    stat[filename][t.y].sum += +effect[1]
  }

  let cost_facto = +cost[0]
  if (cost[1] == '2 этапа')
    cost_facto *= 2
  if (effects[0][1] != 0) { //its actual data
    stat[filename][t.y].costClear += cost_facto
  }
  stat[filename][t.y].cost += cost_facto
}

function extractParam(param, fuckMilitary = true) {
  // let t={} //cost of cubes stat
  // for (i in tech) t[i]= tech[i].stat
  let list = {}
  const iter = fuckMilitary ? TREELIST_NOMIL : TREELIST
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
  for (let i in range(14)) {
    for (let j in t) {
      res += (t[j].shift() || 0) + '\t'
    }
    res = res.slice(0, -1)
    res += '\n'
  }
  return res
}

/*
function drawParam(param = 'costClear') {
  //delete stat['Military']
  const t = extractParam(param)
  let res = param+'\n'
  for (i in t) {
    res += i+'\t'
  }
  res = res.slice(0,-1)
  res += '\n'
  for (i in range(14)) {
    for (j in t) {
      res += (t[j].shift() || 0) +'\t'
    }
    res = res.slice(0,-1)
    res += '\n'
  }
  return res
}
*/

const PARAMLIST_RU = [
  'Общество'
  , 'Производство'
  , 'Наука'
  , 'Свободный'
]

function listAllWithoutMilitary() {
  //delete stat['Military']

  let list = {}
  let res = []

  for (let i of PARAMLIST_RU) {
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

function connectNodes(n1, n2) {
  draw.SVG.Line(
    n1.x + n1.w / 2
    , n1.y + n1.h / 2
    , n2.x + n2.w / 2
    , n2.y + n2.h / 2
  )
}

const SVG_NS = "http://www.w3.org/2000/svg"
const POLYGON_DELTA = 20

const draw = {
  Node: function (treeName, t) {
    //  for modules
    //  for projects - rounded rect
    let box
    switch (t.type) {
      case 'rectangle':
        box = draw.SVG.Rect(t)
        break
      case 'parallelogram':
        box = draw.SVG.Prlg(t)
        break
      case 'trapezoid':
        box = draw.SVG.Trapezioid(t)
        break
      case 'trapezoid2':
        box = draw.SVG.Trapezioid2(t)
        break
      case 'hexagon':
        box = draw.SVG.Hexagon(t)
        break
      case 'fatarrow':
        box = draw.SVG.FatArrow(t)
        break
      case 'octagon':
        box = draw.SVG.Octagon(t)
        break
      case 'ellipse':
        return
      default:
        error('drawing not implemented for type ' + t.type)
        return
    }

    draw.SVG.Text(t.nodeCenter, t.name, t.fullText, t.id, t.fontSize)

    for (let i of t.next) {
      connectNodes(t, tech[treeName][i])
    }
  },

  SVG: {
    Prlg: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = POLYGON_DELTA
      var points = `
        ${x + d},${y}
        ${x + w},${y}
        ${x + w - d},${y + h}
        ${x},${y + h}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill })
    },

    Hexagon: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = POLYGON_DELTA
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
      const d = POLYGON_DELTA
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
      const d = POLYGON_DELTA
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
      var el = document.createElementNS(SVG_NS, 'polygon')
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
      var line = document.createElementNS(SVG_NS, 'line')
      line.setAttribute('x1', x1)
      line.setAttribute('y1', y1)
      line.setAttribute('x2', x2)
      line.setAttribute('y2', y2)
      line.setAttribute("stroke", "black")
      line.setAttributeNS(null, 'stroke-width', 2)

      getEl('svg').insertBefore(line, getEl('svg').firstChild)
    },

    Text: function ({ x, y }, text, fullText, id, fontSize) {

      var el = document.createElementNS(SVG_NS, 'text')
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
      for (let i in arr) {
        if (i == 0) {
          let dy = arr.length == 3 ? '-0.6' : '-1.4'
          if(fontSize) dy = '+0.35'
          el.innerHTML = `<tspan id="${id}_t0" dx='0' dy="${dy}em">${arr[i]}</tspan>`
        }
        else {
          el.innerHTML += `<tspan id="${id}_t${i}" dx='-${getEl(id + '_t' + (i - 1)).getBBox().width / 2}' dy="1.2em">${arr[i]}</tspan>`
          curr = getEl(id + '_t' + i)
          curr_dx = +curr.getAttribute('dx')
          curr_w = +curr.getBBox().width
          const dx = curr_dx - curr_w / 2
          curr.setAttribute('dx', dx)
        }
      }

      curr_w = getEl(id + '_t').getBBox().width
      getEl(id + '_t0').setAttribute('dx', -curr_w / 2)
    },

    Point: function (x, y) {
      var el = document.createElementNS(SVG_NS, 'circle')
      el.setAttributeNS(null, 'cx', x)
      el.setAttributeNS(null, 'cy', y)
      el.setAttributeNS(null, 'r', 3)
      el.setAttributeNS(null, 'fill', 'black')
      el.setAttributeNS(null, 'stroke', 'red')
      el.setAttributeNS(null, 'stroke-width', 1)
      getEl('svg').appendChild(el)
    },

    Rect: function ({ id, x, y, h, w, borderColor, fill }) {
      var rect = document.createElementNS(SVG_NS, 'rect')
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

// eslint-disable-next-line no-unused-vars
function saveAllTechAsPng() {
  for (const i of document.querySelectorAll('#tech_tree_buttons button')) {
    i.click()
    saveSvgAsPng(svg, `${i.innerText}.png`)
  }
}

// eslint-disable-next-line no-unused-vars
function saveFile(filename, data) {
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
}

//heya SO https://stackoverflow.com/questions/3975499/convert-svg-to-image-jpeg-png-etc-in-the-browser
function copyStylesInline(destinationNode, sourceNode) {
  var containerElements = ["svg", "g"]
  for (var cd = 0; cd < destinationNode.childNodes.length; cd++) {
    var child = destinationNode.childNodes[cd]
    if (containerElements.indexOf(child.tagName) != -1) {
      copyStylesInline(child, sourceNode.childNodes[cd])
      continue
    }
    var style = sourceNode.childNodes[cd].currentStyle || window.getComputedStyle(sourceNode.childNodes[cd])
    if (style == "undefined" || style == null) continue
    for (var st = 0; st < style.length; st++) {
      child.style.setProperty(style[st], style.getPropertyValue(style[st]))
    }
  }
}

function triggerDownload(imgURI, fileName) {
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
}

function saveSvgAsPng(svg, fileName) {
  var copy = svg.cloneNode(true)
  copyStylesInline(copy, svg)
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
      triggerDownload(imgURI, fileName)
    }
    document.removeChild(canvas)
  }
  img.src = url
}