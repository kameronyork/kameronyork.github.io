function createButtonWithExtractedURL(verseNumber, verseNumberText, scriptureCountSB, savedColorSB, scripturePathSB) {
  let verseButtonWidthSB = '25px';
  let countButtonWidthSB = '25px';

  if (verseNumberText.length === 1) {
    verseButtonWidthSB = '25px'; // 25
  } else if (verseNumberText.length === 2) {
    verseButtonWidthSB = '30px'; // 30
  } else if (verseNumberText.length >= 3) {
    verseButtonWidthSB = '35px'; // 35
  }

  if (scriptureCountSB.toString().length === 1) {
    countButtonWidthSB = '25px';
  } else if (scriptureCountSB.toString().length === 2) {
    countButtonWidthSB = '30px';
  } else if (scriptureCountSB.toString().length >= 3) {
    countButtonWidthSB = '35px';
  }

  chrome.storage.sync.get('useAllFootnotes', function (data) {
    const useAllFootnotes = data.useAllFootnotes;
    let scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/all-footnotes.json';
    if (useAllFootnotes) {
      scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/conference-quotes.json';
    }

    if (scriptureCountSB === 0) {
      const verseButtonSB = document.createElement('button');
      verseButtonSB.style.width = verseButtonWidthSB;
      verseButtonSB.style.height = '20px';
      verseButtonSB.style.border = 'none';
      verseButtonSB.style.fontSize = '12px';
      verseButtonSB.textContent = verseNumberText; // This is what goes on the button.
      verseButtonSB.style.background = savedColorSB || '#191970';
      verseButtonSB.style.color = 'white';
      verseButtonSB.style.borderRadius = '5px';
      verseButtonSB.style.display = 'inline-block';
      verseButtonSB.style.textAlign = 'center';
      verseButtonSB.style.lineHeight = '20px';

      verseButtonSB.addEventListener('click', async function () {
        const overlaySB = document.createElement('div');
        overlaySB.style.position = 'fixed';
        overlaySB.style.top = '0';
        overlaySB.style.left = '0';
        overlaySB.style.width = '100%';
        overlaySB.style.height = '100%';
        overlaySB.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlaySB.style.display = 'flex';
        overlaySB.style.alignItems = 'center';
        overlaySB.style.justifyContent = 'center';
        overlaySB.style.zIndex = '9999';

        const scriptureDetailsSB = document.createElement('div');
        scriptureDetailsSB.style.backgroundColor = savedColorSB || '#191970'; // Sets the background color of the element.
        scriptureDetailsSB.style.color = 'white';
        scriptureDetailsSB.style.padding = '20px';
        scriptureDetailsSB.style.borderRadius = '10px';
        scriptureDetailsSB.textContent = 'No entries found';

        const closeButtonSB = document.createElement('button');
        closeButtonSB.textContent = 'Close';
        closeButtonSB.addEventListener('click', function () {
          overlaySB.remove();
        });

        overlaySB.appendChild(scriptureDetailsSB);
        overlaySB.appendChild(closeButtonSB);

        document.body.appendChild(overlaySB);
      });

      const spaceSB = createSpace();
      verseNumber.parentNode.insertBefore(spaceSB.cloneNode(true), verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(verseButtonSB, verseNumber.nextSibling);
      verseNumber.style.display = 'none';
    } else {
      const verseButtonSB = document.createElement('button');
      verseButtonSB.style.width = verseButtonWidthSB;
      verseButtonSB.style.height = '20px';
      verseButtonSB.style.border = 'none';
      verseButtonSB.style.fontSize = '12px';
      verseButtonSB.textContent = verseNumberText; // This is what goes on the button.
      verseButtonSB.style.background = savedColorSB || '#191970';
      verseButtonSB.style.color = 'white';
      verseButtonSB.style.borderTopLeftRadius = '5px';
      verseButtonSB.style.borderBottomLeftRadius = '5px';
      verseButtonSB.style.borderTopRightRadius = '0';
      verseButtonSB.style.borderBottomRightRadius = '0';
      verseButtonSB.style.display = 'flex';
      verseButtonSB.style.alignItems = 'center';
      verseButtonSB.style.justifyContent = 'center';
      verseButtonSB.style.padding = '0 5px';
      verseButtonSB.style.display = 'inline-block';
      verseButtonSB.style.verticalAlign = 'middle';

      const countButtonSB = document.createElement('button');
      countButtonSB.style.width = countButtonWidthSB;
      countButtonSB.style.height = '20px';
      countButtonSB.style.border = `1px solid ${savedColorSB || '#191970'}`;
      countButtonSB.style.fontSize = '12px';
      countButtonSB.textContent = `${scriptureCountSB}`; // This is what goes on the button.
      countButtonSB.style.background = 'white';
      countButtonSB.style.color = 'black';
      countButtonSB.style.borderTopLeftRadius = '0';
      countButtonSB.style.borderBottomLeftRadius = '0';
      countButtonSB.style.borderTopRightRadius = '5px';
      countButtonSB.style.borderBottomRightRadius = '5px';
      countButtonSB.style.display = 'flex';
      countButtonSB.style.alignItems = 'center';
      countButtonSB.style.justifyContent = 'center';
      countButtonSB.style.padding = '0 5px';
      countButtonSB.style.display = 'inline-block';
      countButtonSB.style.verticalAlign = 'middle';

      verseButtonSB.addEventListener('click', async function () {
        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlSB);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathSB);
        createTableOverlay(matchingEntries);
      });

      countButtonSB.addEventListener('click', async function () {
        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlSB);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathSB);
        createTableOverlay(matchingEntries);
      });

      const spaceSB = createSpace();
      verseNumber.parentNode.insertBefore(spaceSB.cloneNode(true), verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(countButtonSB, verseNumber.nextSibling);
      verseNumber.parentNode.insertBefore(verseButtonSB, verseNumber.nextSibling);
      verseNumber.style.display = 'none';
    }
  });
}

  
  
  // Maintain a record of created buttons for each section
  const createdButtonsMap = new Map();
  
  async function replaceverseNumbersWithButtonsSideBar(callback) {
    const sections = document.querySelectorAll('section.reference-UoeCG');
  
    if (sections.length > 0) {
      for (const section of sections) {
        const firstLink = section.querySelector('a[href]');
        if (firstLink) {
          const langIndex = firstLink.href.indexOf('lang=eng');
  
          if (langIndex > -1) {
            // Check if buttons have been created for this section
            if (!createdButtonsMap.has(section)) {
              createdButtonsMap.set(section, new Set()); // Initialize a Set to track buttons for this section
            }
  
            const verseNumbersSB = section.querySelectorAll('.reference-UoeCG .verse .verse-number');
            const useAllFootnotes = await new Promise((resolve) => {
              chrome.storage.sync.get('useAllFootnotes', function (data) {
                resolve(data.useAllFootnotes);
              });
            });
  
            const promises = Array.from(verseNumbersSB).map(async (verseNumber) => {
              const createdButtons = createdButtonsMap.get(section);
  
              // Check if a button already exists for this verseNumber in this section
              if (!createdButtons.has(verseNumber)) {
                const chapterIndexSB = firstLink.href.lastIndexOf('/', langIndex - 1);
                const bookIndexSB = firstLink.href.lastIndexOf('/', chapterIndexSB - 1);
  
                let chapterSB = firstLink.href.substring(chapterIndexSB + 1, langIndex);
                if (chapterSB.includes('?')) {
                  chapterSB = chapterSB.split('?')[0];
                }
  
                const bookAbbrSB = firstLink.href.substring(bookIndexSB + 1, chapterIndexSB);
  
                const extractedURL = firstLink.getAttribute('href');
                const bookFullNameSB = bookDecoder[bookAbbrSB] || '';
                const verseNumberText = verseNumber.textContent.trim();
                const scripturePathSB = `${bookFullNameSB} ${chapterSB}:${verseNumberText}`;
  
                let scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/all-footnotes-lookup.json';
                if (useAllFootnotes) {
                  scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/scriptures-quoted.json';
                }
  
                const scriptureQuotedDataSB = await fetchJSON(scriptureQuotedDataUrlSB);
                const matchingEntrySB = scriptureQuotedDataSB.find(entry => entry.scripture === scripturePathSB);
                const scriptureCountSB = matchingEntrySB ? matchingEntrySB.count : 0;
  
                // Get the user-saved color
                const savedColorSB = await new Promise((resolve) => {
                  chrome.storage.sync.get('buttonColor', function (data) {
                    resolve(data.buttonColor);
                  });
                });
  
                // Call the function to create the button
                createButtonWithExtractedURL(verseNumber, verseNumberText, scriptureCountSB, savedColorSB, scripturePathSB);
  
                // After creating the button, add the verseNumber to the set for this section
                createdButtons.add(verseNumber);
              }
            });
  
            await Promise.all(promises);
          }
        }
      }
    }
    callback();
  }
  
  
  // Example usage:
  replaceverseNumbersWithButtonsSideBar(() => {
    console.log('Replacement completed');
  });
  
    // The code will now check every second if the verse ids have been set to display = none.
    
    // This variable is used to help disable to checking every second
    let isReplacingSB = false;
    let intervalIdSB = null;
    
    function displayisVisibleSB(isVisibleSB) {
      const isVisibleDivSB = document.createElement('div');
      isVisibleDivSB.textContent = `isVisibleSB: ${isVisibleSB}`;
      document.body.appendChild(isVisibleDivSB);
    }
    
    function checkingButtonsExistSB() {
      const verseNumbersSB = document.querySelectorAll('.footnotePanel-PLlDp .verse .verse-number, .crossRefPanel-pyz6M .verse .verse-number');
    
      // Check if any verse numbers are visible   
      const isVisibleSB = Array.from(verseNumbersSB).some(verseNumber => {
        return window.getComputedStyle(verseNumber).getPropertyValue('display') !== 'none';
      });
    
      // displayisVisibleSB(isVisibleSB);
    
      // If verse numbers are visible and not currently replacing, execute replaceverseNumbersSBWithButtons
      if (isVisibleSB && !isReplacingSB) {
        isReplacingSB = true;
    
        // Stop the interval
        clearInterval(intervalIdSB);
    
        replaceverseNumbersWithButtonsSideBar(() => {
          // Once replaceverseNumbersSBWithButtons completes, reset the flag and start the interval again after a delay
          isReplacingSB = false;
          setTimeout(() => {
            intervalIdSB = setInterval(checkingButtonsExistSB, 1000);
          }, 3000); // Wait for 3 seconds before restarting the interval
        });
      }
    }
    
    // Start the interval
    intervalIdSB = setInterval(checkingButtonsExistSB, 1000); // Checking every three seconds
    
    
    