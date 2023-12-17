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
    let tableHTML = '<table border="1"><tr><th>Talk Year</th><th>Talk Month</th><th>Talk Day</th><th>Talk Session</th><th>Speaker</th><th>Title</th></tr>';
  
    entries.forEach(entry => {
      // Assuming there's a 'hyperlink' property in each entry for the title hyperlink
      const titleLink = entry.hyperlink ? `<a href="${entry.hyperlink}" target="_blank">${entry.title}</a>` : entry.title;
  
      tableHTML += `<tr><td>${entry.talk_year}</td><td>${entry.talk_month}</td><td>${entry.talk_day}</td><td>${entry.talk_session}</td><td>${entry.speaker}</td><td>${titleLink}</td></tr>`;
    });
  
    tableHTML += '</table>';
    return tableHTML;
  }
  
  function createTableOverlay(matchingEntries) {
    const tableView = createTableView(matchingEntries);
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
  
    const htmlPaneContent = `
      <div style="background-color: white; padding: 20px; border-radius: 5px; max-height: 80vh; overflow-y: auto;">
        <h2>Scripture Details</h2>
        ${tableView}
        <button id="closeButton">Close</button>
      </div>
    `;
  
    overlay.innerHTML = htmlPaneContent;
  
    document.body.appendChild(overlay);
  
    const closeButton = document.getElementById('closeButton');
    closeButton.addEventListener('click', function () {
      overlay.remove();
    });
  }
  
  function createSpace() {
    const space = document.createElement('span');
    space.innerHTML = '&nbsp&nbsp;'; // Add a space using HTML entity
    return space;
  }
  
  
  async function replaceVerseNumbersWithButtons(callback) {
    const verseNumbers = document.querySelectorAll('.contentWrapper-n6Z8K .verse .verse-number');
    const url = window.location.href;
    const langIndex = url.indexOf('lang=eng');
  
    if (langIndex > -1) {
      const promises = Array.from(verseNumbers).map(async (verseNumber) => {
        const chapterIndex = url.lastIndexOf('/', langIndex - 1);
        const bookIndex = url.lastIndexOf('/', chapterIndex - 1);
  
        let chapter = url.substring(chapterIndex + 1, langIndex);
        if (chapter.includes('?')) {
          chapter = chapter.split('?')[0];
        }
  
        const bookAbbr = url.substring(bookIndex + 1, chapterIndex);
        const verseNumberText = verseNumber.textContent.trim();
        const bookFullName = bookDecoder[bookAbbr] || '';
        const scripturePath = `${bookFullName} ${chapter}:${verseNumberText}`;
  
        const scriptureQuotedData = await fetchJSON('https://kameronyork.com/datasets/scriptures-quoted.json');
        const matchingEntry = scriptureQuotedData.find(entry => entry.scripture === scripturePath);
        const scriptureCount = matchingEntry ? matchingEntry.count : 0;
  
        const savedColor = await new Promise((resolve) => {
          chrome.storage.sync.get('buttonColor', function (data) {
            resolve(data.buttonColor);
          });
        });
  
        let verseButtonWidth = '25px';
        let countButtonWidth = '25px';
  
        if (verseNumberText.length === 1) {
          verseButtonWidth = '25px';
        } else if (verseNumberText.length === 2) {
          verseButtonWidth = '30px';
        } else if (verseNumberText.length >= 3) {
          verseButtonWidth = '35px';
        }
  
        if (scriptureCount.toString().length === 1) {
          countButtonWidth = '25px';
        } else if (scriptureCount.toString().length === 2) {
          countButtonWidth = '30px';
        } else if (scriptureCount.toString().length >= 3) {
          countButtonWidth = '35px';
        }
  
        if (scriptureCount === 0) {
            const verseButton = document.createElement('button');
            verseButton.style.width = verseButtonWidth;
            verseButton.style.height = '20px';
            verseButton.style.border = 'none';
            verseButton.style.fontSize = '12px';
            verseButton.textContent = verseNumberText;
            verseButton.style.background = savedColor || '#191970';
            verseButton.style.color = 'white';
            verseButton.style.borderRadius = '5px';
            verseButton.style.display = 'inline-block';
            verseButton.style.textAlign = 'center';
            verseButton.style.lineHeight = '20px';
  
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
    
              const scriptureDetails = document.createElement('div');
              scriptureDetails.style.backgroundColor = savedColor || '#191970';  // Sets the background color of the element.
              scriptureDetails.style.color = 'white';
              scriptureDetails.style.padding = '20px';
              scriptureDetails.style.borderRadius = '10px';
              scriptureDetails.textContent = 'No entries found';
    
              const closeButton = document.createElement('button');
              closeButton.textContent = 'Close';
              closeButton.addEventListener('click', function() {
                overlay.remove();
              });
  
              overlay.appendChild(scriptureDetails);
              overlay.appendChild(closeButton);
  
              document.body.appendChild(overlay);
            });         
  
            const space = createSpace();
            verseNumber.parentNode.insertBefore(space.cloneNode(true), verseNumber.nextSibling);
            verseNumber.parentNode.insertBefore(verseButton, verseNumber.nextSibling);
            verseNumber.style.display = 'none';
          } else {
            const verseButton = document.createElement('button');
            verseButton.style.width = verseButtonWidth;
            verseButton.style.height = '20px';
            verseButton.style.border = 'none';
            verseButton.style.fontSize = '12px';
            verseButton.textContent = verseNumberText;
            verseButton.style.background = savedColor || '#191970';
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
  
            const countButton = document.createElement('button');
            countButton.style.width = countButtonWidth;
            countButton.style.height = '20px';
            countButton.style.border = `1px solid ${savedColor || '#191970'}`;
            countButton.style.fontSize = '12px';
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
  
            verseButton.addEventListener('click', async function () {
              const fullQueryData = await fetchJSON('https://kameronyork.com/datasets/conference-quotes.json');
              const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePath);
              createTableOverlay(matchingEntries);
            });        
  
            countButton.addEventListener('click', async function () {
              const fullQueryData = await fetchJSON('https://kameronyork.com/datasets/conference-quotes.json');
              const matchingEntries = getEntriesWithScripture(fullQueryData, scripturePath);
              createTableOverlay(matchingEntries);
            });       
  
            const space = createSpace();
            verseNumber.parentNode.insertBefore(space.cloneNode(true), verseNumber.nextSibling);
            verseNumber.parentNode.insertBefore(countButton, verseNumber.nextSibling);
            verseNumber.parentNode.insertBefore(verseButton, verseNumber.nextSibling);
            verseNumber.style.display = 'none';
          }
        });
    
        // Wait for all promises to resolve before invoking the callback
        await Promise.all(promises);
      }
      callback();
    }  
  
  
  // window.addEventListener('load', replaceVerseNumbersWithButtons);
  
  // The code will now check every second if the verse ids have been set to display = none.
  
  // This variable is used to help disable to checking every second
  let isReplacing = false;
  let intervalId = null;
  
  function displayIsVisible(isVisible) {
    const isVisibleDiv = document.createElement('div');
    isVisibleDiv.textContent = `isVisible: ${isVisible}`;
    document.body.appendChild(isVisibleDiv);
  }
  
  function checkingButtonsExist() {
    const verseNumbers = document.querySelectorAll('.contentWrapper-n6Z8K .verse .verse-number');
  
    // Check if any verse numbers are visible   
    const isVisible = Array.from(verseNumbers).some(verseNumber => {
      return window.getComputedStyle(verseNumber).getPropertyValue('display') !== 'none';
    });
  
    // displayIsVisible(isVisible);
  
    // If verse numbers are visible and not currently replacing, execute replaceVerseNumbersWithButtons
    if (isVisible && !isReplacing) {
      isReplacing = true;
  
      // Stop the interval
      clearInterval(intervalId);
  
      replaceVerseNumbersWithButtons(() => {
        // Once replaceVerseNumbersWithButtons completes, reset the flag and start the interval again after a delay
        isReplacing = false;
        setTimeout(() => {
          intervalId = setInterval(checkingButtonsExist, 1000);
        }, 3000); // Wait for 3 seconds before restarting the interval
      });
    }
  }
  
  // Start the interval
  intervalId = setInterval(checkingButtonsExist, 1000); // Checking every three seconds
  
  
  