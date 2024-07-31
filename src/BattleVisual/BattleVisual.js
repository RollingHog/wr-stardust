// common.js
/* global
getEl log 
makeElDraggable
*/

const shipBlock = {
  left: getEl('tr_field').children[0],
  right: getEl('tr_field').children[2],
}

const UNIT_FIELD = 'unit_field'

function onShipEdit(evt) {
  const el = evt.target
  for(let i of el.parentNode.querySelectorAll('.param')) {
    if(i.innerHTML.includes('+') || i.innerHTML.includes('-')) {
      i.innerHTML = eval('+'+i.innerHTML)
    }
    if(i.classList.contains('hp', 'curr') ) {
      if(+i.innerHTML <= 0) {
        el.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
          .classList.add('cross')
      } else {
        el.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
          .classList.remove('cross')
      }
    }
  }

}

function addShipListeners(shipEl) {
  setTimeout(()=>makeElDraggable(shipEl.id, shipEl.querySelector('.image')), 10)
  shipEl.addEventListener('blur', onShipEdit)
  shipEl.addEventListener('keydown', (evt)=> {
    if(['Enter','NumpadEnter'].includes(evt.code)) {
      document.activeElement.blur()
      onShipEdit(evt)
      evt.stopPropagation()
      return false
    }
  })
}

let nextId = 0

const onAddShipTemplate = {
  left(evt) {
    onAddShipTemplate.addTemplateWithSize(evt)
  },
  right(evt) {
    onAddShipTemplate.addTemplateWithSize(evt, true)
  },
  addTemplateWithSize(evt, isRight) {
    const size = prompt(`Size? 0-6, 0 is planet; "-" prefix is ground unit, "_" is building, "=" is 'orbital'\n'+' is 'robots', '%' is 'giger'
    `)
    onAddShipTemplate.addTemplate(isRight, {size: size || 3})
  },

  addTemplate(isRight, templateData = {size: 3}) {
    const size = templateData.size
    /** @type {HTMLElement} */
    const tshipEl = getEl('ship_template').cloneNode(true)
    tshipEl.id = `n${nextId}`
    tshipEl.querySelector('.id').innerText = nextId
    nextId++

    tshipEl.querySelector('.parent').setAttribute('parent', tshipEl.id)

    if(size != 0) {
      tshipEl.querySelector('.image').innerHTML = `<img title='${size}' src="assets/ships/${size}.png">`
    } else {
      // planet
      tshipEl.querySelector('.image').innerHTML = `<img src="assets/planets/terrestrial.png">`
      tshipEl.querySelector('.param.speed').innerHTML = 0
      tshipEl.querySelector('.hp.max').innerHTML = 10
      setTimeout(()=>tshipEl.querySelector('.b_add_to_battle').click(), 20)
      setTimeout(()=>tshipEl.querySelector('.b_remove').click(), 50)
      
      // TODO add to battle and remove template
    }

    if(size !== 0) {
      // its not a planet
      tshipEl.querySelector('.hp.max').innerHTML = (Math.abs(parseInt(size)) || 1) * 2
    }
    tshipEl.querySelector('.hp.curr').innerHTML = tshipEl.querySelector('.hp.max').innerHTML

    if(templateData) {
      for(let field in templateData) {
        if(tshipEl.querySelector(`.${field}`)) {
          tshipEl.querySelector(`.${field}`).innerText = templateData[field]
        }
      }
      tshipEl.querySelector('.parent').setAttribute('parent', templateData.parent)
    }

    tshipEl.hidden = false
    tshipEl.querySelector('.image').addEventListener('click', () => addUnitToBattle(tshipEl.id))
    addShipListeners(tshipEl)
    if(!isRight) {
      tshipEl.querySelector('.side').innerText = 'left'
      tshipEl.querySelector('.ship').className += ' side_left'
      shipBlock.left.querySelector('.'+UNIT_FIELD).appendChild(tshipEl)
    } else {
      tshipEl.querySelector('.side').innerText = 'right'
      tshipEl.querySelector('.ship').className += ' side_right'
      tshipEl.querySelector('.image').className += ' mirror_vert'
      shipBlock.right.querySelector('.'+UNIT_FIELD).appendChild(tshipEl)
    }
  }
}

