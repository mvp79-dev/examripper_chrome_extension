// get element by id "welcome" set inner text to Welcome, ${name} where name is chrome local storage get "name"
console.log('Getting name from local storage...');
chrome.storage.local.get(['name'], function (result) {
  const name = result.name;
  document.getElementById('welcome').innerText = `Welcome, ${name}`;
});

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const currentUrl = tabs[0].url;
  console.log('Current URL: ' + currentUrl);
});
