// Decode book abbreviation to its full name
const bookDecoder = {
    'gen': 'Genesis',
    'ex': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers',
    'deut': 'Deuteronomy',
    'josh': 'Joshua',
    'judg': 'Judges',
    'ruth': 'Ruth',
    '1-sam': '1 Samuel',
    '2-sam': '2 Samuel',
    '1-kgs': '1 Kings',
    '2-kgs': '2 Kings',
    '1-chr': '1 Chronicles',
    '2-chr': '2 Chronicles',
    'ezra': 'Ezra',
    'neh': 'Nehemiah',
    'esth': 'Esther',
    'job': 'Job',
    'ps': 'Psalm',
    'prov': 'Proverbs',
    'eccl': 'Ecclesiastes',
    'song': 'Song of Solomon',
    'isa': 'Isaiah',
    'jer': 'Jeremiah',
    'lam': 'Lamentations',
    'ezek': 'Ezekiel',
    'dan': 'Daniel',
    'hosea': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos',
    'obad': 'Obadiah',
    'jonah': 'Jonah',
    'micah': 'Micah',
    'nahum': 'Nahum',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'matt': 'Matthew',
    'mark': 'Mark',
    'luke': 'Luke',
    'john': 'John',
    'acts': 'Acts',
    'rom': 'Romans',
    '1-cor': '1 Corinthians',
    '2-cor': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians',
    'philip': 'Philippians',
    'col': 'Colossians',
    '1-thes': '1 Thessalonians',
    '2-thes': '2 Thessalonians',
    '1-tim': '1 Timothy',
    '2-tim': '2 Timothy',
    'titus': 'Titus',
    'philem': 'Philemon',
    'heb': 'Hebrews',
    'james': 'James',
    '1-pet': '1 Peter',
    '2-pet': '2 Peter',
    '1-jn': '1 John',
    '2-jn': '2 John',
    '3-jn': '3 John',
    'jude': 'Jude',
    'rev': 'Revelation',
    '1-ne': '1 Nephi',
    '2-ne': '2 Nephi',
    'jacob': 'Jacob',
    'enos': 'Enos',
    'jarom': 'Jarom',
    'omni': 'Omni',
    'w-of-m': 'Words of Mormon',
    'mosiah': 'Mosiah',
    'alma': 'Alma',
    'hel': 'Helaman',
    '3-ne': '3 Nephi',
    '4-ne': '4 Nephi',
    'morm': 'Mormon',
    'ether': 'Ether',
    'moro': 'Moroni',
    'dc': 'D&C',
    'moses': 'Moses',
    'abr': 'Abraham',
    'js-m': 'Joseph Smith Matthew',
    'js-h': 'Joseph Smith History',
    'a-of-f': 'Articles of Faith',
  };
  
  async function fetchJSON(url) {
    const response = await fetch(url);
    return response.json();
  }
  
  function countScriptureInstances(data, scripturePath) {
    return data.filter(entry => entry.scripture === scripturePath).length;
  }
  
  function getEntriesWithScripture(data, scripturePath) {
    return data.filter(entry => entry.scripture === scripturePath);
  }
  
  function createTableView(entries) {
    const uniqueEntries = {};
    entries.forEach(entry => {
        const talkId = entry.talk_id;
        if (!uniqueEntries[talkId]) {
            uniqueEntries[talkId] = entry;
        }
    });

    const uniqueEntriesArray = Object.values(uniqueEntries);
    uniqueEntriesArray.sort((a, b) => b.talk_id - a.talk_id);

    let tableHTML = `<table border="1">
      <tr>
          <th style="text-align: center;">% <button class="info-button" title="This column displays what percentage of the verse is quoted in the talk">i</button></th>
          <th>Year</th>
          <th>Month</th>
          <th>Speaker</th>
          <th>Talk Title</th>
      </tr>`;

    uniqueEntriesArray.forEach(entry => {
        const titleLink = entry.hyperlink ? `<a href="${entry.hyperlink}" target="_blank">${entry.title}</a>` : entry.title;
        // Modify this line to include a div with dynamic width based on perc_quoted
        tableHTML += `<tr>
                        <td style="text-align: center; position: relative;">
                          <div style="background-color: #F39C12; width: ${entry.perc_quoted}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                          <div style="position: relative; z-index: 1;">${entry.perc_quoted}</div>
                        </td>
                        <td>${entry.talk_year}</td>
                        <td>${entry.talk_month}</td>
                        <td>${entry.speaker}</td>
                        <td>${titleLink}</td>
                      </tr>`;
    });

    tableHTML += '</table>';
    return tableHTML;
}


  
  // A flag that can stop a second table from being generated on top of another table.
  let isTableBeingGenerated = false;
  
  function createTableOverlay(matchingEntries, scripturePath, scripturePathSB, scripturePathNav) {
    if (isTableBeingGenerated) return; // Prevent multiple tables if one is already in process
    isTableBeingGenerated = true; // Set the flag to true to indicate table generation has started

    console.log("Flag Changed = ", isTableBeingGenerated);

    const tableView = createTableView(matchingEntries);
    const headerHeight = 50; // Example header height
    const footerHeight = 50; // Example footer height
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.overflowY = 'auto';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    let finalPath = scripturePath
    
    if (scripturePath === undefined) {
      if (scripturePathSB !== undefined) {
        finalPath = scripturePathSB
      }else{
        finalPath = scripturePathNav
      }
    }
  
      const htmlPaneContent = `
      <head>
        <title>Conference Talks</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          .container {
            padding: 500px 50px;
            border: 2px solid black;
            overflow: auto;
          }
          .title {
            position: sticky;
            top: 0;
            background-color: #dadada; /* Updated background color */
            color: black; /* Updated text color */
            padding: 10px;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .close-button {
            cursor: pointer;
            border: none;
            background-color: #dadada; /* Gray background color */
            color: black; /* Updated text color */
            font-size: 20px;
            line-height: 1;
            padding: 5px 10px;
            margin-right: 10px;
          }
          .close-button:hover {
            background-color: #ccc; /* Hover color */
          }
          .footer {
            position: sticky;
            bottom: 0;
            background-color: white;
            z-index: 1;
            display: flex;
            justify-content: flex-end;
            padding: 10px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            color: black; /* Set text color to black */
          }
          th, td {
              border: 1px solid #dddddd;
              padding: 8px 15px;
          }
          .info-button {
            float: right;
            cursor: pointer;
            background-color: #F2F2F2;
            color: black;
            border: 1px solid black;
            border-radius: 2px;
            padding: 1px 4px;
            font-size: 10px;
            margin-left: 1px;
            margin-right: -25%; /* Shift left by 35% */
          }
        

          /* Optional: Style for a custom tooltip if using a div instead of the title attribute */
          .tooltip {
              visibility: hidden;
              width: 120px;
              background-color: black;
              color: #fff;
              text-align: center;
              border-radius: 6px;
              padding: 5px 0;
              position: absolute;
              z-index: 1;
              bottom: 100%;
              left: 50%;
              margin-left: -60px;
          }
          th {
            position: sticky;
            top: 0;
            background-color: #f2f2f2;
            z-index: 2;
          }
        </style>
      </head>
      <body>
        <div style="background-color: white; padding: 0px; border-radius: 5px;">
          <div class="title">
            <span>Conference Talks — ${finalPath}</span>
            <button class="close-button" id="closeButtonHeader">✖</button>
          </div>
          <div class="table-container" style="max-height: calc(90vh - ${headerHeight + footerHeight}px); overflow-y: auto;">
            <table>
              ${tableView}
            </table>
          </div>
          <div class="footer">
            <button id="closeButtonFooter">Close</button>
          </div>
        </div>
      </body>
      `;
    
  
      overlay.innerHTML = htmlPaneContent;

      document.body.appendChild(overlay);
    
      const closeButton = document.getElementById('closeButtonHeader');
      closeButton.addEventListener('click', function () {
        overlay.remove();
      });
    
      const closeButtonFooter = document.getElementById('closeButtonFooter');
      closeButtonFooter.addEventListener('click', function () {
        overlay.remove();
      });
    
      // Close the pane when clicking outside the main table area (on the overlay)
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) {
          overlay.remove();
        }
      });

      // Reset the flag after the table has been appended to the DOM
      isTableBeingGenerated = false;
      console.log("Flag Changed = ", isTableBeingGenerated);
    }
  
  function createSpace() {
    const space = document.createElement('span');
    space.innerHTML = '&nbsp&nbsp;'; // Add a space using HTML entity
    return space;
  }


  function createButton(verseNumber, verseNumberText, scriptureCount, savedColor, scripturePath) {

    const fontSizeElement = document.querySelector('.contentWrapper-n6Z8K .renderFrame-hnHZX .classic-scripture .body');
    const fontSizeStyle = getComputedStyle(fontSizeElement);
    const fontSizeValue = parseFloat(fontSizeStyle.getPropertyValue('--increment'));

    console.log('Font Size Value:', fontSizeValue);

    // Calculate the button height and font size based on the font size range value
    const buttonHeight = fontSizeValue * 18 + 'px';
    const fontSize = fontSizeValue * 11 + 'px';

    const topPosition = '-2px';

    let verseButtonWidth = fontSizeValue * 20 + 'px';
    let countButtonWidth = fontSizeValue * 20 + 'px';
  
    if (verseNumberText.length === 1) {
      verseButtonWidth = fontSizeValue * 22 + 'px';
    } else if (verseNumberText.length === 2) {
      verseButtonWidth = fontSizeValue * 27 + 'px';
    } else if (verseNumberText.length >= 3) {
      verseButtonWidth = fontSizeValue * 32 + 'px';
    }
  
    if (scriptureCount.toString().length === 1) {
      countButtonWidth = fontSizeValue * 22 + 'px';
    } else if (scriptureCount.toString().length === 2) {
      countButtonWidth = fontSizeValue * 27 + 'px';
    } else if (scriptureCount.toString().length >= 3) {
      countButtonWidth = fontSizeValue * 32 + 'px';
    }
  
    chrome.storage.sync.get('apostleOnly', function (data) {
      const apostleOnly = data.apostleOnly;
      let scriptureQuotedDataUrl = 'https://kameronyork.com/datasets/all-footnotes-apr-2024.json';
      if (apostleOnly) {
        scriptureQuotedDataUrl = 'https://kameronyork.com/datasets/apostle-all-footnotes-apr-2024.json';
      }
  
      if (scriptureCount === 0) {
        const verseButton = document.createElement('button');
        verseButton.style.width = verseButtonWidth;
        verseButton.style.height = buttonHeight;
        verseButton.style.border = 'none';
        verseButton.style.fontSize = fontSize;
        verseButton.textContent = verseNumberText;
        verseButton.style.background = savedColor || '#E74C3C';
        verseButton.style.color = 'white';
        verseButton.style.borderTopLeftRadius = '5px';
        verseButton.style.borderBottomLeftRadius = '5px';
        verseButton.style.borderTopRightRadius = '5px';
        verseButton.style.borderBottomRightRadius = '5px';
        verseButton.style.display = 'flex';
        verseButton.style.alignItems = 'center';
        verseButton.style.justifyContent = 'center';
        verseButton.style.padding = '0 5px';
        verseButton.style.display = 'inline-block';
        verseButton.style.verticalAlign = 'middle';
        verseButton.style.position = 'relative'; // Set position to relative
        verseButton.style.top = topPosition; // Shift the button up by 5px
  
        verseButton.addEventListener('click', async function () {
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '9999';
        
          const scriptureContainer = document.createElement('div');
          scriptureContainer.style.backgroundColor = savedColor || '#E74C3C'; // Set the background color of the inner shape
          scriptureContainer.style.color = 'white';
          scriptureContainer.style.padding = '20px';
          scriptureContainer.style.borderRadius = '10px';
          scriptureContainer.style.position = 'relative'; // Position the container relative to the overlay
          scriptureContainer.style.width = '220px'; // Set the width to 300px
          scriptureContainer.style.height = '100px'; // Set the height to 200px
          scriptureContainer.style.display = 'flex'; // Use flexbox for centering
          scriptureContainer.style.flexDirection = 'column'; // Stack elements vertically
          scriptureContainer.style.alignItems = 'center'; // Center horizontally
          scriptureContainer.style.justifyContent = 'center'; // Center vertically
        
          const closeButton = document.createElement('button');
          closeButton.textContent = '✖'; // Use the "x" symbol for close
          closeButton.style.position = 'absolute'; // Position the button
          closeButton.style.top = '10px'; // Adjust top position
          closeButton.style.right = '10px'; // Adjust right position
          closeButton.style.backgroundColor = 'transparent'; // Transparent background
          closeButton.style.border = 'none'; // No border
          closeButton.style.color = 'white'; // White color
          closeButton.style.fontSize = '20px'; // Adjust font size
          closeButton.style.cursor = 'pointer'; // Set cursor to pointer
          closeButton.addEventListener('click', function() {
            overlay.remove();
          });
        
          const scriptureDetails = document.createElement('div');
          scriptureDetails.textContent = 'No entries found';

          scriptureContainer.appendChild(closeButton);
          scriptureContainer.appendChild(scriptureDetails);

          overlay.appendChild(scriptureContainer);

          document.body.appendChild(overlay);

          // Close the pane when clicking outside the scripture container area (on the overlay)
          overlay.addEventListener('click', function (event) {
            if (event.target === overlay) {
              overlay.remove();
            }
          });
        });
        
  
        const space = createSpace();
        verseNumber.parentNode.insertBefore(space.cloneNode(true), verseNumber.nextSibling);
        verseNumber.parentNode.insertBefore(verseButton, verseNumber.nextSibling);
        verseNumber.style.display = 'none';
      } else {
        const verseButton = document.createElement('button');
        verseButton.style.width = verseButtonWidth;
        verseButton.style.height = buttonHeight;
        verseButton.style.border = 'none';
        verseButton.style.fontSize = fontSize;
        verseButton.textContent = verseNumberText;
        verseButton.style.background = savedColor || '#E74C3C';
        verseButton.style.color = 'white';
        verseButton.style.borderTopLeftRadius = '5px';
        verseButton.style.borderBottomLeftRadius = '5px';
        verseButton.style.borderTopRightRadius = '0';
        verseButton.style.borderBottomRightRadius = '0';
        verseButton.style.display = 'flex';
        verseButton.style.alignItems = 'center';
        verseButton.style.justifyContent = 'center';
        verseButton.style.padding = '0 5px';
        verseButton.style.display = 'inline-block';
        verseButton.style.verticalAlign = 'middle';
        verseButton.style.position = 'relative'; // Set position to relative
        verseButton.style.top = topPosition; // Shift the button up by 5px
  
        const countButton = document.createElement('button');
        countButton.style.width = countButtonWidth;
        countButton.style.height = buttonHeight;
        countButton.style.border = `1px solid ${savedColor || '#E74C3C'}`;
        countButton.style.fontSize = fontSize;
        countButton.textContent = `${scriptureCount}`;
        countButton.style.background = 'white';
        countButton.style.color = 'black';
        countButton.style.borderTopLeftRadius = '0';
        countButton.style.borderBottomLeftRadius = '0';
        countButton.style.borderTopRightRadius = '5px';
        countButton.style.borderBottomRightRadius = '5px';
        countButton.style.display = 'flex';
        countButton.style.alignItems = 'center';
        countButton.style.justifyContent = 'center';
        countButton.style.padding = '0 5px';
        countButton.style.display = 'inline-block';
        countButton.style.verticalAlign = 'middle';
        countButton.style.position = 'relative'; // Set position to relative
        countButton.style.top = topPosition; // Shift the button up by 5px
  
  
        verseButton.addEventListener('click', async function () {
          this.disabled = true; // Disable the button immediately to prevent multiple clicks
      
          // Existing logic to fetch data and create table overlay
          const fullQueryData = await fetchJSON(scriptureQuotedDataUrl);
          const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePath);
          createTableOverlay(matchingEntries, scripturePath);

          // Re-enable the button after the table is shown and a delay of 3 seconds
          setTimeout(() => {
            this.disabled = false;
          }, 1000); // 1000 milliseconds = 1 second
        });
  
        countButton.addEventListener('click', async function () {
          this.disabled = true; // Disable the button immediately to prevent multiple clicks

          const fullQueryData = await fetchJSON(scriptureQuotedDataUrl);
          const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePath);
          createTableOverlay(matchingEntries, scripturePath);

          // Re-enable the button after the table is shown and a delay of 3 seconds
          setTimeout(() => {
            this.disabled = false;
          }, 1000); // 1000 milliseconds = 1 second
        });
  
        const space = createSpace();
        verseNumber.parentNode.insertBefore(space.cloneNode(true), verseNumber.nextSibling);
        verseNumber.parentNode.insertBefore(countButton, verseNumber.nextSibling);
        verseNumber.parentNode.insertBefore(verseButton, verseNumber.nextSibling);
        verseNumber.style.display = 'none';
      }
    });
  }
  
  
  
  async function replaceVerseNumbersWithButtons(callback) {
    const verseNumbers = document.querySelectorAll(".contentWrapper-n6Z8K .renderFrame-hnHZX .verse .verse-number");
    const url = window.location.href;
    const langRegex = /lang=(eng|spa)/;
  
    if (langRegex.test(url)) {
      const promises = Array.from(verseNumbers).map(async (verseNumber) => {
        const langMatch = url.match(langRegex);
        const langValue = langMatch ? langMatch[1] : ''; // Extract the matched value (eng or spa)
  
        const chapterIndex = url.lastIndexOf('/', langMatch.index - 1);
        const bookIndex = url.lastIndexOf('/', chapterIndex - 1);
  
        let chapter = url.substring(chapterIndex + 1, langMatch.index);
        if (chapter.includes('?')) {
          chapter = chapter.split('?')[0];
        }
  
        if (chapter.includes('.')) {
          chapter = chapter.split('.')[0];
        }
  
        const bookAbbr = url.substring(bookIndex + 1, chapterIndex);
        const verseNumberText = verseNumber.textContent.trim();
        const bookFullName = bookDecoder[bookAbbr] || '';
        const scripturePath = `${bookFullName} ${chapter}:${verseNumberText}`;
  
        const apostleOnly = await new Promise((resolve) => {
          chrome.storage.sync.get('apostleOnly', function (data) {
            resolve(data.apostleOnly);
          });
        });
  
        let scriptureQuotedDataUrl = 'https://kameronyork.com/datasets/all-footnotes-lookup-apr-2024.json';
        if (apostleOnly) {
          scriptureQuotedDataUrl = 'https://kameronyork.com/datasets/apostle-all-footnotes-lookup-apr-2024.json';
        }
  
        const scriptureQuotedData = await fetchJSON(scriptureQuotedDataUrl);
        const matchingEntry = scriptureQuotedData.find(entry => entry.scripture === scripturePath);
        const scriptureCount = matchingEntry ? matchingEntry.count : 0;
  
        const savedColor = await new Promise((resolve) => {
          chrome.storage.sync.get('buttonColor', function (data) {
            resolve(data.buttonColor);
          });
        });
  
        createButton(verseNumber, verseNumberText, scriptureCount, savedColor, scripturePath);
      });
  
      // Wait for all promises to resolve before invoking the callback
      await Promise.all(promises);
      callback();
    }
  }
  
  
  // Example usage:
  replaceVerseNumbersWithButtons(() => {
    console.log('Replacement completed');
  });
  
  // The code will now check every second if the verse ids have been set to display = none.
  
  // This variable is used to help disable the checking every second
  // This variable is used to help disable the checking every second
  let isReplacing = false;
  let intervalId = null;
  
  function displayisVisible(isVisible) {
    const isVisibleDiv = document.createElement('div');
    isVisibleDiv.textContent = `isVisible: ${isVisible}`;
    document.body.appendChild(isVisibleDiv);
  }
  
  function checkingButtonsExist() {
    const verseNumbers = document.querySelectorAll(".contentWrapper-n6Z8K .renderFrame-hnHZX .verse .verse-number");
  
    // Check if any verse numbers are visible
    const isVisible = Array.from(verseNumbers).some(verseNumber => {
      return window.getComputedStyle(verseNumber).getPropertyValue('display') !== 'none';
    });
  
    // displayisVisible(isVisible);
  
    // If verse numbers are visible and not currently replacing, execute replaceVerseNumbersWithButtons
    if (isVisible && !isReplacing) {
      isReplacing = true;
  
      // Stop the interval
      clearInterval(intervalId);
  
      replaceVerseNumbersWithButtons(() => {
        // Once replaceVerseNumbersWithButtons completes, reset the flag and start the interval again after a delay
        isReplacing = false;
        setTimeout(() => {
          intervalId = setInterval(checkingButtonsExist, 2000);
        }, 2000); // Wait for 2 seconds before restarting the interval
      });
    }
  }
  
  // Start the interval
  intervalId = setInterval(checkingButtonsExist, 2000); // Checking every second