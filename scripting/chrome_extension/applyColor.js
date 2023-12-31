document.addEventListener('DOMContentLoaded', function() {
  // Retrieve the color picker element
  const colorPicker = document.getElementById('colorPicker');

  // Retrieve the Apply Color button
  const applyButton = document.getElementById('applyColor');

  // Retrieve the example button
  const exampleButton = document.querySelector('.example-button');

  // Function to apply the selected color to the header and image borders
  function applyUserColor(color) {
    const header = document.querySelector('.header');
    const headerImage = document.querySelector('.header img');
    header.style.background = `linear-gradient(to bottom, ${color} 50%, transparent 50%)`;
    headerImage.style.borderColor = color;
  }

  // Apply the selected color from the color picker to the example button and save it to localStorage and chrome.storage.sync
  applyButton.addEventListener('click', function() {
    const selectedColor = colorPicker.value;
    exampleButton.style.background = selectedColor;
    
    // Apply the selected color to the header and image borders
    applyUserColor(selectedColor);
    
    // Save color to localStorage
    localStorage.setItem('buttonColor', selectedColor);

    // Save color to chrome.storage.sync
    chrome.storage.sync.set({ 'buttonColor': selectedColor }, function() {
      console.log('Color saved to sync storage: ' + selectedColor);
    });
  });

  // Load the user-selected color from chrome.storage.sync and apply it to the example button when the page loads
  chrome.storage.sync.get('buttonColor', function(data) {
    const userSelectedColor = data.buttonColor;
    if (userSelectedColor) {
      exampleButton.style.background = userSelectedColor;
      applyUserColor(userSelectedColor);
    }
  });
});
