/* global fieldProperties, setAnswer, getPluginParameter, getComputedStyle */

// Detect platform
var isWebCollect = (document.body.className.indexOf('web-collect') >= 0)
var isAndroid = (document.body.className.indexOf('android-collect') >= 0)
var isIOS = (document.body.className.indexOf('ios-collect') >= 0)

var fieldType = fieldProperties.FIELDTYPE

var labelContainer = document.querySelector('.label')

// Find the input element
var input = document.getElementById('text-field')

var formattedContainer = document.querySelector('#show_formatted')

var showFormatted = false
var charMax = false // Used on Android, where "textarea" max does not always work

var appearance = fieldProperties.APPEARANCE // Stores the appearance field property

var actualAppearance = '' // Stores the appearance based on what is allowed. For example, only text fields can use the "numbers" appearance. Currently only used for the "numbers" appearance, but assigning for all situations for now, in case needed later

// Text alignment for RTL like Arabic
var labelChildren = labelContainer.children
var textDir
if (labelChildren.length === 0) {
  textDir = getComputedStyle(labelContainer).direction
} else {
  textDir = getComputedStyle(labelChildren[0]).direction
}
if (textDir === 'rtl') {
  input.style.textAlign = 'right'
  input.dir = 'rtl'
}

// RESIZE TEXT BOX; method inspired by https://www.impressivewebs.com/textarea-auto-resize/
var hiddenDiv = document.querySelector('.hidden-text')
var hiddenText = hiddenDiv.querySelector('p')
hiddenDiv.style.width = input.offsetWidth + 'px' // Might be okay to delete
window.onload = resizeTextBox

if (fieldType === 'text') {
  // check for standard appearance options and apply them
  if (fieldProperties.APPEARANCE.indexOf('numbers_phone') !== -1) {
    actualAppearance = 'numbers_phone'
    setInputMode('tel')

    if (!fieldProperties.READONLY) {
      setInputFilter(input, function (value) {
        return /^[0-9\-+.#* ]*$/.test(value)
      })
    }
  } else if (appearance.indexOf('numbers_decimal') !== -1) {
    actualAppearance = 'numbers_decimal'
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
  } else if (appearance.indexOf('numbers') !== -1) {
    actualAppearance = 'numbers'
    setInputMode('numeric')
    if (!fieldProperties.READONLY) {
      setInputFilter(input, function (value) {
        if (isWebCollect) {
          return /^-?[0-9]*$/.test(value)
        } else {
          return /^[-.]?[0-9]*$/.test(value) // On many devices, the dot and minus sign share the same button. This is so the button can be pressed twice to get the minus sign
        }
      })
    }
  }
} else if (fieldType === 'integer') {
  charMax = 9
  input.maxLength = charMax
  setInputMode('numeric')
  if (!fieldProperties.READONLY) {
    setInputFilter(input, function (value) {
      if (isWebCollect) {
        return /^-?[0-9]*$/.test(value)
      } else {
        return /^[-.]?[0-9]*$/.test(value) // On many devices, the dot and minus sign share the same button. This is so the button can be pressed twice to get the minus sign
      }
    })
  }

  if (fieldProperties.APPEARANCE.indexOf('show_formatted') !== -1) {
    actualAppearance = 'show_formatted'
    showFormatted = true
  }
} else if (fieldType === 'decimal') {
  charMax = 15
  input.maxLength = charMax
  setInputMode('numeric')
  if (!fieldProperties.READONLY) {
    setInputFilter(input, function (value) {
      return /^-?\d*[.,]?\d*$/.test(value)
    })
  }

  if (fieldProperties.APPEARANCE.indexOf('show_formatted') !== -1) {
    actualAppearance = 'show_formatted'
    showFormatted = true
  }
}

if (showFormatted) { // Show formatted when field first opens
  formattedContainer.innerText = formatNumber(input.value)
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

  resizeTextBox()

  if (((fieldType === 'integer') || (actualAppearance === 'numbers')) && (inputValue.indexOf('.') !== -1)) { // On many devices, the dot and minus sign share the same button. This is so the button is not pressed twice to get the minus sign, meaning it remains a dot, then the dots are removed
    inputValue = inputValue.replaceAll('.', '')
  } else if (((fieldType === 'integer') || (fieldType === 'decimal')) && isNaN(inputValue)) { // If it should be a number, but it isn't
    inputValue = ''
  }

  setAnswer(inputValue)
  if (showFormatted) { // For "show_formatted" appearance
    formattedContainer.innerText = formatNumber(inputValue)
  }
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
  hiddenText.innerHTML = input.value.replaceAll('\n', '<br>' + String.fromCharCode('8203')) // The 8203 is a zero-width space, so that there is content on a blank line. This is so a blank line with nothing after it actually takes effect
  var newHeight = hiddenDiv.offsetHeight
  hiddenDiv.style.display = 'none'
  input.style.height = newHeight + 'px'
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

// Format the number with commas so easier to read, and display below the field input
function formatNumber (number) {
  if (isNaN(number) || (number === '')) { // If not a number, return nothing
    return ''
  }
  number = parseFloat(number) // Remove leading and ending 0s
  var formattedNumber = ''

  var negativeNum
  if (number < 0) { // Remove negative sign, will be re-added later
    negativeNum = true
    number = String(number).substr(1)
  } else {
    negativeNum = false
    number = String(number)
  }

  var isDecimal // If decimal, divides into two parts, before and after the decimal, which will be addressed separately.
  var decimalPart
  if (number.indexOf('.') === -1) {
    isDecimal = false
  } else {
    isDecimal = true
    var numParts = number.split('.')
    if (numParts.length !== 2) { // Has multiple decimal points, so return nothing for now
      return ''
    }
    number = numParts[0]
    decimalPart = numParts[1]
  }

  for (var n = number.length; n > 3; n -= 3) { // Formats the part before the decimal point
    formattedNumber = ',' + number.substr(n - 3, 3) + formattedNumber
  }
  formattedNumber = number.substr(0, n) + formattedNumber

  if (isDecimal) { // Formats part after decimal point
    formattedNumber += '.'
    var decLength = decimalPart.length
    formattedNumber += decimalPart.substr(0, 2)
    for (var n = 2; n < decLength; n += 3) {
      formattedNumber += ',' + decimalPart.substr(n, 3)
    }
  }
  if (negativeNum) { // Re-adds the negative sign
    formattedNumber = '-' + formattedNumber
  }
  return formattedNumber
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
