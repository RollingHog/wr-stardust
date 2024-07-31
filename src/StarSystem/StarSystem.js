// common.js
/* global
  getEl log
*/

const RAW_EXAMPLE = `20d6: (3 + 4 + 5 + 6 + 3 + 2 + 5 + 3 + 3 + 5 + 5 + 5 + 2 + 4 + 1 + 4 + 3 + 4 + 5 + 3) = 75
  20d6: (5 + 4 + 3 + 5 + 3 + 5 + 1 + 6 + 4 + 3 + 3 + 6 + 2 + 4 + 3 + 6 + 3 + 1 + 1 + 1) = 69
  20d6: (5 + 1 + 3 + 6 + 3 + 2 + 2 + 5 + 4 + 4 + 1 + 5 + 6 + 6 + 5 + 5 + 2 + 5 + 6 + 5) = 81
  20d6: (5 + 1 + 4 + 3 + 3 + 6 + 1 + 2 + 6 + 2 + 3 + 4 + 1 + 5 + 6 + 1 + 3 + 3 + 5 + 4) = 68
  20d6: (2 + 5 + 3 + 2 + 2 + 4 + 3 + 4 + 2 + 5 + 1 + 5 + 1 + 6 + 2 + 2 + 1 + 6 + 5 + 1) = 62`

const EARTH_EXAMPLE = `99d6: ( 4 + 6 + 5 + 1 + 1 ) = 0`

const E = {
  giant: {
    none: 'none',
    conventional: 'conventional',
    eccentric: 'eccentric',
    epistellar: 'epistellar',
  },
  type: {
    none: null,
    asteroid: 'asteroid',
    satellite: 'satellite',
    terrestrial: 'terrestrial',
    giant: 'giant',
  },
  size: {
    tiny: 'tiny',
    small: 'small',
    medium: 'medium',
    large: 'large',
    huge: 'huge',
  },
  keys: {
    density: 'density',
    rest: 'rest',
  },
}

const genDict = {
  firstGiant: {
    10: E.giant.none,
    12: E.giant.conventional,
    14: E.giant.eccentric,
    // (перешедший с окраин горячий юпитер, выбросил сформированные планеты)
    18: E.giant.epistellar,
  },
  BEYOND_SNOW_LINE: 6,
  otherGiants: {
    insideSnow: {
      [E.giant.none]: null,
      [E.giant.conventional]: null,
      // -
      [E.giant.eccentric]: 8,
      [E.giant.epistellar]: 6,
    },
    outsideSnow: {
      [E.giant.none]: 4,
      [E.giant.conventional]: 15,
      // -
      [E.giant.eccentric]: 14,
      [E.giant.epistellar]: 14,
    },
  },
  //  Modifiers: +4 if the gas giant is
  //  inside the snow line radius, or if it is in
  //  the first orbit beyond the snow line
  //  radius.
  giantSize: {
    10: E.size.small,
    16: E.size.medium,
    17: E.size.large,
  },
  //  Modifiers:
  // NOPE -6 if the orbit is adjacent to a forbidden zone caused by the presence of a companion star;
  // -6 if the next orbit outward from the primary star is occupied by a gas giant;
  // -3 if the next orbit inward from the primary star is occupied by a gas giant;
  // -3 if the orbit is adjacent to either the inner limit radius or the outer limit radius.
  // All of these modifiers are cumulative.

  // ?adjust to make planets not occur THAT OFTEN
  orbitContents: {
    3: [E.type.none, null],
    6: [E.type.asteroid, E.size.tiny],
    8: [E.type.terrestrial, E.size.tiny],
    11: [E.type.terrestrial, E.size.small],
    15: [E.type.terrestrial, E.size.medium],
    16: [E.type.terrestrial, E.size.large],
    17: [E.type.terrestrial, E.size.huge],
  },

  /*
Снаружи линии снега - конвенционно только газовые гиганты. Не дают формироваться планетам на соседних к ним орбитах: там скорее будут астероиды.
Орбиты и линия снега
Орбит в рыбной системе 11. 11 в солнечной системе не занята. Пояс астероидов на 8й, линия снега между ней и Марсом. Орбиты расположены не в абсолютных величинах, а в смысле обитаемости, что удобно и не требует перерасчётов.
Плотность солнечной системы - 50, 8 планет и астероидный пояс (соси, Плутон!)
  */
satelliteList: {
  2: 0,
  4: 1,
  5: 2,
  6: 3,
  8: 4,
  10: 5,
  11: 6,
  12: 8,
  13: 9,
  14: 10,
  15: 12,
  16: 14,
  18: 16,
},
satelliteMods: {
  size: {
      [null]: 0,
      [E.size.tiny]: -4,
      [E.size.small]: -1,
      [E.size.medium]: 0,
      [E.size.large]: 1,
      [E.size.huge]: 4,
    },
    type: {
      [E.type.asteroid]: -6,
      [E.type.satellite]: -6,
      [E.type.terrestrial]: 0,
      [E.type.giant]: +6,
  },
 },
}

