document.addEventListener('DOMContentLoaded', function() {
  const colorButtonsContainer = document.querySelector('.color-buttons');
  const header = document.querySelector('.header');
  const headerImage = document.querySelector('.header img');

  // Function to apply the selected color to the header
  function applyUserColor(color) {
    const header = document.querySelector('.header');
    const headerImage = document.querySelector('.header img');

    // Apply color directly as inline styles
    header.style.background = `linear-gradient(to bottom, ${color} 50%, transparent 50%)`;
    headerImage.style.borderColor = color;
    headerImage.setAttribute('style', `border-color: ${color}; width: 100px; height: 100px; border-radius: 50%;`);
  }

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
        // Refresh the active tab instead of the entire window
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          chrome.tabs.reload(tabs[0].id);
        });
      });

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
    }
  });

  // Turn on All Footnotes slider functionality
  const footnotesToggle = document.getElementById('footnotesToggle');

  footnotesToggle.addEventListener('change', function() {
    const useAllFootnotes = footnotesToggle.checked;
    localStorage.setItem('useAllFootnotes', useAllFootnotes);

    chrome.storage.sync.set({ 'useAllFootnotes': useAllFootnotes }, function() {
      console.log('Use All Footnotes saved to sync storage: ' + useAllFootnotes);
      // Refresh the active tab instead of the entire window
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });

  // Initialize the slider state based on stored value
  chrome.storage.sync.get('useAllFootnotes', function(data) {
    const storedUseAllFootnotes = data.useAllFootnotes;
    footnotesToggle.checked = storedUseAllFootnotes === true;
  });
});