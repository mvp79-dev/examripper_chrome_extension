console.log('popup.js loaded');

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get(['donor_status'], function (result) {
    let donorStatus = result.donor_status;
    console.log('Donor status: ' + donorStatus);
    if (donorStatus === undefined) {
      // If donor_status field does not exist, serve start.html
      loadPage('start.html');
    } else if (donorStatus === true) {
      // If donor_status is true, check the current tab's URL
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        let currentUrl = tabs[0].url;
        console.log('Current URL: ' + currentUrl);
        if (currentUrl.startsWith('https://course.apexlearning.com/') && currentUrl.endsWith('assessment')) {
          console.log('rendering exam ripper');
          console.log(currentUrl);
          // If on the assessment page, send them to examripper.html
          loadPage('examripper.html');
        } else {
          console.log('rendering loggedInSub.html');
          console.log(currentUrl);
          // If not on the assessment page, send them to loggedInSub.html
          loadPage('loggedInSub.html');
        }
      });
    } else {
      // If donor_status is false, send them to loggedInNoSub.html
      loadPage('loggedInNoSub.html');
    }
  });
});

function loadPage(page) {
  console.log('Loading ' + page);
  fetch(page)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then((html) => {
      document.documentElement.innerHTML = html;
      executeScripts();
    })
    .catch((error) => console.error('Error loading page:', error));
}

function executeScripts() {
  const scripts = document.querySelectorAll('script[src]');
  const loadedScripts = new Set(); // Set to store loaded script URLs

  scripts.forEach((script) => {
    const src = script.src;
    if (!loadedScripts.has(src)) {
      // Check if the script has already been loaded
      const newScript = document.createElement('script');
      newScript.src = src;
      document.head.appendChild(newScript);
      loadedScripts.add(src); // Add the script URL to the set
    }
  });
}
