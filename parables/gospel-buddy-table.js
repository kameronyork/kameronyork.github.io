document.addEventListener("DOMContentLoaded", function() {
    const MIN_QUOTE_PERCENTAGE = 20; // Minimum percentage for a verse to be counted

    async function fetchJSON() {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth(); // Note: getMonth() returns month from 0 (January) to 11 (December)
        const currentYear = currentDate.getFullYear();

        let url;
        if (currentMonth >= 9 && currentMonth <= 11) { // October to December
            url = `https://kameronyork.com/datasets/all-footnotes-oct-${currentYear}.json`;
        } else if (currentMonth >= 3 && currentMonth <= 8) { // April to September
            url = `https://kameronyork.com/datasets/all-footnotes-apr-${currentYear}.json`;
        } else { // January to March
            url = `https://kameronyork.com/datasets/all-footnotes-oct-${currentYear - 1}.json`;
        }

        const response = await fetch(url);
        return response.json();
    }

    function createTableView(entries, matthewVerses, markVerses, lukeVerses, johnVerses) {
        const uniqueEntries = {};
        entries.forEach(entry => {
            const talkId = entry.talk_id;
            if (!uniqueEntries[talkId]) {
                uniqueEntries[talkId] = {
                    ...entry,
                    counts: {
                        Matthew: 0,
                        Mark: 0,
                        Luke: 0,
                        John: 0
                    },
                    totals: {
                        Matthew: matthewVerses.length,
                        Mark: markVerses.length,
                        Luke: lukeVerses.length,
                        John: johnVerses.length
                    }
                };
            }
            if (matthewVerses.includes(entry.scripture) && entry.perc_quoted >= MIN_QUOTE_PERCENTAGE) {
                uniqueEntries[talkId].counts.Matthew += 1;
            }
            if (markVerses.includes(entry.scripture) && entry.perc_quoted >= MIN_QUOTE_PERCENTAGE) {
                uniqueEntries[talkId].counts.Mark += 1;
            }
            if (lukeVerses.includes(entry.scripture) && entry.perc_quoted >= MIN_QUOTE_PERCENTAGE) {
                uniqueEntries[talkId].counts.Luke += 1;
            }
            if (johnVerses.includes(entry.scripture) && entry.perc_quoted >= MIN_QUOTE_PERCENTAGE) {
                uniqueEntries[talkId].counts.John += 1;
            }
        });

        const uniqueEntriesArray = Object.values(uniqueEntries);
        uniqueEntriesArray.sort((a, b) => b.talk_id - a.talk_id);

        let tableHTML = `<br><br><div style="max-width: 100%; margin: auto; text-align: left;">
            <a href="https://kameronyork.com/gospel-buddy/" style="font-size: 10pt; display: flex; align-items: center; gap: 5px; text-decoration: none; color: grey;">
                <img src="https://kameronyork.com/docs/assets/gospel-buddy-icon-nobg.png" alt="Gospel Buddy Logo" style="height: 1.8em;">
                Powered by the Gospel Buddy
            </a>
        </div>
        <table border="1" style="width: 100%; margin: auto; border-collapse: collapse; margin-top:12px;">
            <colgroup>
                <col style="width: auto;">
                <col style="width: auto;">
                <col style="width: auto;">
                <col style="width: auto;">
                <col style="width: auto;">
            </colgroup>
            <tr>
                <th style="text-align: center; font-size: 10pt;">%</th>
                <th style="text-align: center; font-size: 10pt;">Year</th>
                <th style="text-align: center; font-size: 10pt;">Month</th>
                <th style="text-align: center; font-size: 10pt;">Speaker</th>
                <th style="text-align: center; font-size: 10pt;">Title</th>
            </tr>`;

        uniqueEntriesArray.forEach(entry => {
            const maxVersion = Object.keys(entry.counts).reduce((a, b) => entry.counts[a] > entry.counts[b] ? a : b);
            const maxVersesQuoted = entry.counts[maxVersion];
            const totalVerses = entry.totals[maxVersion];
            const percentQuoted = totalVerses > 0 ? Math.round((maxVersesQuoted / totalVerses) * 100) : 0; // Check to prevent NaN
            const titleLink = entry.hyperlink ? `<a href="${entry.hyperlink}" target="_blank">${entry.title}</a>` : entry.title;
            tableHTML += `<tr>
                <td style="text-align: center; position: relative;">
                    <div style="background-color: #F39C12; width: ${percentQuoted}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                    <div style="position: relative; z-index: 1; font-size: 10pt;">${percentQuoted}%</div>
                </td>
                <td style="text-align: center; font-size: 10pt;">${entry.talk_year}</td>
                <td style="text-align: center; font-size: 10pt;">${entry.talk_month}</td>
                <td style="text-align: center; font-size: 10pt;">${entry.speaker}</td>
                <td style="text-align: center; font-size: 10pt;">${titleLink}</td>
            </tr>`;
        });

        tableHTML += '</table><small style="color:#bababa; font-size: 6pt; margin-left:15px; margin-top:3px;">% Column = (Number of verses quoted / Total verses) within the most quoted version of the parable.</small><br><br>';
        return tableHTML;
    }

    async function displayTableForScripture(matthewVerses, markVerses, lukeVerses, johnVerses) {
        const scriptures = [...matthewVerses, ...markVerses, ...lukeVerses, ...johnVerses];
        const data = await fetchJSON();
        const filteredEntries = data.filter(entry => scriptures.includes(entry.scripture));
        const tableHTML = createTableView(filteredEntries, matthewVerses, markVerses, lukeVerses, johnVerses);
        document.getElementById("scripture-table-container").innerHTML = tableHTML;
    }

    const matthewVerses = window.matthewVerses || [];
    const markVerses = window.markVerses || [];
    const lukeVerses = window.lukeVerses || [];
    const johnVerses = window.johnVerses || [];
    displayTableForScripture(matthewVerses, markVerses, lukeVerses, johnVerses);
});
