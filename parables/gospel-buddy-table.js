document.addEventListener("DOMContentLoaded", function() {
    async function fetchJSON() {
        const response = await fetch("https://kameronyork.com/datasets/all-footnotes-apr-2024.json");
        return response.json();
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
    
        let tableHTML = `<br><br><div style="max-width: 100%; margin: auto; text-align: left;">
            <a href="https://kameronyork.com/gospel-buddy/" style="font-size: 8pt; display: flex; align-items: center; gap: 5px; text-decoration: none; color: grey;">
                <img src="https://kameronyork.com/docs/assets/gospel-buddy-icon-nobg.png" alt="Gospel Buddy Logo" style="height: 1.5em;">
                Powered by the Gospel Buddy
            </a>
        </div>
        <table border="1" style="width: 100%; margin: auto; border-collapse: collapse; table-layout: fixed;">
            <tr>
                <th style="text-align: center;">%</th>
                <th>Year</th>
                <th>Month</th>
                <th>Speaker</th>
                <th>Talk Title</th>
            </tr>`;
    
        uniqueEntriesArray.forEach(entry => {
            const titleLink = entry.hyperlink ? `<a href="${entry.hyperlink}" target="_blank">${entry.title}</a>` : entry.title;
            tableHTML += `<tr>
                <td style="text-align: center; position: relative;">
                    <div style="background-color: #F39C12; width: ${entry.perc_quoted}%; height: 100%; position: absolute; left: 0; top: 0;"></div>
                    <div style="position: relative; z-index: 1; font-size: 8pt;">${entry.perc_quoted}%</div>
                </td>
                <td style="font-size: 8pt;">${entry.talk_year}</td>
                <td style="font-size: 8pt;">${entry.talk_month}</td>
                <td style="font-size: 8pt;">${entry.speaker}</td>
                <td style="font-size: 8pt;">${titleLink}</td>
            </tr>`;
        });
    
        tableHTML += '</table><br><br><br>';
        return tableHTML;
    }


    async function displayTableForScripture(scriptures) {
        const data = await fetchJSON();
        const filteredEntries = data.filter(entry => scriptures.includes(entry.scripture));
        const tableHTML = createTableView(filteredEntries);
        document.getElementById("scripture-table-container").innerHTML = tableHTML;
    }

    // Accessing global variable for scriptures
    const scripturesToDisplay = window.scripturesList || ["Default Scripture"]; // Fallback to a default if not set
    displayTableForScripture(scripturesToDisplay);
});
