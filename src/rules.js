// game logic functions common for some of the pages

// common.js
/* global
log warn
*/

/* exported
countPlanetRawMisery
*/


/**
 * @param {TGoogleDocUserObj} userObj 
 */
function countPlanetRawMisery(userObj) {
  const planet = userObj.planetParams
  const m = {
    // unfamiliar / alien
    u1: { unfamiliar: 1 },
    u2: { unfamiliar: 2 },
    u3: { unfamiliar: 3 },
    a1: { alien: 1 },
    a2: { alien: 2 },
    a3: { alien: 3 },
  }
  const miseryTable = {
    Вода: [
      '1-20', m.u1, '80-100', m.u1,
    ],
    Гористость: [
      [1, 5], m.u1,
    ],
    'Тип аномалии': [
      // '7-9', m.u1,
    ],
    'Масштаб аномалии': [
      // '1-10', m.u1, '90-100', m.u1,
    ],
    'Расстояние до звезды': [
      [1, 11], m.a2,
      [2, 3, 4, 8, 9, 10], m.a1,
      [5, 7], m.u1,
    ],
    'Ресурсы': [
      '1-10', m.u1
    ],
    'Тип планеты': [
      [1, 2], m.a1,
      [3], m.u3,
      [5], m.u1,
      [6], m.u2,
    ],
  }

  const sumMisery = {
    alien: 0,
    unfamiliar: 0,
    // weather: 0,
    actionsList: [],
  }
  for (let i in miseryTable) {
    const value = +planet[i]
    const b = miseryTable[i]
    if (!value) continue
    for (let j in b) {
      if (j % 2 === 1) continue
      const q = b[j]
      if (Array.isArray(q)) {
        if (q.includes(value)) {
          if (b[+j + 1].unfamiliar) sumMisery.unfamiliar += b[+j + 1].unfamiliar
          if (b[+j + 1].alien) sumMisery.alien += b[+j + 1].alien
          const obj = Object.entries(b[+j + 1])
          sumMisery.actionsList.push([i, value, obj[0][0].slice(0, 1) + obj[0][1].toString(10)].join(','))
          break
        }
      }
      else if (typeof q === 'string') {
        const baf = q.split('-')
        if (value >= +baf[0] && value <= +baf[1]) {
          if (b[+j + 1].unfamiliar) sumMisery.unfamiliar += b[+j + 1].unfamiliar
          if (b[+j + 1].alien) sumMisery.alien += b[+j + 1].alien
          const obj = Object.entries(b[+j + 1])
          sumMisery.actionsList.push([i, value, obj[0][0].slice(0, 1) + obj[0][1].toString(10)].join(','))
          break
        }
      }
    }
  }

  // const unfamTreshold = 2
  // if(sumMisery.unfamiliar >= unfamTreshold) {
  //   sumMisery.alien += Math.floor(sumMisery.unfamiliar/unfamTreshold)
  //   sumMisery.unfamiliar = sumMisery.unfamiliar % (unfamTreshold)
  // }
  sumMisery.actionsList = sumMisery.actionsList.join('; ')
  // sumMisery.weather = Math.ceil(sumMisery.alien * 2) + sumMisery.unfamiliar
  return sumMisery
}