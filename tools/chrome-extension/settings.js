document.addEventListener('DOMContentLoaded', function() {
  const colorButtonsContainer = document.querySelector('.color-buttons');
  const header = document.querySelector('.header');
  const headerImage = document.querySelector('.header img');

  // Function to apply the selected color to the header and image borders
  function applyUserColor(color) {
    header.style.background = `linear-gradient(to bottom, ${color} 50%, transparent 50%)`;
    headerImage.style.borderColor = color;
  }

  function reloadColorButtons(selectedColor) {
    const colors = [
      '#E74C3C', '#F39C12', '#229954', '#191970', '#7D3C98'
    ];

    colorButtonsContainer.innerHTML = '';

    colors.forEach(color => {
      const newButton = document.createElement('button');
      newButton.setAttribute('class', 'color-option');
      newButton.setAttribute('data-color', color);
      newButton.style.backgroundColor = color;

      if (color === selectedColor) {
        newButton.classList.add('selected');
        newButton.style.border = '3px solid #000'; // Apply outline to the selected color
      }

      colorButtonsContainer.appendChild(newButton);
    });
  }

  // Load button color from chrome.storage.sync
  chrome.storage.sync.get('buttonColor', function(data) {
    const userSelectedColor = data.buttonColor;
    reloadColorButtons(userSelectedColor);

    // Apply the user-selected color if available
    if (userSelectedColor) {
      applyUserColor(userSelectedColor);
    }
  });

  colorButtonsContainer.addEventListener('click', function(event) {
    const target = event.target;
    if (target.classList.contains('color-option')) {
      const selectedColor = target.getAttribute('data-color');
      chrome.storage.sync.set({ 'buttonColor': selectedColor }, function() {
        console.log('Color saved to sync storage: ' + selectedColor);
      });

      // Apply the selected color to the header and image borders
      applyUserColor(selectedColor);

      // Update the buttons' outline based on the selection
      const buttons = colorButtonsContainer.querySelectorAll('.color-option');
      buttons.forEach(button => {
        button.classList.remove('selected');
        button.style.border = 'none';
        if (button.getAttribute('data-color') === selectedColor) {
          button.classList.add('selected');
          button.style.border = '3px solid #000';
        }
      });

      // Refresh the active tab if the URL starts with "https://www.churchofjesuschrist.org/"
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.startsWith('https://www.churchofjesuschrist.org/')) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
  });

  const apostleOnlyToggle = document.getElementById('apostleOnlyToggle');

  apostleOnlyToggle.addEventListener('change', function() {
    const apostleOnly = apostleOnlyToggle.checked;
    localStorage.setItem('apostleOnly', apostleOnly);

    chrome.storage.sync.set({ 'apostleOnly': apostleOnly }, function() {
      console.log('Apostle Only setting saved to sync storage: ' + apostleOnly);
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        if (tab && tab.url && tab.url.startsWith('https://www.churchofjesuschrist.org/')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });

  // Initialize the slider state based on stored value
  chrome.storage.sync.get('apostleOnly', function(data) {
    const storedApostleOnly = data.apostleOnly;
    apostleOnlyToggle.checked = storedApostleOnly === true;
  });

});