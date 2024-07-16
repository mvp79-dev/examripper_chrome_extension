console.log('hello');

const buttons = document.querySelectorAll('button');

// Add event listeners to buttons with "start" in their inner text
buttons.forEach((button) => {
  if (button.innerText.toLowerCase().includes('start')) {
    button.addEventListener('click', function () {
      if (button.classList.contains('start-button')) {
        console.log('start');
        button.classList.remove('start-button');
        button.classList.add('stop-button');
        button.innerText = 'Stop';
        const interval = document.getElementById('current-value').innerText;

        // Send message to extension to start highlighting
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startHighlighting', interval: parseFloat(interval) * 1000 });
        });
      } else if (button.classList.contains('stop-button')) {
        console.log('stop');
        button.classList.remove('stop-button');
        button.classList.add('start-button');
        button.innerText = 'Start';

        // Send message to extension to stop highlighting
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stopHighlighting' });
        });
      }
    });
  }
});

const slider = document.getElementById('action-interval-slider');
const currentValue = document.getElementById('current-value');

function updateSliderValue() {
  const value = parseFloat(slider.value);
  console.log(slider.value); // No need to divide, as the range is already set correctly
  currentValue.innerText = value.toFixed(2) + 's'; // Update to show 2 decimal points for consistency
}

slider.addEventListener('input', updateSliderValue);
updateSliderValue(); // Update on initial load
