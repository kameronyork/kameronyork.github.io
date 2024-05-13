const MIN_QUOTE_PERCENTAGE = 20; // Minimum percentage for a verse to be counted as quoted

async function fetchJSON() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    let url;

    if (currentMonth >= 9 && currentMonth <= 11) {
        url = `https://kameronyork.com/datasets/all-footnotes-oct-${currentYear}.json`;
    } else if (currentMonth >= 3 && currentMonth <= 8) {
        url = `https://kameronyork.com/datasets/all-footnotes-apr-${currentYear}.json`;
    } else {
        url = `https://kameronyork.com/datasets/all-footnotes-oct-${currentYear - 1}.json`;
    }

    return await (await fetch(url)).json();
}

function expandScriptureRange(reference) {
    // Replace en-dashes with hyphens for consistency in sequence handling
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
                // No colon means we're dealing with just verse numbers after a semicolon
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


function updateTable() {
    const inputScripture = document.getElementById('scriptureInput').value;
    try {
        const scriptures = expandScriptureRange(inputScripture);
        displayTableForScripture(scriptures);
    } catch (error) {
        document.getElementById('scripture-table-container').innerHTML = `<div style="color: #ccc; text-align: center; font-size: 16px;">${error.message}</div>`;
    }
}



async function displayTableForScripture(scriptures) {
    const data = await fetchJSON();
    const filteredEntries = data.filter(entry => scriptures.includes(entry.scripture));
    let tableHTML = '';
    if (scriptures.length === 1) {
        tableHTML = createSingleScriptureView(filteredEntries);
    } else {
        tableHTML = createTableView(filteredEntries, scriptures);
    }
    document.getElementById("scripture-table-container").innerHTML = tableHTML;
}

function createSingleScriptureView(entries) {
    // Collect unique entries by talk_id
    const uniqueEntries = {};
    entries.forEach(entry => {
        const talkId = entry.talk_id;
        if (!uniqueEntries[talkId]) {
            uniqueEntries[talkId] = entry;
        }
    });

    // Convert object to array and sort by talk_id in descending order
    const sortedEntries = Object.values(uniqueEntries).sort((a, b) => b.talk_id - a.talk_id);

    let tableHTML = `<table style="width: 100%; margin: auto; border-collapse: collapse; font-size: 10pt;"><tr>
        <th style="text-align: center;">%</th>
        <th style="text-align: center;">Year</th>
        <th style="text-align: center;">Month</th>
        <th style="text-align: center;">Speaker</th>
        <th style="text-align: center;">Title</th>
    </tr>`;
    sortedEntries.forEach(entry => {
        const percentQuoted = entry.perc_quoted;
        tableHTML += `<tr>
            <td style="text-align: center; position: relative;">
                <div style="background-color: #F39C12; width: ${percentQuoted}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                <div style="position: relative; z-index: 1;">${percentQuoted}%</div>
            </td>
            <td style="text-align: center;">${entry.talk_year}</td>
            <td style="text-align: center;">${entry.talk_month}</td>
            <td style="text-align: center;">${entry.speaker}</td>
            <td style="text-align: center;"><a href="${entry.hyperlink}" target="_blank">${entry.title}</a></td>
        </tr>`;
    });
    tableHTML += '</table>';
    return tableHTML;
}

function createTableView(entries, scriptures) {
    const uniqueEntries = {};
    entries.forEach(entry => {
        const talkId = entry.talk_id;
        if (!uniqueEntries[talkId]) {
            uniqueEntries[talkId] = { ...entry, scripturesQuoted: new Set() };
        }
        if (scriptures.includes(entry.scripture) && entry.perc_quoted >= MIN_QUOTE_PERCENTAGE) {
            uniqueEntries[talkId].scripturesQuoted.add(entry.scripture);
        }
    });

    // Convert object to array and sort by talk_id in descending order
    const sortedEntries = Object.values(uniqueEntries).sort((a, b) => b.talk_id - a.talk_id);

    let tableHTML = `<table style="width: 100%; margin: auto; border-collapse: collapse; font-size: 10pt;"><tr>
        <th style="text-align: center;">%</th>
        <th style="text-align: center;">Year</th>
        <th style="text-align: center;">Month</th>
        <th style="text-align: center;">Speaker</th>
        <th style="text-align: center;">Title</th>
    </tr>`;
    sortedEntries.forEach(entry => {
        const scripturesQuoted = entry.scripturesQuoted.size;
        const totalScriptures = scriptures.length;
        const percentQuoted = totalScriptures > 0 ? Math.round((scripturesQuoted / totalScriptures) * 100) : 0;
        tableHTML += `<tr>
            <td style="text-align: center; position: relative;">
                <div style="background-color: #F39C12; width: ${percentQuoted}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                <div style="position: relative; z-index: 1;">${percentQuoted}%</div>
            </td>
            <td style="text-align: center;">${entry.talk_year}</td>
            <td style="text-align: center;">${entry.talk_month}</td>
            <td style="text-align: center;">${entry.speaker}</td>
            <td style="text-align: center;"><a href="${entry.hyperlink}" target="_blank">${entry.title}</a></td>
        </tr>`;
    });
    tableHTML += '</table>';
    return tableHTML;
}




document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('scriptureInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            updateTable();
            event.preventDefault(); // Prevent the default action to stop submitting form
        }
    });
});