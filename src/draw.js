/// <reference path="./common.js"/>
/* global
  getEl  
*/

/* exported 
  draw
*/

var draw = {
  SVG_NS: "http://www.w3.org/2000/svg",
  POLYGON_DELTA: 20,
  tech: null,
  Node: function (treeName, t) {
    //  for modules
    //  for projects - rounded rect
    switch (t.type) {
      case 'rectangle':
        draw.SVG.Rect(t)
        break
      case 'parallelogram':
        draw.SVG.Prlg(t)
        break
      case 'parallelogram2':
        draw.SVG.Prlg2(t)
        break
      case 'trapezoid':
        draw.SVG.Trapezioid(t)
        break
      case 'trapezoid2':
        draw.SVG.Trapezioid2(t)
        break
      case 'hexagon':
        draw.SVG.Hexagon(t)
        break
      case 'fatarrow':
        draw.SVG.FatArrow(t)
        break
      case 'octagon':
        draw.SVG.Octagon(t)
        break
      case 'ellipse':
        draw.SVG.Ellipse(t)
        break
      default:
        console.error('drawing not implemented for type ' + t.type)
        return
    }

    draw.SVG.Text(t.nodeCenter, t)

    for (let i of t.next) {
      this.connectNodes(t, this.tech[treeName][i])
    }
  },

  connectNodes(n1, n2) {
    draw.SVG.Line(
      n1.x + n1.w / 2
      , n1.y + n1.h / 2
      , n2.x + n2.w / 2
      , n2.y + n2.h / 2
    )
  },

  // https://stackoverflow.com/questions/6995797/html5-canvas-pie-chart

  SVG: {
    Prlg: function ({ id, x, y, h, w, borderColor, fill, title }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x + d},${y}
        ${x + w},${y}
        ${x + w - d},${y + h}
        ${x},${y + h}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill, title })
    },

    Prlg2: function ({ id, x, y, h, w, borderColor, fill, title }) {
      const d = draw.POLYGON_DELTA
      var points = `
        ${x},${y}
        ${x + w - d},${y}
        ${x + w},${y + h}
        ${x + d},${y + h}
      `
      return draw.SVG.Poly(points, { id, borderColor, fill, title })
    },

    Hexagon: function ({ id, x, y, h, w, borderColor, fill }) {
      const d = draw.POLYGON_DELTA
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
      const d = draw.POLYGON_DELTA
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

    Octagon: function ({ id, x, y, h, w, borderColor, fill, title }) {
      const d = draw.POLYGON_DELTA
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
      return draw.SVG.Poly(points, { id, borderColor, fill, title })
    },

    Poly(points, { id, borderColor, fill, title }) {
      var el = document.createElementNS(draw.SVG_NS, 'polygon')
      el.setAttributeNS(null, 'id', id)
      el.setAttributeNS(null, 'points', points)
      el.setAttributeNS(null, 'fill', fill)
      el.setAttributeNS(null, 'stroke', borderColor)
      el.setAttributeNS(null, 'stroke-width', 3)

      if(title) el.innerHTML = '<title>'+title+'</title>'
      document.getElementById('svg').appendChild(el)
      return el
    },

    Ellipse({ id, nodeCenter, h, w, borderColor, fill, title }) {
      var el = document.createElementNS(draw.SVG_NS, 'ellipse')
      el.setAttributeNS(null, 'id', id)
      el.setAttributeNS(null, 'fill', fill)
      el.setAttributeNS(null, 'stroke', borderColor)
      el.setAttributeNS(null, 'stroke-width', 3)
      el.setAttributeNS(null, 'cx', nodeCenter.x)
      el.setAttributeNS(null, 'cy', nodeCenter.y)
      el.setAttributeNS(null, 'rx', w/2)
      el.setAttributeNS(null, 'ry', h/2)

      if(title) el.innerHTML = '<title>'+title+'</title>'
      document.getElementById('svg').appendChild(el)
      return el
    },

    Line: function (x1, y1, x2, y2) {
      var line = document.createElementNS(draw.SVG_NS, 'line')
      line.setAttribute('x1', x1)
      line.setAttribute('y1', y1)
      line.setAttribute('x2', x2)
      line.setAttribute('y2', y2)
      line.setAttribute("stroke", "black")
      line.setAttributeNS(null, 'stroke-width', 2)

      getEl('svg').insertBefore(line, getEl('svg').firstChild)
    },

    Text: function ({ x, y }, {fullText, id, fontSize, title}) {

      var el = document.createElementNS(draw.SVG_NS, 'text')
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
      const isFirefox = navigator.userAgent.indexOf("Firefox") !== -1
      for (let i in arr) {
        if (i == 0) {
          let dy = arr.length == 3 ? '-0.6' : '-1.4'
          if(fontSize) dy = '+0.35'
          el.innerHTML = `<tspan id="${id}_t0" dx='0' dy="${dy}em">${arr[i]}</tspan>`
        }
        else {
          el.innerHTML += `<tspan id="${id}_t${i}" dx='0' dy="1.2em" 
          class="">${arr[i]}</tspan>`
          // it breaks dnload  for some reason
          // class="${arr[i].replace(/(^.+:|\+\d)/g,'').replace(/[\d)(,.ё_)]/g,'').trim().replace(/ /g,'_')}"
          curr = getEl(id + '_t' + i)
          curr_dx = -(getEl(id + '_t' + (i - 1)).getBBox().width / 2)
          curr_w = +curr.getBBox().width
          const dx = isFirefox 
            ? -getEl(id + '_t' + (i - 1)).getBBox().width - curr_w / 2
            : curr_dx - curr_w / 2
          curr.setAttribute('dx', dx)
        }
      }

      curr_dx = -getEl(id + '_t').getBBox().width / 2
      getEl(id + '_t0').setAttribute('dx', curr_dx )

      if(title) getEl(id + '_t').innerHTML += `<title>${title}</title>`
    },

    Point: function (x, y) {
      var el = document.createElementNS(draw.SVG_NS, 'circle')
      el.setAttributeNS(null, 'cx', x)
      el.setAttributeNS(null, 'cy', y)
      el.setAttributeNS(null, 'r', 3)
      el.setAttributeNS(null, 'fill', 'black')
      el.setAttributeNS(null, 'stroke', 'red')
      el.setAttributeNS(null, 'stroke-width', 1)
      getEl('svg').appendChild(el)
    },

    Rect: function ({ id, x, y, h, w, borderColor, fill, title }) {
      var rect = document.createElementNS(draw.SVG_NS, 'rect')
      rect.setAttributeNS(null, 'id', id)
      rect.setAttributeNS(null, 'x', x)
      rect.setAttributeNS(null, 'y', y)
      rect.setAttributeNS(null, 'height', h)
      rect.setAttributeNS(null, 'width', w)
      rect.setAttributeNS(null, 'fill', fill)
      rect.setAttributeNS(null, 'stroke', borderColor)
      rect.setAttributeNS(null, 'stroke-width', 3)
      if(title) rect.innerHTML = '<title>'+title+'</title>'
      document.getElementById('svg').appendChild(rect)
      return rect
    }
  }
}