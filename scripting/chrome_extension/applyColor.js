// Retrieve the color picker element
const colorPicker = document.getElementById('colorPicker');

// Retrieve the Apply Color button
const applyButton = document.getElementById('applyColor');

// Retrieve the example button
const exampleButton = document.querySelector('.example-button');

// Apply the selected color from the color picker to the example button and save it to localStorage and chrome.storage.sync
applyButton.addEventListener('click', function() {
  const selectedColor = colorPicker.value;
  exampleButton.style.background = selectedColor;
  
  // Save color to localStorage
  localStorage.setItem('buttonColor', selectedColor);

  // Save color to chrome.storage.sync
  chrome.storage.sync.set({ 'buttonColor': selectedColor }, function() {
    console.log('Color saved to sync storage: ' + selectedColor);
  });
});
