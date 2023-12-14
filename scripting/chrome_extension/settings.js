document.addEventListener('DOMContentLoaded', function() {
  const colorButtonsContainer = document.querySelector('.color-buttons');

  function reloadColorButtons(selectedColor) {
    const colors = [
      '#191970', '#7D3C98', '#229954', '#E74C3C', '#F39C12'
    ];

    colorButtonsContainer.innerHTML = '';

    colors.forEach(color => {
      const newButton = document.createElement('button');
      newButton.setAttribute('class', 'color-option');
      newButton.setAttribute('data-color', color);
      newButton.style.backgroundColor = color;

      if (color === selectedColor) {
        newButton.classList.add('selected');
      }

      colorButtonsContainer.appendChild(newButton);
    });
  }

  reloadColorButtons(localStorage.getItem('buttonColor'));

  colorButtonsContainer.addEventListener('click', function(event) {
    const target = event.target;
    if (target.classList.contains('color-option')) {
      const selectedColor = target.getAttribute('data-color');
      localStorage.setItem('buttonColor', selectedColor);
      chrome.storage.sync.set({ 'buttonColor': selectedColor }, function() {
        console.log('Color saved to sync storage: ' + selectedColor);
        // Refresh the active tab instead of the entire window
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          chrome.tabs.reload(tabs[0].id);
        });
      });
    }
  });
  
});