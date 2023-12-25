function createButtonWithExtractedURLNav(verseNumber, verseNumberText, scriptureCountNav, savedColorNav, scripturePathNav) {
  let verseButtonWidthNav = '25px';
  let countButtonWidthNav = '25px';

  if (verseNumberText.length === 1) {
    verseButtonWidthNav = '25px'; // 25
  } else if (verseNumberText.length === 2) {
    verseButtonWidthNav = '30px'; // 30
  } else if (verseNumberText.length >= 3) {
    verseButtonWidthNav = '35px'; // 35
  }

  if (scriptureCountNav.toString().length === 1) {
    countButtonWidthNav = '25px';
  } else if (scriptureCountNav.toString().length === 2) {
    countButtonWidthNav = '30px';
  } else if (scriptureCountNav.toString().length >= 3) {
    countButtonWidthNav = '35px';
  }

  chrome.storage.sync.get('useAllFootnotes', function (data) {
    const useAllFootnotes = data.useAllFootnotes;
    let scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/conference-quotes.json';
    if (useAllFootnotes) {
      scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/all-footnotes.json';
    }

    if (scriptureCountNav === 0) {
      const verseButtonNav = document.createElement('button');
      verseButtonNav.style.width = verseButtonWidthNav;
      verseButtonNav.style.height = '20px';
      verseButtonNav.style.border = 'none';
      verseButtonNav.style.fontSize = '12px';
      verseButtonNav.textContent = verseNumberText; // This is what goes on the button.
      verseButtonNav.style.background = savedColorNav || '#191970';
      verseButtonNav.style.color = 'white';
      verseButtonNav.style.borderRadius = '5px';
      verseButtonNav.style.display = 'inline-block';
      verseButtonNav.style.textAlign = 'center';
      verseButtonNav.style.lineHeight = '20px';

      verseButtonNav.addEventListener('click', async function () {
        const overlayNav = document.createElement('div');
        overlayNav.style.position = 'fixed';
        overlayNav.style.top = '0';
        overlayNav.style.left = '0';
        overlayNav.style.width = '100%';
        overlayNav.style.height = '100%';
        overlayNav.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlayNav.style.display = 'flex';
        overlayNav.style.alignItems = 'center';
        overlayNav.style.justifyContent = 'center';
        overlayNav.style.zIndex = '9999';

        const scriptureDetailsNav = document.createElement('div');
        scriptureDetailsNav.style.backgroundColor = savedColorNav || '#191970'; // Sets the background color of the element.
        scriptureDetailsNav.style.color = 'white';
        scriptureDetailsNav.style.padding = '20px';
        scriptureDetailsNav.style.borderRadius = '10px';
        scriptureDetailsNav.textContent = 'No entries found';

        const closeButtonNav = document.createElement('button');
        closeButtonNav.textContent = 'Close';
        closeButtonNav.addEventListener('click', function() {
          overlayNav.remove();
        });

        overlayNav.appendChild(scriptureDetailsNav);
        overlayNav.appendChild(closeButtonNav);

        document.body.appendChild(overlayNav);
      });

      // Remove any existing spaces after the verse number
      const existingSpaces = verseNumber.parentNode.querySelectorAll('span.verse-space');
      existingSpaces.forEach(space => space.remove());

      // Create a single space after the verse button
      const spaceNav = document.createElement('span');
      spaceNav.className = 'verse-space';
      spaceNav.innerHTML = '&nbsp&nbsp;';
      verseNumber.parentNode.insertBefore(spaceNav, verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(verseButtonNav, verseNumber.nextSibling);
      verseNumber.style.display = 'none';
    } else {
      const verseButtonNav = document.createElement('button');
      verseButtonNav.style.width = verseButtonWidthNav;
      verseButtonNav.style.height = '20px';
      verseButtonNav.style.border = 'none';
      verseButtonNav.style.fontSize = '12px';
      verseButtonNav.textContent = verseNumberText; // This is what goes on the button.
      verseButtonNav.style.background = savedColorNav || '#191970';
      verseButtonNav.style.color = 'white';
      verseButtonNav.style.borderTopLeftRadius = '5px';
      verseButtonNav.style.borderBottomLeftRadius = '5px';
      verseButtonNav.style.borderTopRightRadius = '0';
      verseButtonNav.style.borderBottomRightRadius = '0';
      verseButtonNav.style.display = 'flex';
      verseButtonNav.style.alignItems = 'center';
      verseButtonNav.style.justifyContent = 'center';
      verseButtonNav.style.padding = '0 5px';
      verseButtonNav.style.display = 'inline-block';
      verseButtonNav.style.verticalAlign = 'middle';

      const countButtonNav = document.createElement('button');
      countButtonNav.style.width = countButtonWidthNav;
      countButtonNav.style.height = '20px';
      countButtonNav.style.border = `1px solid ${savedColorNav || '#191970'}`;
      countButtonNav.style.fontSize = '12px';
      countButtonNav.textContent = `${scriptureCountNav}`; // This is what goes on the button.
      countButtonNav.style.background = 'white';
      countButtonNav.style.color = 'black';
      countButtonNav.style.borderTopLeftRadius = '0';
      countButtonNav.style.borderBottomLeftRadius = '0';
      countButtonNav.style.borderTopRightRadius = '5px';
      countButtonNav.style.borderBottomRightRadius = '5px';
      countButtonNav.style.display = 'flex';
      countButtonNav.style.alignItems = 'center';
      countButtonNav.style.justifyContent = 'center';
      countButtonNav.style.padding = '0 5px';
      countButtonNav.style.display = 'inline-block';
      countButtonNav.style.verticalAlign = 'middle';

      verseButtonNav.addEventListener('click', async function () {
        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlNav);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathNav);
        createTableOverlay(matchingEntries);
      });

      countButtonNav.addEventListener('click', async function () {
        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlNav);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathNav);
        createTableOverlay(matchingEntries);
      });

      // Remove any existing spaces after the verse number
      const existingSpaces = verseNumber.parentNode.querySelectorAll('span.verse-space');
      existingSpaces.forEach(space => space.remove());

      // Create a single space after the verse button
      const spaceNav = document.createElement('span');
      spaceNav.className = 'verse-space';
      spaceNav.innerHTML = '&nbsp&nbsp;';
      verseNumber.parentNode.insertBefore(spaceNav, verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(countButtonNav, verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(verseButtonNav, verseNumber.nextSibling);
      verseNumber.style.display = 'none';
    }
  });
}



  

