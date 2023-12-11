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
  
  function replaceVerseNumbersWithButtons() {
    const verseNumbers = document.querySelectorAll('.verse-number');
    const url = window.location.href;
  
    const langIndex = url.indexOf('lang=eng');
    
    if (langIndex > -1) {
      const chapterIndex = url.lastIndexOf('/', langIndex - 1);
      const bookIndex = url.lastIndexOf('/', chapterIndex - 1);
      
      let chapter = url.substring(chapterIndex + 1, langIndex);
      if (chapter.includes('?')) {
        chapter = chapter.split('?')[0]; // Remove anything after the question mark
      }
  
      const bookAbbr = url.substring(bookIndex + 1, chapterIndex);
  
      verseNumbers.forEach((verseNumber) => {
        const verseNumberText = verseNumber.textContent.trim();
        const bookFullName = bookDecoder[bookAbbr] || '';
        const scripturePath = `${bookFullName} ${chapter}:${verseNumberText}`;
  
        const button = document.createElement('button');
        button.style.fontSize = '12px';
        button.style.border = '1px solid lightgrey';
        button.style.borderRadius = '5px';
        button.style.display = 'inline-flex';
  
        const leftSpan = document.createElement('span');
        const rightSpan = document.createElement('span');
  
        leftSpan.style.backgroundColor = '#191970';
        leftSpan.style.color = 'white';
        leftSpan.style.flex = '1';
        leftSpan.style.padding = '5px';
        leftSpan.style.boxSizing = 'border-box';
        leftSpan.textContent = verseNumberText;
  
        rightSpan.style.backgroundColor = 'white';
        rightSpan.style.flex = '2';
        rightSpan.style.padding = '5px';
        rightSpan.style.boxSizing = 'border-box';
        rightSpan.textContent = scripturePath;
  
        button.appendChild(leftSpan);
        button.appendChild(rightSpan);
  
        button.addEventListener('click', function() {
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
  
          const htmlPaneContent = `
            <div style="background-color: white; padding: 20px; border-radius: 5px;">
              <h2>HTML Pane Title</h2>
              <p>This is the content of the HTML pane...</p>
              <p>You can add any HTML content you want here.</p>
              <button id="closeButton">Close</button>
            </div>
          `;
  
          overlay.innerHTML = htmlPaneContent;
  
          document.body.appendChild(overlay);
  
          const closeButton = document.getElementById('closeButton');
          closeButton.addEventListener('click', function() {
            overlay.remove();
          });
        });
  
        verseNumber.parentNode.replaceChild(button, verseNumber);
      });
    }
  }
  
  window.addEventListener('load', replaceVerseNumbersWithButtons);
  