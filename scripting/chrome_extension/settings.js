document.addEventListener('DOMContentLoaded', function() {
  const colorPicker = document.getElementById('colorPicker');
  const saveButton = document.getElementById('saveColor');

  // Load the currently saved color, if any
  chrome.storage.sync.get('buttonColor', function(data) {
    const savedColor = data.buttonColor;
    if (savedColor) {
      colorPicker.value = savedColor;
    }
  });

  // Save the selected color to storage
  saveButton.addEventListener('click', function() {
    const selectedColor = colorPicker.value;
    chrome.storage.sync.set({ 'buttonColor': selectedColor }, function() {
      console.log('Color saved: ' + selectedColor);
    });
  });
});
