var Diff = require('./diff')

var XLINK_NS = 'http://www.w3.org/1999/xlink'
var NS_ATTRS = {
  show: XLINK_NS,
  actuate: XLINK_NS,
  href: XLINK_NS
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
        setAttributes(newch, oldch)
        patchChildren(childNode, newch.childNodes, oldch.childNodes, this._diff)
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

function patchChildren (parent, newChildren, oldChildren, diff) {
  if (newChildren.length === 1 && oldChildren.length === 1 &&
    isText(newChildren[0]) && isText(oldChildren[0])) {
    if (newChildren[0].nodeValue !== oldChildren[0].nodeValue) {
      patch(newChildren[0], oldChildren[0], parent)
    }
  } else if ((newChildren.length === 1 && isText(newChildren[0])) ||
    (oldChildren.length === 1 && isText(oldChildren[0]))) {
    replaceChildren(parent, newChildren, oldChildren)
  } else if (newChildren.length && oldChildren.length) {
    diff.diffChildren(
      parent,
      newChildren,
      oldChildren
    )
  } else {
    replaceChildren(parent, newChildren, oldChildren)
  }
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
    return a.tagName === b.tagName
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

function Update () {
  if (!(this instanceof Update)) return new Update()

  this._patch = patch.bind(this)
  this._diff = new Diff({
    canUpdate: canUpdate,
    append: appendChildren,
    remove: removeChildren,
    patch: this._patch
  })

  return this._patch
}

module.exports = Update
