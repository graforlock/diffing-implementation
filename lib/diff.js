var PATCH = 2
var INSERTION = 4
var DELETION = 8

function Diff (opts) {
  this._canUpdate = opts.canUpdate
  this._append = opts.append
  this._remove = opts.remove
  this._patch = opts.patch
}

Diff.prototype.diffCommonPrefix = function (s1, s2, start1, end1, start2, end2, parent) {
  var k = 0
  var c1
  var c2
  while (
    start1 <= end1 &&
    start2 <= end2 &&
    this._canUpdate(c1 = s1[start1], c2 = s2[start2])
  ) {
    if (parent) this._patch(c1, c2, parent)
    start1++
    start2++
    k++
  }
  return k
}

Diff.prototype.diffCommonSuffix = function (s1, s2, start1, end1, start2, end2, parent) {
  var k = 0
  var c1
  var c2
  while (
    start1 <= end1 &&
    start2 <= end2 &&
    this._canUpdate(c1 = s1[end1], c2 = s2[end2])
  ) {
    if (parent) this._patch(c1, c2, parent)
    end1--
    end2--
    k++
  }
  return k
}

Diff.prototype.indexOf = function (a, suba, aStart, aEnd, subaStart, subaEnd, eq) {
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

Diff.prototype.diffChildren = function (
  parent,
  children,
  oldChildren
) {
  var newStart = 0
  var newEnd = children.length - 1
  var oldStart = 0
  var oldEnd = oldChildren.length - 1

  if (children === oldChildren) return
  var oldCh

  /**
    1. Diff common prefix/suffix
    See https://neil.fraser.name/writing/diff/ for the full details.
  **/

  var k = this.diffCommonPrefix(
    children,
    oldChildren,
    newStart,
    newEnd,
    oldStart,
    oldEnd,
    this._canUpdate,
    parent
  )
  newStart += k
  oldStart += k

  k = this.diffCommonSuffix(
    children,
    oldChildren,
    newStart,
    newEnd,
    oldStart,
    oldEnd,
    this._canUpdate,
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
    this._append(parent, children, newStart, newEnd, oldCh)
    return
  }

  // new sequence is empty -> deletion
  if (oldStart <= oldEnd && newStart > newEnd) {
    this._remove(parent, oldChildren, oldStart, oldEnd)
    return
  }

  // 2 simple indels: the shortest sequence is a subsequence of the longest
  var oldRem = oldEnd - oldStart + 1
  var newRem = newEnd - newStart + 1
  k = -1
  if (oldRem < newRem) {
    k = this.indexOf(
      children,
      oldChildren,
      newStart,
      newEnd,
      oldStart,
      oldEnd,
      this._canUpdate
    )
    if (k >= 0) {
      oldCh = oldChildren[oldStart]
      this._append(parent, children, newStart, k - 1, oldCh)
      var upperLimit = k + oldRem
      newStart = k
      while (newStart < upperLimit) {
        this._patch(children[newStart++], oldChildren[oldStart++])
      }
      oldCh = oldChildren[oldEnd]
      this._append(
        parent,
        children,
        newStart,
        newEnd,
        oldCh && oldCh.nextSibling
      )
      return
    }
  } else if (oldRem > newRem) {
    k = this.indexOf(
      oldChildren,
      children,
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      this._canUpdate
    )
    if (k >= 0) {
      this._remove(parent, oldChildren, oldStart, k - 1)
      upperLimit = k + newRem
      oldStart = k
      while (oldStart < upperLimit) {
        this._patch(children[newStart++], oldChildren[oldStart++])
      }
      this._remove(parent, oldChildren, oldStart, oldEnd)
      return
    }
  }

  // fast case: difference between the 2 sequences is only one item
  if (oldStart === oldEnd) {
    var node = oldChildren[oldStart]
    this._append(parent, children, newStart, newEnd, node)
    parent.removeChild(node)
    return
  }
  if (newStart === newEnd) {
    parent.insertBefore(children[newStart], oldChildren[oldStart])
    this._remove(parent, oldChildren, oldStart, oldEnd)
    return
  }

  /*
    3. Subsequence that's at least half the longest sequence it's guaranteed to
       be the longest common subsequence. This allows us to find the lcs using a simple O(N) algorithm
  */

  var hm
  if (!hm) {
    var failed = this.diffOND(
      parent,
      children,
      oldChildren,
      newStart,
      newEnd,
      oldStart,
      oldEnd
    )
    if (failed) {
      this.diffWithMap(
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

Diff.prototype.diffOND = function (
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
        this._canUpdate(oldChildren[oldStart + c], children[newStart + r])
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
      this._canUpdate(oldChildren[oldStart + c - 1], children[newStart + r - 1])
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

  this.applyDiff(parent, diff, children, oldChildren, newStart, oldStart, deleteMap)
}

Diff.prototype.applyDiff = function (
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
      this._patch(children[chIdx++], oldChildren[oldChIdx++], parent)
    } else if (op === INSERTION) {
      ch = children[chIdx++]
      oldMatchIdx = null
      if (ch.tagName) {
        oldMatchIdx = deleteMap[ch.tagName]
      }
      if (oldMatchIdx != null) {
        node = this._patch(ch, oldChildren[oldMatchIdx])
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

Diff.prototype.diffWithMap = function (
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
      k = this.findK(tresh, idxInOld)
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
  this.applyDiff(parent, diff, children, oldChildren, newStart, oldStart, keymap)
}

Diff.prototype.findK = function (ktr, j) {
  var lo = 1
  var hi = ktr.length - 1
  while (lo <= hi) {
    var mid = Math.ceil((lo + hi) / 2)
    if (j < ktr[mid]) hi = mid - 1
    else lo = mid + 1
  }
  return lo
}

module.exports = Diff
