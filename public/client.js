(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var bel = require('bel')
var patch = require('./lib/diff')
var morph = require('nanomorph')

function createList () {
  function shuffle (type) {
    var start

    console.clear()

    if (type === 'test') {
      start = window.performance.now()
      patch(render(), element)
      window.alert(
        'Test algorithm diff result: ' +
        (window.performance.now() - start).toFixed(0) + 'ms'
      )
    }

    if (type === 'nanomorph') {
      start = window.performance.now()
      morph(element, render())
      window.alert(
        'Nanomorph diff result: ' +
        (window.performance.now() - start).toFixed(0) + 'ms'
      )
    }
  }

  function render () {
    return bel`<div className="app">
      <h1>Selected: ${Math.random()}</h1>
      <button onclick=${() => shuffle('test')}> Shuffle Test algorithm</button>      
      <button onclick=${() => shuffle('nanomorph')}> Shuffle Nanomorph</button>      
      ${list(randomArray())}
    </div>`
  }
  var element = render()
  return element
}

function list (items, shuffle) {
  function render () {
    return bel`<ul>
    ${items.map(function (item, i) {
      return bel`<li id=${i}-${item}>${button(i, item)}</li>`
    })}
    </ul>`
  }
  function button (id, label) {
    return bel`<button class="${label}" onclick=${function () {
      shuffle(id)
    }}>${label}</button>`
  }
  var element = render()
  return element
}

function randomArray () {
  return Array(2000).fill().map(() => Math.round(Math.random() * 5))
}

document.body.appendChild(createList())

},{"./lib/diff":2,"bel":4,"nanomorph":8}],2:[function(require,module,exports){
var XLINK_NS = 'http://www.w3.org/1999/xlink'
var NS_ATTRS = {
  show: XLINK_NS,
  actuate: XLINK_NS,
  href: XLINK_NS
}
var PATCH = 2
var INSERTION = 4
var DELETION = 8

function patch (newch, oldch, parent) {
  var childNode = oldch

  if (oldch === newch) {
    return childNode
  }

  var t1, t2
  if (isText((t1 = oldch)) && isText((t2 = newch))) {
    if (t1.nodeValue !== t2.nodeValue) {
      childNode.nodeValue = t2.nodeValue
    }
  } else if (oldch.tagName === newch.tagName &&
    (oldch instanceof window.SVGElement) === (newch instanceof window.SVGElement)) {
    var isSvg = (oldch instanceof window.SVGElement)
    var type = oldch.tagName
    if (typeof type === 'string') {
      var isSelect = !isSvg && type.length === 6 && type === 'SELECT'
      var isAnyInput =
        !isSelect &&
        !isSvg &&
        (type.toUpperCase() === 'INPUT' ||
        type.toUpperCase() === 'OPTION')
      if (isAnyInput) {
        updateInput(childNode, newch, oldch)
      } else {
        setAttributes(childNode, newch, oldch)
        patchChildren(childNode, newch.childNodes, oldch.childNodes)
      }
    } else {
      throw new Error('Unkown node type! ' + type)
    }
  } else {
    childNode = newch
    if (parent) {
      parent.replaceChild(childNode, oldch)
    }
  }
  newch = childNode
  return childNode
}

function patchChildren (parent, newChildren, oldChildren) {
  if (newChildren.length === 1 && oldChildren.length === 1 &&
    isText(newChildren[0]) && isText(oldChildren[0])) {
    if (newChildren[0].nodeValue !== oldChildren[0].nodeValue) {
      patch(newChildren[0], oldChildren[0], parent)
    }
  } else if ((newChildren.length === 1 && isText(newChildren[0])) ||
    (oldChildren.length === 1 && isText(oldChildren[0]))) {
    replaceChildren(parent, newChildren, oldChildren)
  } else if (newChildren.length && oldChildren.length) {
    diffChildren(parent, newChildren, oldChildren)
  } else {
    replaceChildren(parent, newChildren, oldChildren)
  }
}

function appendChildren (
  parent,
  children,
  start = 0,
  end = children.length - 1,
  beforeNode
) {
  var ref = start
  while (start <= end) {
    var ch = children[ref]
    parent.insertBefore(ch, beforeNode)
    start++
  }
}

function diffCommonPrefix (s1, s2, start1, end1, start2, end2, parent) {
  var k = 0
  var c1
  var c2
  while (
    start1 <= end1 &&
    start2 <= end2 &&
    canUpdate(c1 = s1[start1], c2 = s2[start2])
  ) {
    if (parent) patch(c1, c2, parent)
    start1++
    start2++
    k++
  }
  return k
}

function diffCommonSuffix (s1, s2, start1, end1, start2, end2, parent) {
  var k = 0
  var c1
  var c2
  while (
    start1 <= end1 &&
    start2 <= end2 &&
    canUpdate(c1 = s1[end1], c2 = s2[end2])
  ) {
    if (parent) patch(c1, c2, parent)
    end1--
    end2--
    k++
  }
  return k
}

function removeChildren (
  parent,
  children,
  start = 0,
  end = children.length - 1
) {
  var cleared
  var ref = start
  if (parent.childNodes.length === end - start + 1) {
    parent.textContent = ''
    cleared = true
  }
  while (start <= end) {
    var ch = children[ref]
    if (!cleared) parent.removeChild(ch)
    start++
  }
}

function replaceChildren (
  parent,
  content,
  oldContent
) {
  removeChildren(parent, oldContent, 0, oldContent.length - 1)
  appendChildren(parent, content)
}

function setAttributes (newNode, oldNode) {
  var newAttrs = newNode.attributes
  var oldAttrs = oldNode.attributes
  for (var i = 0; i < newAttrs.length; i++) {
    var key = newAttrs[i].name
    var newv = newAttrs[i].value
    var oldv = oldNode ? oldNode.attributes[i].value : undefined
    if (oldv !== newv) {
      setDOMAttr(oldNode, key, newv)
    }
  }

  for (var j = 0; j < oldAttrs.length; j++) {
    var testKey = oldAttrs[j].name
    if (!newAttrs[testKey]) {
      oldNode.removeAttribute(testKey)
    }
  }
}

function setDOMAttr (oldNode, attr, value) {
  if (value === true) {
    oldNode.setAttribute(attr, '')
  } else if (value === false) {
    oldNode.removeAttribute(attr)
  } else {
    var ns = NS_ATTRS[attr]
    if (ns !== undefined) {
      oldNode.setAttributeNS(ns, attr, value)
    } else {
      oldNode.setAttribute(attr, value)
    }
  }
}

function isText (n) {
  return n.nodeType === 3
}

function canUpdate (a, b) {
  if (a.tagName && b.tagName) {
    return a.tagName === b.tagName && a.id === b.id && a.className === b.className
  } else if (isText(a) && isText(b)) {
    return a.textContent === b.textContent
  }

  return false
}

function updateInput (parent, newNode, oldNode) {
  if (!oldNode.value || oldNode.value !== newNode.value) {
    oldNode.value = newNode.value
  }
  patchChildren(parent, newNode.childNodes, oldNode.childNodes)
}

function indexOf (a, suba, aStart, aEnd, subaStart, subaEnd, eq) {
  var j = subaStart
  var k = -1
  var subaLen = subaEnd - subaStart + 1
  while (aStart <= aEnd && aEnd - aStart + 1 >= subaLen) {
    if (eq(a[aStart], suba[j])) {
      if (k < 0) k = aStart
      j++
      if (j > subaEnd) return k
    } else {
      k = -1
      j = subaStart
    }
    aStart++
  }
  return -1
}

function diffChildren (
  parent,
  children,
  oldChildren,
  newStart = 0,
  newEnd = children.length - 1,
  oldStart = 0,
  oldEnd = oldChildren.length - 1
) {
  if (children === oldChildren) return
  var oldCh

  /**
    1. Diff common prefix/suffix
    See https://neil.fraser.name/writing/diff/ for the full details.
  **/

  var k = diffCommonPrefix(
    children,
    oldChildren,
    newStart,
    newEnd,
    oldStart,
    oldEnd,
    canUpdate,
    parent
  )
  newStart += k
  oldStart += k

  k = diffCommonSuffix(
    children,
    oldChildren,
    newStart,
    newEnd,
    oldStart,
    oldEnd,
    canUpdate,
    parent
  )
  newEnd -= k
  oldEnd -= k

  if (newStart > newEnd && oldStart > oldEnd) {
    return
  }

  /**
    2. Simple IN/DELs
    One of the 2 sequences is empty after common prefix/suffix removal
  **/

  // old sequence is empty -> insertion
  if (newStart <= newEnd && oldStart > oldEnd) {
    oldCh = oldChildren[oldStart]
    appendChildren(parent, children, newStart, newEnd, oldCh)
    return
  }

  // new sequence is empty -> deletion
  if (oldStart <= oldEnd && newStart > newEnd) {
    removeChildren(parent, oldChildren, oldStart, oldEnd)
    return
  }

  // 2 simple indels: the shortest sequence is a subsequence of the longest
  var oldRem = oldEnd - oldStart + 1
  var newRem = newEnd - newStart + 1
  k = -1
  if (oldRem < newRem) {
    k = indexOf(
      children,
      oldChildren,
      newStart,
      newEnd,
      oldStart,
      oldEnd,
      canUpdate
    )
    if (k >= 0) {
      oldCh = oldChildren[oldStart]
      appendChildren(parent, children, newStart, k - 1, oldCh)
      var upperLimit = k + oldRem
      newStart = k
      while (newStart < upperLimit) {
        patch(children[newStart++], oldChildren[oldStart++])
      }
      oldCh = oldChildren[oldEnd]
      appendChildren(
        parent,
        children,
        newStart,
        newEnd,
        oldCh && oldCh.nextSibling
      )
      return
    }
  } else if (oldRem > newRem) {
    k = indexOf(
      oldChildren,
      children,
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      canUpdate
    )
    if (k >= 0) {
      removeChildren(parent, oldChildren, oldStart, k - 1)
      upperLimit = k + newRem
      oldStart = k
      while (oldStart < upperLimit) {
        patch(children[newStart++], oldChildren[oldStart++])
      }
      removeChildren(parent, oldChildren, oldStart, oldEnd)
      return
    }
  }

  // fast case: difference between the 2 sequences is only one item
  if (oldStart === oldEnd) {
    var node = oldChildren[oldStart]
    appendChildren(parent, children, newStart, newEnd, node)
    parent.removeChild(node)
    return
  }
  if (newStart === newEnd) {
    parent.insertBefore(children[newStart], oldChildren[oldStart])
    removeChildren(parent, oldChildren, oldStart, oldEnd)
    return
  }

  /*
    3. Subsequence that's at least half the longest sequence it's guaranteed to
       be the longest common subsequence. This allows us to find the lcs using a simple O(N) algorithm
  */

  var hm
  if (!hm) {
    var failed = diffOND(
      parent,
      children,
      oldChildren,
      newStart,
      newEnd,
      oldStart,
      oldEnd
    )
    if (failed) {
      diffWithMap(
        parent,
        children,
        oldChildren,
        newStart,
        newEnd,
        oldStart,
        oldEnd
      )
    }
  }
}

function diffOND (
  parent,
  children,
  oldChildren,
  newStart = 0,
  newEnd = children.length - 1,
  oldStart = 0,
  oldEnd = oldChildren.length - 1
) {
  var rows = newEnd - newStart + 1
  var cols = oldEnd - oldStart + 1
  var dmax = rows + cols

  var v = []
  var d, k, r, c, pv, cv, pd
  outer: for (d = 0; d <= dmax; d++) {
    if (d > 50) return true
    pd = d - 1
    pv = d ? v[d - 1] : [0, 0]
    cv = v[d] = []
    for (k = -d; k <= d; k += 2) {
      if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
        c = pv[pd + k + 1]
      } else {
        c = pv[pd + k - 1] + 1
      }
      r = c - k
      while (
        c < cols &&
        r < rows &&
        canUpdate(oldChildren[oldStart + c], children[newStart + r])
      ) {
        c++
        r++
      }
      if (c === cols && r === rows) {
        break outer
      }
      cv[d + k] = c
    }
  }

  var diff = Array(d / 2 + dmax / 2)
  var deleteMap = {}
  var oldCh
  var diffIdx = diff.length - 1
  for (d = v.length - 1; d >= 0; d--) {
    while (
      c > 0 &&
      r > 0 &&
      canUpdate(oldChildren[oldStart + c - 1], children[newStart + r - 1])
    ) {
      // diagonal edge = equality
      diff[diffIdx--] = PATCH
      c--
      r--
    }
    if (!d) break
    pd = d - 1
    pv = d ? v[d - 1] : [0, 0]
    k = c - r
    if (k === -d || (k !== d && pv[pd + k - 1] < pv[pd + k + 1])) {
      // vertical edge = insertion
      r--
      diff[diffIdx--] = INSERTION
    } else {
      // horizontal edge = deletion
      c--
      diff[diffIdx--] = DELETION
      oldCh = oldChildren[oldStart + c]
      if (oldCh.tagName != null) {
        deleteMap[oldCh.tagName] = oldStart + c
      }
    }
  }

  applyDiff(parent, diff, children, oldChildren, newStart, oldStart, deleteMap)
}

function applyDiff (
  parent,
  diff,
  children,
  oldChildren,
  newStart,
  oldStart,
  deleteMap
) {
  var ch
  var oldCh
  var node
  var oldMatchIdx
  var moveMap = {}
  for (var i = 0, chIdx = newStart, oldChIdx = oldStart; i < diff.length; i++) {
    const op = diff[i]
    if (op === PATCH) {
      patch(children[chIdx++], oldChildren[oldChIdx++], parent)
    } else if (op === INSERTION) {
      ch = children[chIdx++]
      oldMatchIdx = null
      if (ch.tagName) {
        oldMatchIdx = deleteMap[ch.tagName]
      }
      if (oldMatchIdx != null) {
        node = patch(ch, oldChildren[oldMatchIdx])
        moveMap[ch.tagName] = oldMatchIdx
      } else {
        node = ch
      }
      parent.insertBefore(
        node,
        oldChIdx < oldChildren.length ? oldChildren[oldChIdx] : null
      )
    } else if (op === DELETION) {
      oldChIdx++
    }
  }

  for (i = 0, oldChIdx = oldStart; i < diff.length; i++) {
    const op = diff[i]
    if (op === PATCH) {
      oldChIdx++
    } else if (op === DELETION) {
      oldCh = oldChildren[oldChIdx++]
      if (oldCh.tagName == null || moveMap[oldCh.tagName] == null) {
        parent.removeChild(oldCh)
      }
    }
  }
}

function diffWithMap (
  parent,
  children,
  oldChildren,
  newStart,
  newEnd,
  oldStart,
  oldEnd
) {
  var keymap = {}
  var unkeyed = []
  var idxUnkeyed = 0
  var ch
  var oldCh
  var k
  var idxInOld
  var key

  var newLen = newEnd - newStart + 1
  var oldLen = oldEnd - oldStart + 1
  var minLen = Math.min(newLen, oldLen)
  var tresh = Array(minLen + 1)
  tresh[0] = -1

  for (var i = 1; i < tresh.length; i++) {
    tresh[i] = oldEnd + 1
  }
  var link = Array(minLen)

  for (i = oldStart; i <= oldEnd; i++) {
    oldCh = oldChildren[i]
    key = oldCh.tagName
    if (key) {
      keymap[key] = i
    } else {
      unkeyed.push(i)
    }
  }

  for (i = newStart; i <= newEnd; i++) {
    ch = children[i]
    idxInOld = !ch.tagName ? unkeyed[idxUnkeyed++] : keymap[ch.tagName]
    if (idxInOld != null) {
      k = findK(tresh, idxInOld)
      if (k >= 0) {
        tresh[k] = idxInOld
        link[k] = { newi: i, oldi: idxInOld, prev: link[k - 1] }
      }
    }
  }

  k = tresh.length - 1
  while (tresh[k] > oldEnd) k--

  var ptr = link[k]
  var diff = Array(oldLen + newLen - k)
  var curNewi = newEnd
  var curOldi = oldEnd
  var d = diff.length - 1
  while (ptr) {
    const { newi, oldi } = ptr
    while (curNewi > newi) {
      diff[d--] = INSERTION
      curNewi--
    }
    while (curOldi > oldi) {
      diff[d--] = DELETION
      curOldi--
    }
    diff[d--] = PATCH
    curNewi--
    curOldi--
    ptr = ptr.prev
  }
  while (curNewi >= newStart) {
    diff[d--] = INSERTION
    curNewi--
  }
  while (curOldi >= oldStart) {
    diff[d--] = DELETION
    curOldi--
  }
  applyDiff(parent, diff, children, oldChildren, newStart, oldStart, keymap)
}

function findK (ktr, j) {
  var lo = 1
  var hi = ktr.length - 1
  while (lo <= hi) {
    var mid = Math.ceil((lo + hi) / 2)
    if (j < ktr[mid]) hi = mid - 1
    else lo = mid + 1
  }
  return lo
}

module.exports = patch

},{}],3:[function(require,module,exports){
var trailingNewlineRegex = /\n[\s]+$/
var leadingNewlineRegex = /^\n[\s]+/
var trailingSpaceRegex = /[\s]+$/
var leadingSpaceRegex = /^[\s]+/
var multiSpaceRegex = /[\n\s]+/g

var TEXT_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'data', 'dfn', 'em', 'i',
  'kbd', 'mark', 'q', 'rp', 'rt', 'rtc', 'ruby', 's', 'amp', 'small', 'span',
  'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
]

var CODE_TAGS = [
  'code', 'pre'
]

module.exports = function appendChild (el, childs) {
  if (!Array.isArray(childs)) return

  var nodeName = el.nodeName.toLowerCase()

  var hadText = false
  var value, leader

  for (var i = 0, len = childs.length; i < len; i++) {
    var node = childs[i]
    if (Array.isArray(node)) {
      appendChild(el, node)
      continue
    }

    if (typeof node === 'number' ||
      typeof node === 'boolean' ||
      typeof node === 'function' ||
      node instanceof Date ||
      node instanceof RegExp) {
      node = node.toString()
    }

    var lastChild = el.childNodes[el.childNodes.length - 1]

    // Iterate over text nodes
    if (typeof node === 'string') {
      hadText = true

      // If we already had text, append to the existing text
      if (lastChild && lastChild.nodeName === '#text') {
        lastChild.nodeValue += node

      // We didn't have a text node yet, create one
      } else {
        node = document.createTextNode(node)
        el.appendChild(node)
        lastChild = node
      }

      // If this is the last of the child nodes, make sure we close it out
      // right
      if (i === len - 1) {
        hadText = false
        // Trim the child text nodes if the current node isn't a
        // node where whitespace matters.
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          CODE_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        } else if (CODE_TAGS.indexOf(nodeName) === -1) {
          // The very first node in the list should not have leading
          // whitespace. Sibling text nodes should have whitespace if there
          // was any.
          leader = i === 0 ? '' : ' '
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, leader)
            .replace(leadingSpaceRegex, ' ')
            .replace(trailingSpaceRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

    // Iterate over DOM nodes
    } else if (node && node.nodeType) {
      // If the last node was a text node, make sure it is properly closed out
      if (hadText) {
        hadText = false

        // Trim the child text nodes if the current node isn't a
        // text node or a code node
        if (TEXT_TAGS.indexOf(nodeName) === -1 &&
          CODE_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')

          // Remove empty text nodes, append otherwise
          if (value === '') {
            el.removeChild(lastChild)
          } else {
            lastChild.nodeValue = value
          }
        // Trim the child nodes if the current node is not a node
        // where all whitespace must be preserved
        } else if (CODE_TAGS.indexOf(nodeName) === -1) {
          value = lastChild.nodeValue
            .replace(leadingSpaceRegex, ' ')
            .replace(leadingNewlineRegex, '')
            .replace(trailingNewlineRegex, '')
            .replace(multiSpaceRegex, ' ')
          lastChild.nodeValue = value
        }
      }

      // Store the last nodename
      var _nodeName = node.nodeName
      if (_nodeName) nodeName = _nodeName.toLowerCase()

      // Append the node to the DOM
      el.appendChild(node)
    }
  }
}

},{}],4:[function(require,module,exports){
var hyperx = require('hyperx')
var appendChild = require('./appendChild')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = [
  'autofocus', 'checked', 'defaultchecked', 'disabled', 'formnovalidate',
  'indeterminate', 'readonly', 'required', 'selected', 'willvalidate'
]

var COMMENT_TAG = '!--'

var SVG_TAGS = [
  'svg', 'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage',
  'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
  'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence', 'filter',
  'font', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src',
  'font-face-uri', 'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image',
  'line', 'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph',
  'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else {
    el = document.createElement(tag)
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS.indexOf(key) !== -1) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  appendChild(el, children)
  return el
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement

},{"./appendChild":3,"hyperx":6}],5:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],6:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12
var COMMENT = 13

