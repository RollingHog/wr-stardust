// common.js
/* global
getEl log 
makeElDraggable
*/

const shipBlock = {
  left: getEl('tr_field').children[0],
  right: getEl('tr_field').children[2],
}

const SHIP_FIELD = 'ship_field'

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
    const size = prompt('Size? 0-6, 0 is planet')
    onAddShipTemplate.addTemplate(isRight, size || 3)
  },

  addTemplate(isRight, size=3) {
    /** @type {HTMLElement} */
    const tshipEl = getEl('ship_template').cloneNode(true)
    tshipEl.id = `n${nextId}`
    tshipEl.querySelector('.id').innerText = nextId
    nextId++

    tshipEl.querySelector('.parent').setAttribute('parent', tshipEl.id)

    if(size != 0) {
      tshipEl.querySelector('.image').innerHTML = `<img src="assets/ships/${size}.png">`
    } else {
      // planet
      tshipEl.querySelector('.image').innerHTML = `<img src="assets/planets/terrestrial.png">`
      tshipEl.querySelector('.param.speed').innerHTML = 0
      tshipEl.querySelector('.hp.max').innerHTML = 10
      setTimeout(()=>tshipEl.querySelector('.b_add_to_battle').click(), 20)
      setTimeout(()=>tshipEl.querySelector('.b_remove').click(), 50)
      
      // TODO add to battle and remove template
    }

    if(size > 0) {
      // its not a planet
      tshipEl.querySelector('.hp.max').innerHTML = size*2
    }
    tshipEl.querySelector('.hp.curr').innerHTML = tshipEl.querySelector('.hp.max').innerHTML

    tshipEl.hidden = false
    tshipEl.querySelector('.image').addEventListener('click', () => addShipToBattle(tshipEl.id))
    addShipListeners(tshipEl)
    if(!isRight) {
      tshipEl.querySelector('.side').innerText = 'left'
      tshipEl.querySelector('.ship').className += ' side_blue'
      shipBlock.left.querySelector('.'+SHIP_FIELD).appendChild(tshipEl)
    } else {
      tshipEl.querySelector('.side').innerText = 'right'
      tshipEl.querySelector('.ship').className += ' side_orange'
      tshipEl.querySelector('.image').className += ' mirror_vert'
      shipBlock.right.querySelector('.'+SHIP_FIELD).appendChild(tshipEl)
    }
  }
}

// eslint-disable-next-line no-unused-vars
function addShipToBattle(shipId) {
  const shipT = (getEl('n'+shipId) || getEl(shipId)).cloneNode(true)
  shipT.id = `n${nextId}`
  shipT.querySelector('.id').innerText = nextId
  nextId++

  const parentId = shipT.querySelector('.parent').getAttribute('parent')
  // log(document.querySelectorAll(`[parent="${parentId}"]`))
  shipT.querySelector('.serial').innerHTML = document.querySelectorAll(`[parent="${parentId}"]`).length 

  addShipListeners(shipT)
  document.querySelector('#battle_field').append(shipT)
}

const formRolls = {
  getQuery(isRight) {
    return isRight 
      ? '#battle_field .ship.side_orange'
      : '#battle_field .ship.side_blue'
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