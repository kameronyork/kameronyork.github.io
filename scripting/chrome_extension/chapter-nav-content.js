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

  chrome.storage.sync.get('apostleOnly', function (data) {
    const apostleOnlyNav = data.apostleOnly;
    let scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/all-footnotes-oct-2024.json';
    if (apostleOnlyNav) {
      scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/apostle-all-footnotes-oct-2024.json';
    }

    if (scriptureCountNav === 0) {
      const verseButtonNav = document.createElement('button');
      verseButtonNav.style.width = verseButtonWidthNav;
      verseButtonNav.style.height = '20px';
      verseButtonNav.style.border = 'none';
      verseButtonNav.style.fontSize = '12px';
      verseButtonNav.textContent = verseNumberText; // This is what goes on the button.
      verseButtonNav.style.background = savedColorNav || '#E74C3C';
      verseButtonNav.style.color = 'white';
      verseButtonNav.style.borderTopLeftRadius = '5px';
      verseButtonNav.style.borderBottomLeftRadius = '5px';
      verseButtonNav.style.borderTopRightRadius = '5px';
      verseButtonNav.style.borderBottomRightRadius = '5px';
      verseButtonNav.style.display = 'flex';
      verseButtonNav.style.alignItems = 'center';
      verseButtonNav.style.justifyContent = 'center';
      verseButtonNav.style.padding = '0 5px';
      verseButtonNav.style.display = 'inline-block';
      verseButtonNav.style.verticalAlign = 'middle';

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

        const scriptureContainerNav = document.createElement('div');
        scriptureContainerNav.style.backgroundColor = savedColorNav || '#E74C3C'; // Set the background color of the inner shape
        scriptureContainerNav.style.color = 'white';
        scriptureContainerNav.style.padding = '20px';
        scriptureContainerNav.style.borderRadius = '10px';
        scriptureContainerNav.style.position = 'relative'; // Position the container relative to the overlay
        scriptureContainerNav.style.width = '220px'; // Set the width to 300px
        scriptureContainerNav.style.height = '100px'; // Set the height to 200px
        scriptureContainerNav.style.display = 'flex'; // Use flexbox for centering
        scriptureContainerNav.style.flexDirection = 'column'; // Stack elements vertically
        scriptureContainerNav.style.alignItems = 'center'; // Center horizontally
        scriptureContainerNav.style.justifyContent = 'center'; // Center vertically

        const closeButtonNav = document.createElement('button');
        closeButtonNav.textContent = '✖'; // Use the "x" symbol for close
        closeButtonNav.style.position = 'absolute'; // Position the button
        closeButtonNav.style.top = '10px'; // Adjust top position
        closeButtonNav.style.right = '10px'; // Adjust right position
        closeButtonNav.style.backgroundColor = 'transparent'; // Transparent background
        closeButtonNav.style.border = 'none'; // No border
        closeButtonNav.style.color = 'white'; // White color
        closeButtonNav.style.fontSize = '20px'; // Adjust font size
        closeButtonNav.style.cursor = 'pointer'; // Set cursor to pointer
        closeButtonNav.addEventListener('click', function() {
          overlayNav.remove();
        });

        const scriptureDetailsNav = document.createElement('div');
        scriptureDetailsNav.textContent = 'No entries found';

        scriptureContainerNav.appendChild(closeButtonNav);
        scriptureContainerNav.appendChild(scriptureDetailsNav);

        overlayNav.appendChild(scriptureContainerNav);

        document.body.appendChild(overlayNav);

        // Close the pane when clicking outside the scripture container area (on the overlay)
        overlayNav.addEventListener('click', function (event) {
          if (event.target === overlayNav) {
            overlayNav.remove();
          }
        });
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
      verseButtonNav.style.background = savedColorNav || '#E74C3C';
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
      countButtonNav.style.border = `1px solid ${savedColorNav || '#E74C3C'}`;
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
        this.disabled = true; // Disable the button immediately to prevent multiple clicks

        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlNav);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathNav);
        createTableOverlay(matchingEntries, scripturePathNav);

        // Re-enable the button after the table is shown and a delay of 3 seconds
        setTimeout(() => {
          this.disabled = false;
        }, 1000); // 1000 milliseconds = 1 second
      });

      countButtonNav.addEventListener('click', async function () {
        this.disabled = true; // Disable the button immediately to prevent multiple clicks

        const fullQueryData = await fetchJSON(scriptureQuotedDataUrlNav);
        const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePathNav);
        createTableOverlay(matchingEntries, scripturePathNav);

        // Re-enable the button after the table is shown and a delay of 3 seconds
        setTimeout(() => {
          this.disabled = false;
        }, 1000); // 1000 milliseconds = 1 second
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
  const articlesNav = document.querySelectorAll('article.has-max-width.classic-scripture[lang="eng"], article.has-max-width.classic-scripture[lang="spa"]');

  if (articlesNav.length > 0) {
    for (const article of articlesNav) {
      const verseNumbersNav = article.querySelectorAll('.verse .verse-number');
      // Clear existing buttons in this article
      const existingButtons = article.querySelectorAll('button');
      existingButtons.forEach(button => button.remove());

      const apostleOnlyNav = await new Promise((resolve) => {
        chrome.storage.sync.get('apostleOnly', function (data) {
          resolve(data.apostleOnly);
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

          let scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/all-footnotes-lookup-oct-2024.json';
          if (apostleOnlyNav) {
            scriptureQuotedDataUrlNav = 'https://kameronyork.com/datasets/apostle-all-footnotes-lookup-oct-2024.json';
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
  let lastChapterSelection = ""; // Track the last chapter selection

  function getCurrentChapterSelection() {
    const currentChapterElements = document.querySelectorAll(".reference-UoeCG .citation-gN5YU");
    if (currentChapterElements.length > 0) {
        // Assuming there's only one current chapter visible at a time
        return currentChapterElements[0].textContent.trim().replace(/\s+/g, ' ');
    }
    return null;
}
  
  function checkingButtonsExistNav() {  
    // Fetch the current chapter selection text
    const currentChapterSelectionText = getCurrentChapterSelection(); // Assuming this returns the current chapter's text content, or null if not found
  
    // console.log("Last Chapter = ", lastChapterSelection);
    // console.log("Current Chapter = ", currentChapterSelectionText);
  
    // Determine if chapter selection has changed (and not null)
    const hasChapterChanged = currentChapterSelectionText !== lastChapterSelection && (currentChapterSelectionText !== null); // && lastChapterSelection !== null); Removed because the buttons should be replaced even if the previous chapter is null.



    // If verse numbers are visible and not currently replacing, execute replaceverseNumbersNavWithButtons
    if (hasChapterChanged && !isReplacingNav) {
      isReplacingNav = true;
      lastChapterSelection = currentChapterSelectionText; // Update lastChapterSelection
  
      // Stop the interval
      clearInterval(intervalIdNav);
  
      replaceverseNumbersWithButtonsNav(() => {
        // Once replaceverseNumbersNavWithButtons completes, reset the flag and start the interval again after a delay
        isReplacingNav = false;
        setTimeout(() => {
          intervalIdNav = setInterval(checkingButtonsExistNav, 2000);
        }, 2000); // Wait for 2 seconds before restarting the interval
      });
      // console.log("Buttons Replaced");
    }

    if (currentChapterSelectionText === null && !(currentChapterSelectionText === null && lastChapterSelection === null)) {
      lastChapterSelection = null;
      // console.log("I'm setting this to null");
    }
  }
  
  // Start the interval
  intervalIdNav = setInterval(checkingButtonsExistNav, 2000); // Checking every three seconds
  
  
  