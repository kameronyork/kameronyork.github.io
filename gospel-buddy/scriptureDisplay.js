document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('scripture-container');
    const button = document.createElement('button');
    button.textContent = "View Scripture Text";
    button.style.cursor = 'pointer';
    button.style.marginBottom = '10px';

    const content = document.createElement('div');
    content.id = 'scripture-content';
    content.style.display = 'none';
    content.style.background = 'white';
    content.style.border = '1px solid black';
    content.style.padding = '10px';
    content.style.marginTop = '5px';

    button.onclick = async function() {
        // Toggle visibility of scripture text section
        if (content.style.display === "none") {
            button.textContent = "Hide Scripture Text";
            content.style.display = "block";
            // Fetch and display scripture texts when the section is expanded
            const inputScripture = document.getElementById('scriptureInput').value;
            const scriptures = expandScriptureRange(inputScripture);
            const scriptureTexts = await fetchScriptureText(scriptures);
            content.innerHTML = scriptureTexts.map(s => `<p><b>${s.verse}</b>: ${s.text}</p>`).join('');
        } else {
            button.textContent = "View Scripture Text";
            content.style.display = "none";
        }
    };

    container.appendChild(button);
    container.appendChild(content);
});

function expandScriptureRange(reference) {
    reference = reference.replace(/–/g, '-');

    let scriptures = [];
    let lastBookAndChapter = "";
    const sequences = reference.split(';').map(seq => seq.trim());

    sequences.forEach(sequence => {
        const parts = sequence.split(',');
        parts.forEach(part => {
            const trimmedPart = part.trim();
            if (trimmedPart.includes(':')) {
                const chapterAndVerse = trimmedPart.split(':');
                const verses = chapterAndVerse[1].split('-');
                const bookAndChapter = chapterAndVerse[0];
                lastBookAndChapter = bookAndChapter;
                
                if (verses.length > 1) {
                    for (let i = parseInt(verses[0]); i <= parseInt(verses[1]); i++) {
                        scriptures.push(`${bookAndChapter}:${i}`);
                    }
                } else {
                    scriptures.push(`${bookAndChapter}:${verses[0]}`);
                }
            } else {
                const verses = trimmedPart.split('-');
                if (verses.length > 1) {
                    for (let i = parseInt(verses[0]); i <= parseInt(verses[1]); i++) {
                        scriptures.push(`${lastBookAndChapter}:${i}`);
                    }
                } else {
                    scriptures.push(`${lastBookAndChapter}:${verses[0]}`);
                }
            }
        });
    });

    return scriptures;
}

async function fetchScriptureText(scriptures) {
    const url = "https://kameronyork.com/datasets/scripture-verses.csv";
    const response = await fetch(url);
    const csvData = await response.text();
    const data = Papa.parse(csvData, {
        header: true,
        dynamicTyping: true
    }).data;

    // Filter the data to match only the requested scriptures
    return data.filter(entry => scriptures.includes(`${entry.book}:${entry.verse}`)); // Assumes CSV has 'book' and 'verse' columns
}
