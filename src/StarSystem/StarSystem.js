// common.js
/* global
  getEl log
*/

const RAW_EXAMPLE = `20d6: (3 + 4 + 5 + 6 + 3 + 2 + 5 + 3 + 3 + 5 + 5 + 5 + 2 + 4 + 1 + 4 + 3 + 4 + 5 + 3) = 75
  20d6: (5 + 4 + 3 + 5 + 3 + 5 + 1 + 6 + 4 + 3 + 3 + 6 + 2 + 4 + 3 + 6 + 3 + 1 + 1 + 1) = 69
  20d6: (5 + 1 + 3 + 6 + 3 + 2 + 2 + 5 + 4 + 4 + 1 + 5 + 6 + 6 + 5 + 5 + 2 + 5 + 6 + 5) = 81
  20d6: (5 + 1 + 4 + 3 + 3 + 6 + 1 + 2 + 6 + 2 + 3 + 4 + 1 + 5 + 6 + 1 + 3 + 3 + 5 + 4) = 68
  20d6: (2 + 5 + 3 + 2 + 2 + 4 + 3 + 4 + 2 + 5 + 1 + 5 + 1 + 6 + 2 + 2 + 1 + 6 + 5 + 1) = 62`

const E = {
  giant: {
    none: null,
    conventional: 'conventional',
    eccentric: 'eccentric',
    epistellar: 'epistellar',
  },
  type: {
    none: null,
    asteroid: 'asteroid',
    terrestrial: 'terrestrial',
    giant: 'giant',
  },
  size: {
    tiny: 'tiny',
    small: 'small',
    medium: 'medium',
    large: 'large',
    huge: 'huge',
  }
}

const genDict = {
  firstGiant: {
    10: E.giant.none,
    12: E.giant.conventional,
    14: E.giant.eccentric,
    // (перешедший с окраин горячий юпитер, выбросил сформированные планеты)
    18: E.giant.epistellar,
  },
  BEYOND_SNOW_LINE: 5,
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

const StarSystemGenerator = {
  start() {
    let rawCubes = prompt('paste here many d6 cubes in 2ch roll format')
    this.startRaw(rawCubes)
  },
  startRaw(rawCubes) {
    if (!rawCubes) rawCubes = RAW_EXAMPLE
    const cubes = this.extractRolls(rawCubes)
    const startingLength = cubes.length
    if(startingLength == 0) {
      alert('No proper rolls in input')
      return
    }
    const system = this.generate(cubes)
    log('rolles used:', startingLength - cubes.length)
    console.table(system)
  },
  extractRolls(raw) {
    return [...raw.matchAll(/\d+d6: \((\d+(?: \+ \d+){0,20})\)/g)]
      .map(e => e[1].split(' + ').map(e => +e))
      .flat()
  },
  generate(randomD6Arr) {
    const system = []

    const density = getEl('el_density').value
    const nOfPlanets = density / 5
    const densityMod = Math.floor((nOfPlanets - 10) / 1)
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

    function planet(type, size = null, special = null) {
      return { type, size, special }
    }

    function giantSize(i) {
      const mod = i <= genDict.BEYOND_SNOW_LINE ? 4 : 0
      return getKey(genDict.giantSize, pop3() + mod + densityMod)
    }

    // first giant
    const firstGiantType = getKey(genDict.firstGiant, pop3('firstGiantType'))
    let firstLocation = -1

    switch(firstGiantType) {
      case E.giant.conventional:
        firstLocation = Math.min(pop1()+genDict.BEYOND_SNOW_LINE, 11)
        break
      case E.giant.eccentric:
        firstLocation = Math.min(pop1()+3, 11)
        break
      case E.giant.epistellar:
        firstLocation = Math.max(4-pop1(), 1)
        break
    }
    if(firstGiantType) {
      system[firstLocation] = planet(
        E.type.giant, 
        giantSize(firstLocation),
        firstGiantType
      )
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
      p = Math.max(p + densityMod, 1)
      if(!p) continue
      if(pop3(null, i + ' giant exist') > p) continue
      system[i] = planet(E.type.giant, giantSize(i))
    }

    // non-giant planets
    for(let i = 1; i <= 11; i++) {
      if(system[i]) continue
      let mod = 0-2
      if(system[i+1] && system[i+1].type == E.type.giant) mod -= 6
      if(system[i-1] && system[i-1].type == E.type.giant) mod -= 3
      if(i == 1 || i == 11) mod -= 3
      let content = getKey(genDict.orbitContents, pop3() + mod + densityMod)
      if(!content[0]) continue
      system[i] = planet(content[0], content[1])
    }

    // stat
    let systemSummarySize = 0
    for(let i = 1; i <= 11; i++) {
      if(!system[i]) continue
      systemSummarySize += Object.keys(E.size).indexOf(system[i].size)+1
    }
    log('systemSummarySize', systemSummarySize)

    return system
  },
}

// FIXME remove
StarSystemGenerator.startRaw()
