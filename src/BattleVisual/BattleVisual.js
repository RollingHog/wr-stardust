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
    const shipT = getEl('ship_template').cloneNode(true)
    shipT.id = `n${nextId}`
    shipT.querySelector('.id').innerText = nextId
    nextId++

    shipT.querySelector('.parent').setAttribute('parent', shipT.id)

    shipT.querySelector('.image').innerHTML = `<img src="assets/ships/${size}.png">`

    if(size > 0) {
      // its not a planet
      shipT.querySelector('.hp.curr').innerHTML = size
      shipT.querySelector('.hp.max').innerHTML = size
    }

    shipT.hidden = false
    addShipListeners(shipT)
    if(!isRight) {
      shipT.querySelector('.side').innerText = 'left'
      shipT.querySelector('.ship').className += ' side_blue'
      shipBlock.left.querySelector('.'+SHIP_FIELD).appendChild(shipT)
    } else {
      shipT.querySelector('.side').innerText = 'right'
      shipT.querySelector('.ship').className += ' side_orange'
      shipT.querySelector('.image').className += ' mirror_vert'
      shipBlock.right.querySelector('.'+SHIP_FIELD).appendChild(shipT)
    }
  }
}

// eslint-disable-next-line no-unused-vars
function addShipToBattle(shipId) {
  const shipT = getEl('n'+shipId).cloneNode(true)
  shipT.id = `n${nextId}`
  shipT.querySelector('.id').innerText = nextId
  nextId++

  const parentId = shipT.querySelector('.parent').getAttribute('parent')
  log(document.querySelectorAll(`[parent="${parentId}"]`))
  shipT.querySelector('.serial').innerHTML = document.querySelectorAll(`[parent="${parentId}"]`).length 

  addShipListeners(shipT)
  document.querySelector('#battle_field').append(shipT)
}

function main() {
    shipBlock.left.querySelector('button').addEventListener('click', onAddShipTemplate.left)
    shipBlock.right.querySelector('button').addEventListener('click', onAddShipTemplate.right)

    onAddShipTemplate.addTemplate()
    onAddShipTemplate.addTemplate(true)
  // getEl('el_select_colony').innerHTML = Object.keys(playersData)
  //   .map (e => `<option value="${e}">${e}`)
  //   .join('\n')
  // getEl('el_select_colony').onchange = _ => createImage(getEl('el_select_colony').value)
  // if(location.search) {
  //   getEl('el_select_colony').value = locationSearchToArray(location.search)
  //     .filter(([key]) => key === 'user')[0][1]
  //   getEl('el_select_colony').onchange()
  // }
}
main()

window.onbeforeunload = function (_) {
  if (getEl('battle_field').innerHTML)
    return true
}