function getKey(dict, roll) {
  let i = +roll
  while (i <= 18) {
    if (typeof dict[i] !== 'undefined') return dict[i]
    i++
  }
  // well, it is the last one
  while (i > 0) {
    if (typeof dict[i] !== 'undefined') return dict[i]
    i--
  }
}

var DEV = false
function debug(data, str=null) {
  if(!DEV) return

  if(str) {
    log(str, data)
  } else {
    log(data)
  }
}

class TSSGPlanet {
  type = E.type.asteroid
  size = E.size.medium
  satellites = 0
  capital = false
  user = null
  giantType = null
}

const StarSystemGenerator = {
  start() {
    // prompt('paste here many d6 cubes in 2ch roll format / leave empty to use default')
    this.startRaw(getEl('el_rolls').value)
  },
  clear() {
    location.hash = ''
  },
  startRaw(rawCubes) {
    if (!rawCubes) rawCubes = RAW_EXAMPLE
    const cubes = this.extractRolls(rawCubes)
    const startingLength = cubes.length
    if(startingLength == 0) {
      alert('No proper rolls in input')
      return
    }
    const userPlanet = {
      type: getEl('el_sp_type').value,
      size: getEl('el_sp_size').value,
      i: getEl('el_sp_location').value,
    }
    const density = getEl('el_density').value
    const system = this.generate(
      cubes, 
      density,
      userPlanet
    )
    const d = startingLength - cubes.length
    log('rolles used', `${d/startingLength*100}%/${startingLength} total`)
    console.table(system)
    getEl('el_sys_str').innerText = this.compress(system, density, cubes)
    const str = this.compress(system, density, cubes)
    console.log(this.decompress(str))
    this.draw(getEl('el_canvas'), system)
  },

  /**
   * @returns {Number[]}
   */
  extractRolls(raw) {
    return [...raw.matchAll(/\d+d6: \((\d+(?: \+ \d+){0,20})\)/g)]
      .map(e => e[1].split(' + ').map(e => +e))
      .flat()
  },

  /**
   * @param {TSSGPlanet} system 
   * @param {Number[]} cubes 
   * @returns 
   */
  compress(system, density, cubes = []) {
    return system.map( (e,i) => [
      '&',
      i,
      '=', 
      e.type.slice(0,1),
      e.size.slice(0,1),
      e.satellites.toString(10).padStart(2, '0'),
      e.giantType ? 'gt' + e.giantType.slice(0,2) : '',
      e.user ? 'uu' : '',
      e.capital ? 'cc' : '',
    ].join('')).join('') 
    + `&${E.keys.rest}=` + cubes.join('')
    + `&${E.keys.density}=` + density
  },

  /**
   * @returns {{system: TSSGPlanet[], restCubes: Number[], density: Number}}
   */
  decompress(query) {
    let obj = query
      .split('&')
      .filter( e => e)
      .map( e => e.split('='))
    let restCubes = obj.filter(e => e[0] === E.keys.rest)
    if(restCubes.length) restCubes = restCubes[0][1]
    obj = obj.filter(e => e[0] !== E.keys.rest)
    let density = obj.filter(e => e[0] === E.keys.density)
    if(density.length) density = density[0][1]
    obj = obj.filter(e => e[0] !== E.keys.density)
    
    let arr = []
    for(let i of obj) {
      arr[i[0]] = i[1]
    }

    for(let i in arr) {
      if(!arr[i]) continue
      const d =  {
        main: arr[i].slice(0,4),
        optional: arr[i].slice(4)
      }

      const giantType = d.optional.match(/gt([a-z]{2})/)
      arr[i] = {
        type:  Object.keys(E.type).filter(e => e.startsWith(d.main.slice(0,1)))[0],
        size: Object.keys(E.size).filter(e => e.startsWith(d.main.slice(1,2)))[0],
        satellites: +d.main.slice(2,4),
        giantType: giantType ? Object.keys(E.giant).filter(e => e.startsWith(giantType[1]))[0] : '',
        user: d.optional.indexOf('uu') > -1,
        capital: d.optional.indexOf('cc') > -1,
      }
    }

    return {system: arr, restCubes, density}
  },

  generate(randomD6Arr, density, userPlanet) {
    /**
     * @type Array<TSSGPlanet>
     */
    const system = []

    const nOfPlanets = density / 5
    const fuckPlanetsMod = 1
    const densityMod = Math.floor((nOfPlanets - 10) / 2) - fuckPlanetsMod
    log({densityMod, nOfPlanets})

    function pop1(str) {
      const res = +randomD6Arr.splice(-1)
      if(str) debug(res, str)
      return res
    }
    function pop3(str) {
      const res = randomD6Arr.splice(-3).reduce((a, e) => a + +e, 0)
      if(str) debug(res, str)
      return res
    }

    function planet(type, size = null, {giantType =  null, capital = false, user = null} = {}) {
      if(capital && !user) user = true
      return { type, size, 
        satellites: getKey(genDict.satelliteList, 
          pop1()
          + genDict.satelliteMods.type[type]
          + genDict.satelliteMods.size[size]
          + densityMod
        ),
        giantType,
        capital,
        user
      }
    }

    function giantSize(i) {
      const mod = i <= genDict.BEYOND_SNOW_LINE ? 4 : 0
      return getKey(genDict.giantSize, pop3() + mod + densityMod)
    }

    system[userPlanet.i] = planet(userPlanet.type, userPlanet.size, { capital: true, user: true})

    // first giant
    const firstGiantType = getKey(genDict.firstGiant, pop3('firstGiantType'))
    let firstLocation = -1
    let globalMod = densityMod

    switch(firstGiantType) {
      case E.giant.conventional:
        firstLocation = Math.min(pop1()+genDict.BEYOND_SNOW_LINE, 11)
        break
      case E.giant.eccentric:
        firstLocation = Math.min(pop1()+3, 11)
        globalMod -= 3
        break
        case E.giant.epistellar:
        globalMod -= 4
        firstLocation = Math.max(4-pop1(), 1)
        break
    }
    console.log('first giant: ', firstGiantType, firstLocation)

    if(firstGiantType !== E.giant.none) {
      if(!system[firstLocation]) {
        system[firstLocation] = planet(
          E.type.giant, 
          giantSize(firstLocation),
          {giantType: firstGiantType}
        )
      } else {
        log('cannot place first giant: location taken')
      }


      // other giants
      for(let i = 1; i <= 11; i++) {
        if(system[i]) continue
        let p
        if(i <= genDict.BEYOND_SNOW_LINE) {
          //inside snow
          p = genDict.otherGiants.insideSnow[firstGiantType]
        } else {
          p = genDict.otherGiants.outsideSnow[firstGiantType]
        }
        p = Math.max(p + globalMod, 1)
        if(!p) continue
        if(pop3(null, i + ' giant exist') > p) continue
        system[i] = planet(E.type.giant, giantSize(i))
      }
    }

    // non-giant planets
    for(let i = 1; i <= 11; i++) {
      if(system[i]) continue
      let mod = 0
      if(system[i+1] && system[i+1].type == E.type.giant) mod -= 6
      if(system[i-1] && system[i-1].type == E.type.giant) mod -= 3
      if(i == 1 || i == 11) mod -= 3
      let content = getKey(genDict.orbitContents, pop3() + mod + globalMod)
      if(!content[0]) continue
      system[i] = planet(content[0], content[1])
    }

    // stat
    let systemSummarySize = 0
    let planetCount = 0
    for(let i = 1; i <= 11; i++) {
      if(!system[i]) continue
      systemSummarySize += Object.keys(E.size).indexOf(system[i].size)+1
      planetCount++
    }
    log({systemSummarySize, planetCount})

    return system
  },

  /**
   * 
   * @param {HTMLElement} canvasEl 
   * @param {TSSGPlanet[]} system 
   */
  draw(canvasEl, system) {
    canvasEl.innerHTML = ''
    for(let i = 1; i<system.length; i++) {
      const k = system[i]
      if(!k) continue
      
      let type = k.type
      let sizeIndex = Object.keys(E.size).indexOf(k.size)
      let size = 110 - (2 - sizeIndex) * 12

      switch (k.type) {
        case E.type.terrestrial:
          size -= 45
          if(i <= 4) type = type + '_hot'
          if(i >= genDict.BEYOND_SNOW_LINE) type = type + '_cold'
          break
        case E.type.giant:
          if(i <= 4) type = type + '_hot'
          if(i >= 8) type = type + '_cold'
            break
        default:
          break
      }

      const el = document.createElement('div')
      el.className = 'planet'
      // a + b*11 = 95
      // a + b*1 = 5
      // b = 9
      // a = -4
      el.style.left = `${8.5*i - 5}%`
      // const imgName = name
      //   .toLowerCase()
      //   .replace(/\([^)]+\)/g,'')
      //   .trim()
      //   .replace(/ /g, '_')
      el.innerHTML = `${i}${k.capital ? '&#9733;' : ''}${!k.capital && k.user ? '&#9632;' : ''}<br>
      <img src='assets/planets/${type}.png' style="width:${size}%" 
        alt="${k.type} ${k.size} ${k.giantType ? k.giantType : ''}"
        title="${k.type} ${k.size} ${k.giantType ? k.giantType : ''}"
      ><br>${k.giantType && k.giantType !== E.giant.conventional ? k.giantType : ''}`
      // el.title = name
      canvasEl.appendChild(el)
    }  
  },
}

;(function  main() {
  getEl('el_sp_location').innerHTML = Object.keys(' '.repeat(11).split(''))
    .map( e => `<option value="${+e+1}">${+e+1}</option>`)
  getEl('el_sp_location').value = 8
  getEl('el_sp_size').innerHTML = Object.keys(E.size)
    .map( e => `<option value="${e}">${e}</option>`)
  setTimeout(_ => {
    getEl('el_sp_size').value = E.size.medium
  }, 0)
  // FIXME remove
  StarSystemGenerator.startRaw()
  if(location.hash) {
    log('loading from hash...')
    const ddata = StarSystemGenerator.decompress(location.hash)
    const userPlanet = ddata.system.filter(e => e.capital)[0]
    log(ddata.density)
    getEl('el_sp_location').value = ddata.system.indexOf(userPlanet)
    getEl('el_sp_size').value = userPlanet.size
    getEl('el_density').value = ddata.density
    StarSystemGenerator.draw(getEl('el_canvas'), ddata.system)
    getEl('el_sys_str').innerText = StarSystemGenerator.compress(ddata.system, ddata.density, ddata.restCubes.split(''))
  }
})()