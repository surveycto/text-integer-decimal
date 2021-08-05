/* global fieldProperties, setAnswer, getPluginParameter, getComputedStyle */

// Detect platform
var isWebCollect = (document.body.className.indexOf('web-collect') >= 0)
var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var isIOS = (document.body.className.indexOf('ios-collect') >= 0)

var labelContainer = document.querySelector('.label')

// Find the input element
var input = document.getElementById('text-field')

var countContainer = document.querySelector('#char-count')
var remainContainer = document.querySelector('#char-remaining')

var numRows = getPluginParameter('rows')
var countChar = getPluginParameter('count')
var charMax = getPluginParameter('max')
var expand = getPluginParameter('expand')

if (expand === 1) {
  expand = true
} else {
  expand = false
}

if ((numRows == null) || (isNaN(numRows))) {
  if (expand) {
    numRows = 0
  } else {
    numRows = 3
  }
} else {
  numRows = parseInt(numRows)
  if (numRows <= 0) {
    if (expand) {
      numRows = 3
    }
  }
  if (expand) {
    numRows = (numRows + 1.75) * 16 // Change this based on font size
  }
}
if (!expand) {
  input.rows = numRows
}

if ((charMax == null) || (isNaN(charMax))) {
  charMax = false
} else {
  charMax = parseInt(charMax)
  input.maxLength = charMax
}

// Character counter display
if ((countChar === 1) || ((charMax !== false) && (countChar !== 0))) {
  countChar = true
  countContainer.style.display = ''
  var currentLength = input.value.length
  if (charMax === false) {
    remainContainer.innerHTML = currentLength
  } else {
    remainContainer.innerHTML = charMax - currentLength
  }
} else {
  countChar = false
}

var labelChildren = labelContainer.children
var textDir
if (labelChildren.length === 0) {
  textDir = getComputedStyle(labelContainer).direction
} else {
  textDir = getComputedStyle(labelChildren[0]).direction
}

if (textDir === 'rtl') {
  countContainer.style.textAlign = 'left'
  input.style.textAlign = 'right'
  input.dir = 'rtl'
}

// RESIZE TEXT BOX; method inspired by https://www.impressivewebs.com/textarea-auto-resize/

if (expand) {
  var hiddenDiv = document.querySelector('.hidden-text')
  var hiddenText = hiddenDiv.querySelector('p')

  hiddenDiv.style.width = input.offsetWidth + 'px'

  input.addEventListener('input', resizeTextBox)
  window.onload = resizeTextBox
}

// For older devices
String.prototype.replaceAll = function (find, replace) {
  var newString = this
  while (newString.indexOf(find) !== -1) {
    newString = newString.replace(find, replace)
  }
  return newString
}

function resizeTextBox () {
  hiddenDiv.style.display = 'block'
  hiddenDiv.style.width = input.offsetWidth + 'px' // In case the window is reshaped
  hiddenText.innerHTML = input.value.replaceAll('\n', '<br>&8203;') // The &8203; is a zero-width space, so that there is content on a blank line. This is so a blank line with nothing after it actually takes effect
  var newHeight = hiddenDiv.offsetHeight
  hiddenDiv.style.display = 'none'
  if ((numRows === 0) || (numRows > newHeight)) {
    input.style.height = newHeight + 'px'
  } else {
    input.style.height = numRows + 'px'
  }
}

// Restricts input for the given textbox to the given inputFilter.
function setInputFilter (textbox, inputFilter) {
  function restrictInput () {
    if (inputFilter(this.value)) {
      this.oldSelectionStart = this.selectionStart
      this.oldSelectionEnd = this.selectionEnd
      this.oldValue = this.value
    } else if (this.hasOwnProperty('oldValue')) {
      this.value = this.oldValue
      this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
    } else {
      this.value = ''
    }
  }

  // Apply restriction when typing, copying/pasting, dragging-and-dropping, etc.
  textbox.addEventListener('input', restrictInput)
  textbox.addEventListener('keydown', restrictInput)
  textbox.addEventListener('keyup', restrictInput)
  textbox.addEventListener('mousedown', restrictInput)
  textbox.addEventListener('mousedown', restrictInput)
  textbox.addEventListener('contextmenu', restrictInput)
  textbox.addEventListener('drop', restrictInput)
}

