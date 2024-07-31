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
  BEYOND_SNOW_LINE: 8,
  otherGiants: {
    insideSnow: {
      [E.giant.none]: null,
      [E.giant.conventional]: null,
      // -
      [E.giant.eccentric]: 8,
      [E.giant.epistellar]: 6,
    },
    outsideSnow: {
      [E.giant.none]: null,
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
  // -6 if the orbit is adjacent to a forbidden zone caused by the presence of a companion star; 
  // -6 if the next orbit outward from the primary star is occupied by a gas giant; 
  // -3 if the next orbit inward from the primary star is occupied by a gas giant; 
  // -3 if the orbit is adjacent to either the inner limit radius or the outer limit radius.
  // All of these modifiers are cumulative.
  orbitContents: {
    3: [E.type.none, E.size.medium],
    6: [E.type.asteroid, E.size.medium],
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
    if (dict[i]) return dict[i]
    i++
  }
  // well, it is the last one
  while (i > 0) {
    if (dict[i]) return dict[i]
    i--
  }
}

const StarSystemGenerator = {
  start() {
    let rawCubes = null
    // FIXME remove comment
    // prompt('paste here many d6 cubes in 2ch roll format')
    if (!rawCubes) rawCubes = RAW_EXAMPLE
    const cubes = this.extractRolls(rawCubes)
    const system = this.generate(cubes)
    // FIXME
    // log(cubes)
    log(system)
  },
  extractRolls(raw) {
    return [...raw.matchAll(/\d+d6: \((\d+(?: \+ \d+){0,20})\)/g)]
      .map(e => e[1].split(' + ').map(e => +e))
      .flat()
  },
  generate(randomD6Arr) {
    function pop1() {
      return +randomD6Arr.splice(-1)
    }
    function pop3() {
      return randomD6Arr.splice(-3).reduce((a, e) => a + +e, 0)
    }

    function planet(type, size, special = null) {
      return { type, size, special }
    }

    const system = []

    const firstGiantType = getKey(genDict.firstGiant, pop3())

    return system
  },
}

// FIXME remove
StarSystemGenerator.start()
