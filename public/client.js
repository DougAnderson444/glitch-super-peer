// client-side js
// run by the browser each time your view template is loaded

// by default, you've got jQuery,
// add other scripts at the bottom of index.html

$(function () {
  $.get('/pins', function (pins) {
    Object.entries(pins).map(([key, value]) => {
      if (value) { $('<li></li>').text(key + ': ' + (value ? value.text : '')).appendTo('ul#pins') }
    })
  })
})