module.exports = function (h, opts) {
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }
  if (opts.attrToProp !== false) {
    h = attrToProp(h)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            if (parts[i][0] === CLOSE) {
              i--
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state) && state !== COMMENT) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === COMMENT && /-$/.test(reg) && c === '-') {
          if (opts.comments) {
            res.push([ATTR_VALUE,reg.substr(0, reg.length - 1)],[CLOSE])
          }
          reg = ''
          state = TEXT
        } else if (state === OPEN && /^!--$/.test(reg)) {
          if (opts.comments) {
            res.push([OPEN, reg],[ATTR_KEY,'comment'],[ATTR_EQ])
          }
          reg = c
          state = COMMENT
        } else if (state === TEXT || state === COMMENT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[^\s"'=/]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr', '!--',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":5}],7:[function(require,module,exports){
assert.notEqual = notEqual
assert.notOk = notOk
assert.equal = equal
assert.ok = assert

module.exports = assert

function equal (a, b, m) {
  assert(a == b, m) // eslint-disable-line eqeqeq
}

function notEqual (a, b, m) {
  assert(a != b, m) // eslint-disable-line eqeqeq
}

function notOk (t, m) {
  assert(!t, m)
}

function assert (t, m) {
  if (!t) throw new Error(m || 'AssertionError')
}

},{}],8:[function(require,module,exports){
var assert = require('assert')
var morph = require('./lib/morph')

var TEXT_NODE = 3
// var DEBUG = false

module.exports = nanomorph

// Morph one tree into another tree
//
// no parent
//   -> same: diff and walk children
//   -> not same: replace and return
// old node doesn't exist
//   -> insert new node
// new node doesn't exist
//   -> delete old node
// nodes are not the same
//   -> diff nodes and apply patch to old node
// nodes are the same
//   -> walk all child nodes and append to old node
function nanomorph (oldTree, newTree) {
  // if (DEBUG) {
  //   console.log(
  //   'nanomorph\nold\n  %s\nnew\n  %s',
  //   oldTree && oldTree.outerHTML,
  //   newTree && newTree.outerHTML
  // )
  // }
  assert.equal(typeof oldTree, 'object', 'nanomorph: oldTree should be an object')
  assert.equal(typeof newTree, 'object', 'nanomorph: newTree should be an object')
  var tree = walk(newTree, oldTree)
  // if (DEBUG) console.log('=> morphed\n  %s', tree.outerHTML)
  return tree
}

// Walk and morph a dom tree
function walk (newNode, oldNode) {
  // if (DEBUG) {
  //   console.log(
  //   'walk\nold\n  %s\nnew\n  %s',
  //   oldNode && oldNode.outerHTML,
  //   newNode && newNode.outerHTML
  // )
  // }
  if (!oldNode) {
    return newNode
  } else if (!newNode) {
    return null
  } else if (newNode.isSameNode && newNode.isSameNode(oldNode)) {
    return oldNode
  } else if (newNode.tagName !== oldNode.tagName) {
    return newNode
  } else {
    morph(newNode, oldNode)
    updateChildren(newNode, oldNode)
    return oldNode
  }
}

// Update the children of elements
// (obj, obj) -> null
function updateChildren (newNode, oldNode) {
  // if (DEBUG) {
  //   console.log(
  //   'updateChildren\nold\n  %s\nnew\n  %s',
  //   oldNode && oldNode.outerHTML,
  //   newNode && newNode.outerHTML
  // )
  // }
  var oldChild, newChild, morphed, oldMatch

  // The offset is only ever increased, and used for [i - offset] in the loop
  var offset = 0

  for (var i = 0; ; i++) {
    oldChild = oldNode.childNodes[i]
    newChild = newNode.childNodes[i - offset]
    // if (DEBUG) {
    //   console.log(
    //   '===\n- old\n  %s\n- new\n  %s',
    //   oldChild && oldChild.outerHTML,
    //   newChild && newChild.outerHTML
    // )
    // }
    // Both nodes are empty, do nothing
    if (!oldChild && !newChild) {
      break

    // There is no new child, remove old
    } else if (!newChild) {
      oldNode.removeChild(oldChild)
      i--

    // There is no old child, add new
    } else if (!oldChild) {
      oldNode.appendChild(newChild)
      offset++

    // Both nodes are the same, morph
    } else if (same(newChild, oldChild)) {
      morphed = walk(newChild, oldChild)
      if (morphed !== oldChild) {
        oldNode.replaceChild(morphed, oldChild)
        offset++
      }

    // Both nodes do not share an ID or a placeholder, try reorder
    } else {
      oldMatch = null

      // Try and find a similar node somewhere in the tree
      for (var j = i; j < oldNode.childNodes.length; j++) {
        if (same(oldNode.childNodes[j], newChild)) {
          oldMatch = oldNode.childNodes[j]
          break
        }
      }

      // If there was a node with the same ID or placeholder in the old list
      if (oldMatch) {
        morphed = walk(newChild, oldMatch)
        if (morphed !== oldMatch) offset++
        oldNode.insertBefore(morphed, oldChild)

      // It's safe to morph two nodes in-place if neither has an ID
      } else if (!newChild.id && !oldChild.id) {
        morphed = walk(newChild, oldChild)
        if (morphed !== oldChild) {
          oldNode.replaceChild(morphed, oldChild)
          offset++
        }

      // Insert the node at the index if we couldn't morph or find a matching node
      } else {
        oldNode.insertBefore(newChild, oldChild)
        offset++
      }
    }
  }
}

function same (a, b) {
  if (a.id) return a.id === b.id
  if (a.isSameNode) return a.isSameNode(b)
  if (a.tagName !== b.tagName) return false
  if (a.type === TEXT_NODE) return a.nodeValue === b.nodeValue
  return false
}

},{"./lib/morph":10,"assert":7}],9:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'ontouchcancel',
  'ontouchend',
  'ontouchmove',
  'ontouchstart',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],10:[function(require,module,exports){
var events = require('./events')
var eventsLength = events.length

var ELEMENT_NODE = 1
var TEXT_NODE = 3
var COMMENT_NODE = 8

module.exports = morph

// diff elements and apply the resulting patch to the old node
// (obj, obj) -> null
function morph (newNode, oldNode) {
  var nodeType = newNode.nodeType
  var nodeName = newNode.nodeName

  if (nodeType === ELEMENT_NODE) {
    copyAttrs(newNode, oldNode)
  }

  if (nodeType === TEXT_NODE || nodeType === COMMENT_NODE) {
    if (oldNode.nodeValue !== newNode.nodeValue) {
      oldNode.nodeValue = newNode.nodeValue
    }
  }

  // Some DOM nodes are weird
  // https://github.com/patrick-steele-idem/morphdom/blob/master/src/specialElHandlers.js
  if (nodeName === 'INPUT') updateInput(newNode, oldNode)
  else if (nodeName === 'OPTION') updateOption(newNode, oldNode)
  else if (nodeName === 'TEXTAREA') updateTextarea(newNode, oldNode)

  copyEvents(newNode, oldNode)
}

function copyAttrs (newNode, oldNode) {
  var oldAttrs = oldNode.attributes
  var newAttrs = newNode.attributes
  var attrNamespaceURI = null
  var attrValue = null
  var fromValue = null
  var attrName = null
  var attr = null

  for (var i = newAttrs.length - 1; i >= 0; --i) {
    attr = newAttrs[i]
    attrName = attr.name
    attrNamespaceURI = attr.namespaceURI
    attrValue = attr.value
    if (attrNamespaceURI) {
      attrName = attr.localName || attrName
      fromValue = oldNode.getAttributeNS(attrNamespaceURI, attrName)
      if (fromValue !== attrValue) {
        oldNode.setAttributeNS(attrNamespaceURI, attrName, attrValue)
      }
    } else {
      if (!oldNode.hasAttribute(attrName)) {
        oldNode.setAttribute(attrName, attrValue)
      } else {
        fromValue = oldNode.getAttribute(attrName)
        if (fromValue !== attrValue) {
          // apparently values are always cast to strings, ah well
          if (attrValue === 'null' || attrValue === 'undefined') {
            oldNode.removeAttribute(attrName)
          } else {
            oldNode.setAttribute(attrName, attrValue)
          }
        }
      }
    }
  }

  // Remove any extra attributes found on the original DOM element that
  // weren't found on the target element.
  for (var j = oldAttrs.length - 1; j >= 0; --j) {
    attr = oldAttrs[j]
    if (attr.specified !== false) {
      attrName = attr.name
      attrNamespaceURI = attr.namespaceURI

      if (attrNamespaceURI) {
        attrName = attr.localName || attrName
        if (!newNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          oldNode.removeAttributeNS(attrNamespaceURI, attrName)
        }
      } else {
        if (!newNode.hasAttributeNS(null, attrName)) {
          oldNode.removeAttribute(attrName)
        }
      }
    }
  }
}

function copyEvents (newNode, oldNode) {
  for (var i = 0; i < eventsLength; i++) {
    var ev = events[i]
    if (newNode[ev]) {           // if new element has a whitelisted attribute
      oldNode[ev] = newNode[ev]  // update existing element
    } else if (oldNode[ev]) {    // if existing element has it and new one doesnt
      oldNode[ev] = undefined    // remove it from existing element
    }
  }
}

function updateOption (newNode, oldNode) {
  updateAttribute(newNode, oldNode, 'selected')
}

// The "value" attribute is special for the <input> element since it sets the
// initial value. Changing the "value" attribute without changing the "value"
// property will have no effect since it is only used to the set the initial
// value. Similar for the "checked" attribute, and "disabled".
function updateInput (newNode, oldNode) {
  var newValue = newNode.value
  var oldValue = oldNode.value

  updateAttribute(newNode, oldNode, 'checked')
  updateAttribute(newNode, oldNode, 'disabled')

  if (newValue !== oldValue) {
    oldNode.setAttribute('value', newValue)
    oldNode.value = newValue
  }

  if (newValue === 'null') {
    oldNode.value = ''
    oldNode.removeAttribute('value')
  }

  if (!newNode.hasAttributeNS(null, 'value')) {
    oldNode.removeAttribute('value')
  } else if (oldNode.type === 'range') {
    // this is so elements like slider move their UI thingy
    oldNode.value = newValue
  }
}

function updateTextarea (newNode, oldNode) {
  var newValue = newNode.value
  if (newValue !== oldNode.value) {
    oldNode.value = newValue
  }

  if (oldNode.firstChild && oldNode.firstChild.nodeValue !== newValue) {
    // Needed for IE. Apparently IE sets the placeholder as the
    // node value and vise versa. This ignores an empty update.
    if (newValue === '' && oldNode.firstChild.nodeValue === oldNode.placeholder) {
      return
    }

    oldNode.firstChild.nodeValue = newValue
  }
}

function updateAttribute (newNode, oldNode, name) {
  if (newNode[name] !== oldNode[name]) {
    oldNode[name] = newNode[name]
    if (newNode[name]) {
      oldNode.setAttribute(name, '')
    } else {
      oldNode.removeAttribute(name)
    }
  }
}

},{"./events":9}]},{},[1]);
