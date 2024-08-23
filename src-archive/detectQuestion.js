(function () {
  function log(...args) {
    console.log('detectQuestions.js', ...args);
  }
  log('detectQuestions.js');

  // Select the node that will be observed for mutations
  const targetNode = document.body;

  // Options for the observer (which mutations to observe)
  const config = { attributes: true, childList: true, subtree: true };

  // Example of sending a message
  // Example of sending a message
  chrome.runtime.sendMessage({ greeting: 'hello' }, (response) => {
    log('sendMessage');
    log('response:', response);
    log(response.farewell); // Logs "goodbye" to the console.
  });

  // Callback function to execute when mutations are observed
  const callback = function (mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (let node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.innerText.includes('MULTIPLE CHOICE QUESTION')) {
              log('New Question Found');
              log(node.querySelector('p')?.innerText);
              // This script sends a message
              chrome.runtime
                .sendMessage({
                  type: 'getAnswer', //
                  question: node.querySelector('p')?.innerText,
                })
                .then((response) => log('Received response:', response));
            } // FIX SENDING MESSAGES BETWEEN DETECT AND SEND ANSWER
          }
        }
      }
    }
  };

  // Create an instance of MutationObserver
  setTimeout(() => {
    log('setTimeout');
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  }, 2000);

  // Later, you can stop observing
  // observer.disconnect();
})();
