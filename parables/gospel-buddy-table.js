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
    
        let tableHTML = `<br><br><div style="max-width: 800px; margin: auto; text-align: left;">
            <a href="https://kameronyork.com/gospel-buddy/" style="font-size: 10pt; display: flex; align-items: center; gap: 10px; text-decoration: none; color: grey;">
                <img src="https://kameronyork.com/docs/assets/gospel-buddy-icon-nobg.png" alt="Gospel Buddy Logo" style="height: 2em;">
                Powered by the Gospel Buddy
            </a>
        </div>
        <table border="1" style="width: 100%; max-width: 800px; margin: auto; border-collapse: collapse; margin-top:12px">
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
                    <div style="position: relative; z-index: 1;">${entry.perc_quoted}%</div>
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


    async function displayTableForScripture(scriptures) {
        const data = await fetchJSON();
        const filteredEntries = data.filter(entry => scriptures.includes(entry.scripture));
        const tableHTML = createTableView(filteredEntries);
        document.getElementById("scripture-table-container").innerHTML = tableHTML;
    }

    // Define the scriptures here (array of desired scriptures)
    const scripturesToDisplay = ["Alma 10:11", "Alma 10:12"]; // Change this to your desired scriptures
    displayTableForScripture(scripturesToDisplay);
});