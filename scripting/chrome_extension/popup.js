// popup.js

// Function to display quotes in the popup
function displayQuotes(quoteList) {
  const quoteListDiv = document.getElementById("quote-list");
  quoteListDiv.innerHTML = `<ul>${quoteList}</ul>`;
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "displayQuotes") {
    // Call the function to display quotes in the popup
    displayQuotes(message.quoteList);
  }
});
