// game logic functions common for some of the pages

// common.js
/// <reference path="./common.js"/>
/* global
log warn
*/

/* exported
rules
countPlanetRawMisery 
*/

var rules = {
  effectsOfPlanetSize: {
    // Газовый гигант с колонизируемым спутником
    1: [
      ["Пуски", 2],
      ["Отказ", 2],
      ["особое", "радиация"],
      ["особое", "микрометеориты"],
      ["особое", "низкая гравитация"],
    ],
    // Малая планета (напр. Меркурий)
    2: [
      ["Пуски", 2],
      ["Отказ", 2],
      ["особое", "радиация"],
      ["особое", "микрометеориты"],
      ["особое", "низкая гравитация"],
    ],
    // Планета вдвое меньше Земли (напр. Марс)
    3: [
      ["Пуски", 1],
    ],
    // Планета, похожая на Землю
    4: [],
    // Большая каменная планета
    5: [
      ["Пуски", -1],
    ],
    // Планета вдвое больше Земли
    6:
      [
        ["Строительство", -1],
        ["Пуски", -1],
        ['Исследования (ветка "Физика пространства")', 1],
        ["Трансураны", 1],
        ["особое", "высокая гравитация"],
      ],
  },
  DIFFICULTY_MULTS: [
    0,
    // #1
    1,
    1.6,
    // #3
    1.6,
    2,
    // #5
    2.6,
    3, 
    3.6,
    // #8
    4,
    5, 
    6,
    // #11
    7,
    8, 
    9,
    // #14
    10,
    11,
    12,
  ],
}

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

  // const unfamThreshold = 2
  // if(sumMisery.unfamiliar >= unfamThreshold) {
  //   sumMisery.alien += Math.floor(sumMisery.unfamiliar/unfamThreshold)
  //   sumMisery.unfamiliar = sumMisery.unfamiliar % (unfamThreshold)
  // }
  sumMisery.actionsList = sumMisery.actionsList.join('; ')
  // sumMisery.weather = Math.ceil(sumMisery.alien * 2) + sumMisery.unfamiliar
  return sumMisery
}