// Set/remove the 'inputmode'.
function setInputMode (attributeValue) {
  if (attributeValue === null) {
    input.removeAttribute('inputmode')
  } else {
    input.setAttribute('inputmode', attributeValue)
  }
}

// If the field label or hint contain any HTML that isn't in the form definition, then the < and > characters will have been replaced by their HTML character entities, and the HTML won't render. We need to turn those HTML entities back to actual < and > characters so that the HTML renders properly. This will allow you to render HTML from field references in your field label or hint.
function unEntity (str) {
  return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
if (fieldProperties.LABEL) {
  labelContainer.innerHTML = unEntity(fieldProperties.LABEL)
}
if (fieldProperties.HINT) {
  document.querySelector('.hint').innerHTML = unEntity(fieldProperties.HINT)
}

// Define what happens when the user attempts to clear the response
function clearAnswer () {
  input.innerHTML = ''
  input.value = ''
}

// If the field is not marked readonly, then focus on the field and show the on-screen keyboard (for mobile devices)
function setFocus () {
  if (!fieldProperties.READONLY) {
    input.focus()
    if (window.showSoftKeyboard) {
      window.showSoftKeyboard()
    }
  }
}

// Save the user's response (update the current answer)
input.oninput = function () {
  var inputValue = input.value

  // Limiter for Android devices, in case too long
  if (isAndroid && (charMax !== false) && (inputValue.length > charMax)) {
    inputValue = inputValue.substr(0, charMax)
    input.value = inputValue
    input.innerHTML = inputValue
  }

  // Display character count
  if (countChar) {
    var inputLength = inputValue.length
    remainContainer.innerHTML = inputLength
    if (charMax !== false) {
      remainContainer.innerHTML = charMax - inputLength
    }
  }

  setAnswer(inputValue)
}

// check for standard appearance options and apply them
if (fieldProperties.APPEARANCE.indexOf('numbers_phone') !== -1) {
  setInputMode('tel')

  if (!fieldProperties.READONLY) {
    setInputFilter(input, function (value) {
      return /^[0-9\-+.#* ]*$/.test(value)
    })
  }
} else if (fieldProperties.APPEARANCE.indexOf('numbers_decimal') !== -1) {
  setInputMode('numeric')

  // For iOS, we'll default the inputmode to 'numeric' (as defined above), unless some specific value is
  // passed as plug-in parameter.
  if (isIOS) {
    var inputModeIOS = getPluginParameter('inputmode-ios')
    if (inputModeIOS !== undefined) {
      setInputMode(inputModeIOS)
    }
  } else if (isAndroid) {
    // For Android, we'll default the inputmode to 'numeric' (as defined above),
    // unless some specific value is passed as plug-in parameter.
    var inputModeAndroid = getPluginParameter('inputmode-android')
    if (inputModeAndroid !== undefined) {
      setInputMode(inputModeAndroid)
    }
  } else if (isWebCollect) {
    // For WebCollect, we'll default the inputmode to 'numeric' (as defined above),
    // unless some specific value is passed as plug-in parameter.
    var inputModeWebCollect = getPluginParameter('inputmode-web')
    if (inputModeWebCollect !== undefined) {
      setInputMode(inputModeWebCollect)
    }
  }

  // If the field is not marked as readonly, then restrict input to decimal only.
  if (!fieldProperties.READONLY) {
    setInputFilter(input, function (value) {
      return /^-?\d*[.,]?\d*$/.test(value)
    })
  }
} else if (fieldProperties.APPEARANCE.indexOf('numbers') !== -1) {
  setInputMode('numeric')
  if (!fieldProperties.READONLY) {
    setInputFilter(input, function (value) {
      return /^-?[0-9]*$/.test(value)
    })
  }
}