// eslint-disable-next-line no-unused-vars
function addUnitToBattle(templateId = 0, unitData = {}) {
  const shipWrapT = (getEl('n'+templateId) || getEl(templateId)).cloneNode(true)
  shipWrapT.id = `n${nextId}`
  shipWrapT.querySelector('.id').innerText = nextId
  nextId++

  const parentId = shipWrapT.querySelector('.parent').getAttribute('parent')
  shipWrapT.querySelector('.serial').innerHTML = document.querySelectorAll(`[parent="${parentId}"]`).length

  if(unitData) {
    for(let field in unitData) {
      if(shipWrapT.querySelector(`.${field}`)) {
        shipWrapT.querySelector(`.${field}`).innerText = unitData[field]
      }
    }

    shipWrapT.querySelector('.ship').className = `ship side_${unitData.side}`
    if(unitData.side === 'right') shipWrapT.querySelector('.image').className += ' mirror_vert'
    shipWrapT.querySelector('.image').innerHTML = `<img title='${unitData.size}' src="assets/ships/${unitData.size}.png">`
    shipWrapT.querySelector('.parent').setAttribute('parent', unitData.parent)
    shipWrapT.style.left = unitData.left
    shipWrapT.style.top = unitData.top
  }

  addShipListeners(shipWrapT)
  document.querySelector('#battle_field').append(shipWrapT)
}

const formRolls = {
  getQuery(isRight) {
    return isRight 
      ? '#battle_field .ship.side_right'
      : '#battle_field .ship.side_left'
  },

  attack(isRight = false) {
    const shipQuery = formRolls.getQuery(isRight)
    let res = ''
    for(let ship of document.querySelectorAll(shipQuery)) {
      const shipName = ship.querySelector('.name').innerHTML 
        + ' N' + ship.querySelector('.serial').innerHTML
      res += `${shipName} Атака ##${ship.querySelector('.param.attack').innerHTML}d10##\n`
    }
    if(res.length) {
      navigator.clipboard.writeText(res)
      log('ATK rolls copied', res)
    }
  },
  
  defence(isRight = false) {
    const shipQuery = formRolls.getQuery(isRight)
    let res = ''
    for(let ship of document.querySelectorAll(shipQuery)) {
      const shipName = ship.querySelector('.name').innerHTML 
        + ' N' + ship.querySelector('.serial').innerHTML
      const shieldNum = +ship.querySelector('.shield.curr').innerHTML
      res += `${shipName} Защита ##${ship.querySelector('.param.defence').innerHTML}d10##\n`
        // уклонение
        + (shieldNum>0 ? `${shipName} Щит ##${shieldNum}d10##\n` : '')
    }
    if(res.length) {
      navigator.clipboard.writeText(res)
      log('DEF rolls copied', res)
    }
  },
}

const dumper = {
  fieldsToSave: [
    'id',
    'parent',
    'side',
    'name',
    'hp.curr',
    'hp.max',
    'shield.curr',
    'shield.max',
    'param.attack',
    'param.defence',
    'param.speed',
  ],

  save() {
    const unitEls = Array.from(document.querySelectorAll('.ship'))

    var unitData = unitEls.map( el => {
      const res = {
        top: el.parentNode.style.top,
        left: el.parentNode.style.left,
        size: el.querySelector('.image img')?.title
      }
      for(let field of this.fieldsToSave) {
        res[field] = el.querySelector(`.${field}`).innerText
      }
      return res 
    }).filter(obj => obj.id)
    
    console.log(JSON.stringify(unitData))
  },

  load() {
    const jsonStr = prompt('Paste JSON here')
    let data
    try {
      data = JSON.parse(jsonStr)
    } catch(err) {
      console.log('not a valid JSON', err)
      return
    }

    const templates = data.filter( obj => !obj.top)
    const units = data.filter( obj => obj.top)

    nextId = 0
    shipBlock.left.querySelector('.'+UNIT_FIELD).innerHTML = ''
    shipBlock.right.querySelector('.'+UNIT_FIELD).innerHTML = ''
    for(let obj of templates) {
      onAddShipTemplate.addTemplate(obj.side === 'right', obj)
    }

    for(let obj of units) {
      addUnitToBattle(0, obj)
    }
    log(units)

  }
}

function addTopBtnsListeners() {
  shipBlock.left.querySelector('button.b_add_ship').addEventListener('click', onAddShipTemplate.left)
  shipBlock.right.querySelector('button.b_add_ship').addEventListener('click', onAddShipTemplate.right)

  shipBlock.left.querySelector('button.b_attack').addEventListener('click', ()=>formRolls.attack(false))
  shipBlock.right.querySelector('button.b_attack').addEventListener('click', ()=>formRolls.attack(true))

  shipBlock.left.querySelector('button.b_defend').addEventListener('click', ()=>formRolls.attack(false))
  shipBlock.right.querySelector('button.b_defend').addEventListener('click', ()=>formRolls.defence(true))

}

function main() {
    addTopBtnsListeners()

    onAddShipTemplate.addTemplate(false)
    onAddShipTemplate.addTemplate(true)
  // if(location.search) {
  //   getEl('el_select_colony').value = locationSearchToArray(location.search)
  // }
}
main()

window.onbeforeunload = function (_) {
  if (getEl('battle_field').innerHTML)
    return true
}