// Maintain a record of created buttons for each section
const createdButtonsMapNav = new Map();

async function replaceverseNumbersWithButtonsNav(callback) {
  const articlesNav = document.querySelectorAll('article.has-max-width.classic-scripture[lang="eng"]');

  if (articlesNav.length > 0) {
    for (const article of articlesNav) {
      const verseNumbersNav = article.querySelectorAll('.verse .verse-number');
      // Clear existing buttons in this article
      const existingButtons = article.querySelectorAll('button');
      existingButtons.forEach(button => button.remove());

      const useAllFootnotes = await new Promise((resolve) => {
        chrome.storage.sync.get('useAllFootnotes', function (data) {
          resolve(data.useAllFootnotes);
        });
      });

      const promises = Array.from(verseNumbersNav).map(async (verseNumber) => {
        const dataURINav = article.getAttribute('data-uri');
        if (dataURINav) {
          const chapterIndexNav = dataURINav.lastIndexOf('/');
          const chapterNav = dataURINav.substring(chapterIndexNav + 1);
          const bookIndexNav = dataURINav.substring(0, chapterIndexNav).lastIndexOf('/');
          const bookAbbrNav = dataURINav.substring(bookIndexNav + 1, chapterIndexNav);

          const bookFullNameNav = bookDecoder[bookAbbrNav] || '';
          const verseNumberText = verseNumber.textContent.trim();
          const scripturePathNav = `${bookFullNameNav} ${chapterNav}:${verseNumberText}`;

          let scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/scriptures-quoted.json';
          if (useAllFootnotes) {
            scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/all-footnotes-lookup.json';
          }

          const scriptureQuotedDataNav = await fetchJSON(scriptureQuotedDataUrlNav);
          const matchingEntryNav = scriptureQuotedDataNav.find(entry => entry.scripture === scripturePathNav);
          const scriptureCountNav = matchingEntryNav ? matchingEntryNav.count : 0;

          // Get the user-saved color
          const savedColorNav = await new Promise((resolve) => {
            chrome.storage.sync.get('buttonColor', function (data) {
              resolve(data.buttonColor);
            });
          });

          // Call the function to create the button
          createButtonWithExtractedURLNav(verseNumber, verseNumberText, scriptureCountNav, savedColorNav, scripturePathNav);
        }
      });

      await Promise.all(promises);
    }
  }
  callback();
}


// Example usage:
replaceverseNumbersWithButtonsNav(() => {
  console.log('Replacement completed');
});

  // The code will now check every second if the verse ids have been set to display = none.
  
  // This variable is used to help disable to checking every second
  let isReplacingNav = false;
  let intervalIdNav = null;
  
  function displayisVisibleNav(isVisibleNav) {
    const isVisibleDivNav = document.createElement('div');
    isVisibleDivNav.textContent = `isVisibleNav: ${isVisibleNav}`;
    document.body.appendChild(isVisibleDivNav);
  }
  
  function checkingButtonsExistNav() {
    const verseNumbersNav = document.querySelectorAll('.crossRefPanel-pyz6M .verse .verse-number');
  
    // Check if any verse numbers are visible   
    const isVisibleNav = Array.from(verseNumbersNav).some(verseNumber => {
      return window.getComputedStyle(verseNumber).getPropertyValue('display') !== 'none';
    });
  
    // displayisVisibleNav(isVisibleNav);
  
    // If verse numbers are visible and not currently replacing, execute replaceverseNumbersNavWithButtons
    if (isVisibleNav && !isReplacingNav) {
      isReplacingNav = true;
  
      // Stop the interval
      clearInterval(intervalIdNav);
  
      replaceverseNumbersWithButtonsNav(() => {
        // Once replaceverseNumbersNavWithButtons completes, reset the flag and start the interval again after a delay
        isReplacingNav = false;
        setTimeout(() => {
          intervalIdNav = setInterval(checkingButtonsExistNav, 1000);
        }, 3000); // Wait for 3 seconds before restarting the interval
      });
    }
  }
  
  // Start the interval
  intervalIdNav = setInterval(checkingButtonsExistNav, 1000); // Checking every three seconds
  
  
  