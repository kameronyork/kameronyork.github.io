function createButtonWithExtractedURL(verseNumber, verseNumberText, scriptureCountSB, savedColorSB, scripturePathSB) {
  let verseButtonWidthSB = '25px';
  let countButtonWidthSB = '25px';

  const topPositionSB = '-1px';

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

  chrome.storage.sync.get('apostleOnly', function (data) {
    const apostleOnlySB = data.apostleOnly;
    let scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/all-footnotes.json';
    if (apostleOnlySB) {
      scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/apostle-all-footnotes.json';
    }

    if (scriptureCountSB === 0) {
      const verseButtonSB = document.createElement('button');
      verseButtonSB.style.width = verseButtonWidthSB;
      verseButtonSB.style.height = '20px';
      verseButtonSB.style.border = 'none';
      verseButtonSB.style.fontSize = '12px';
      verseButtonSB.textContent = verseNumberText; // This is what goes on the button.
      verseButtonSB.style.background = savedColorSB || '#E74C3C';
      verseButtonSB.style.color = 'white';
      verseButtonSB.style.borderTopLeftRadius = '5px';
      verseButtonSB.style.borderBottomLeftRadius = '5px';
      verseButtonSB.style.borderTopRightRadius = '5px';
      verseButtonSB.style.borderBottomRightRadius = '5px';
      verseButtonSB.style.display = 'flex';
      verseButtonSB.style.alignItems = 'center';
      verseButtonSB.style.justifyContent = 'center';
      verseButtonSB.style.padding = '0 5px';
      verseButtonSB.style.display = 'inline-block';
      verseButtonSB.style.verticalAlign = 'middle';
      verseButtonSB.style.position = 'relative'; // Set position to relative
      verseButtonSB.style.top = topPositionSB; // Shift the button up by 5px

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

        const scriptureContainerSB = document.createElement('div');
        scriptureContainerSB.style.backgroundColor = savedColorSB || '#E74C3C'; // Set the background color of the inner shape
        scriptureContainerSB.style.color = 'white';
        scriptureContainerSB.style.padding = '20px';
        scriptureContainerSB.style.borderRadius = '10px';
        scriptureContainerSB.style.position = 'relative'; // Position the container relative to the overlay
        scriptureContainerSB.style.width = '220px'; // Set the width to 300px
        scriptureContainerSB.style.height = '100px'; // Set the height to 200px
        scriptureContainerSB.style.display = 'flex'; // Use flexbox for centering
        scriptureContainerSB.style.flexDirection = 'column'; // Stack elements vertically
        scriptureContainerSB.style.alignItems = 'center'; // Center horizontally
        scriptureContainerSB.style.justifyContent = 'center'; // Center vertically

        const closeButtonSB = document.createElement('button');
        closeButtonSB.textContent = '✖'; // Use the "x" symbol for close
        closeButtonSB.style.position = 'absolute'; // Position the button
        closeButtonSB.style.top = '10px'; // Adjust top position
        closeButtonSB.style.right = '10px'; // Adjust right position
        closeButtonSB.style.backgroundColor = 'transparent'; // Transparent background
        closeButtonSB.style.border = 'none'; // No border
        closeButtonSB.style.color = 'white'; // White color
        closeButtonSB.style.fontSize = '20px'; // Adjust font size
        closeButtonSB.style.cursor = 'pointer'; // Set cursor to pointer
        closeButtonSB.addEventListener('click', function() {
          overlaySB.remove();
        });

        const scriptureDetailSB = document.createElement('div');
        scriptureDetailSB.textContent = 'No entries found';

        scriptureContainerSB.appendChild(closeButtonSB);
        scriptureContainerSB.appendChild(scriptureDetailSB);

        overlaySB.appendChild(scriptureContainerSB);

        document.body.appendChild(overlaySB);

        // Close the pane when clicking outside the scripture container area (on the overlay)
        overlaySB.addEventListener('click', function (event) {
          if (event.target === overlaySB) {
            overlaySB.remove();
          }
        });
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
      verseButtonSB.style.background = savedColorSB || '#E74C3C';
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
      verseButtonSB.style.position = 'relative'; // Set position to relative
      verseButtonSB.style.top = topPositionSB; // Shift the button up by 5px

      const countButtonSB = document.createElement('button');
      countButtonSB.style.width = countButtonWidthSB;
      countButtonSB.style.height = '20px';
      countButtonSB.style.border = `1px solid ${savedColorSB || '#E74C3C'}`;
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
      countButtonSB.style.position = 'relative'; // Set position to relative
      countButtonSB.style.top = topPositionSB; // Shift the button up by 5px

      verseButtonSB.addEventListener('click', async function () {
        this.disabled = true; // Disable the button immediately to prevent multiple clicks

        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlSB);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathSB);
        createTableOverlay(matchingEntries, scripturePathSB);

        // Re-enable the button after the table is shown and a delay of 3 seconds
        setTimeout(() => {
          this.disabled = false;
        }, 1000); // 1000 milliseconds = 1 second
      });

      countButtonSB.addEventListener('click', async function () {
        this.disabled = true; // Disable the button immediately to prevent multiple clicks

        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlSB);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathSB);
        createTableOverlay(matchingEntries, scripturePathSB);

        // Re-enable the button after the table is shown and a delay of 3 seconds
        setTimeout(() => {
          this.disabled = false;
        }, 1000); // 1000 milliseconds = 1 second
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
          const langRegex = /lang=(eng|spa)/;
          const langMatch = firstLink.href.match(langRegex);
  
          if (langMatch) {
            // Check if buttons have been created for this section
            if (!createdButtonsMap.has(section)) {
              createdButtonsMap.set(section, new Set()); // Initialize a Set to track buttons for this section
            }
  
            const verseNumbersSB = section.querySelectorAll('.reference-UoeCG .verse .verse-number');
            const apostleOnlySB = await new Promise((resolve) => {
              chrome.storage.sync.get('apostleOnly', function (data) {
                resolve(data.apostleOnly);
              });
            });
  
            const promises = Array.from(verseNumbersSB).map(async (verseNumber) => {
              const createdButtons = createdButtonsMap.get(section);
  
              // Check if a button already exists for this verseNumber in this section
              if (!createdButtons.has(verseNumber)) {
                const chapterIndexSB = firstLink.href.lastIndexOf('/', langMatch.index - 1);
                const bookIndexSB = firstLink.href.lastIndexOf('/', chapterIndexSB - 1);
  
                let chapterSB = firstLink.href.substring(chapterIndexSB + 1, langMatch.index);
                if (chapterSB.includes('?')) {
                  chapterSB = chapterSB.split('?')[0];
                }
  
                if (chapterSB.includes('.')) {
                  chapterSB = chapterSB.split('.')[0];
                }
  
                const bookAbbrSB = firstLink.href.substring(bookIndexSB + 1, chapterIndexSB);
  
                const extractedURL = firstLink.getAttribute('href');
                const bookFullNameSB = bookDecoder[bookAbbrSB] || '';
                const verseNumberText = verseNumber.textContent.trim();
                const scripturePathSB = `${bookFullNameSB} ${chapterSB}:${verseNumberText}`;
  
                let scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/all-footnotes-lookup.json';
                if (apostleOnlySB) {
                  scriptureQuotedDataUrlSB = 'https://kameronyork.com/datasets/apostle-all-footnotes-lookup.json';
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
            intervalIdSB = setInterval(checkingButtonsExistSB, 2000);
          }, 2000); // Wait for 2 seconds before restarting the interval
        });
      }
    }
    
    // Start the interval
    intervalIdSB = setInterval(checkingButtonsExistSB, 2000); // Checking every three seconds
    
    
    