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
    if(i.classList.contains('hp') && +i.innerHTML <= 0) {
      el.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
        .className += 'cross'
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

let nextId = 1

const onAddShipTemplate = {
  left(evt) {
    onAddShipTemplate.addTemplate(evt)
  },
  right(evt) {
    onAddShipTemplate.addTemplate(evt, true)
  },
  addTemplate(evt, isRight) {
    // const sSize = prompt('Size? 1-6') || 1
    // log(evt.target.parentNode.querySelector('.ship_field'))
    const shipT = getEl('ship_template').cloneNode(true)
    shipT.id = `n${nextId}`
    shipT.querySelector('.id').innerText = nextId
    nextId++

    // shipT.className += ` ship_size_${sSize}`
    shipT.querySelector('.image').innerHTML = `<img src="assets/ships/3.png">`
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
  log(shipId)
  
  const shipT = getEl('n'+shipId).cloneNode(true)
  shipT.id = `n${nextId}`
  shipT.querySelector('.id').innerText = nextId
  nextId++
  addShipListeners(shipT)
  document.querySelector('#battle_field').append(shipT)
}

function main() {
    shipBlock.left.querySelector('button').addEventListener('click', onAddShipTemplate.left)
    shipBlock.right.querySelector('button').addEventListener('click', onAddShipTemplate.right)

    shipBlock.left.querySelector('button').click()
    shipBlock.right.querySelector('button').click()
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