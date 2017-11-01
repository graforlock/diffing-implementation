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
      <h1>Random number: ${Math.random()}</h1>
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
