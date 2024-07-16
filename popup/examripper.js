console.log('examripper.js loaded');

const intervalSlider = /** @type{HTMLInputElement} */ (document.getElementById('action-interval-slider'));
const sliderCurrentValue = /** @type{HTMLSpanElement} */ (document.getElementById('current-value'));
const actionButton = /** @type{HTMLButtonElement} */ (document.getElementById('action-button'));

try {
  if (!(intervalSlider instanceof HTMLInputElement)) throw 'intervalSlider not HTMLInputElement';
  if (!(sliderCurrentValue instanceof HTMLSpanElement)) throw 'sliderCurrentValue not HTMLSpanElement';
  if (!(actionButton instanceof HTMLButtonElement)) throw 'startButton not HTMLButtonElement';

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.action) {
      case 'updateStatus': {
        updateButtons(message.status);
        break;
      }
    }
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, function (response) {
        updateButtons(response.status);
      });
    }
  });

  intervalSlider.addEventListener('input', updateSliderValue);

  actionButton.addEventListener('click', function () {
    if (actionButton.classList.contains('start-button')) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startHighlighting', interval: parseFloat(intervalSlider.value) * 1000 });
        }
      });
      // updateButtons();
      return;
    }
    if (actionButton.classList.contains('stop-button')) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stopHighlighting' });
        }
      });
      // updateButtons();
      return;
    }
  });

  updateSliderValue();
  updateButtons('Ready');
} catch (error) {
  console.log('Error:', error);
}

/**
 * @param {'Ready'|'Running'|'Stopping'} status
 */
async function updateButtons(status) {
  switch (status) {
    case 'Ready':
      actionButton.classList.remove('stop-button');
      actionButton.classList.add('start-button');
      actionButton.innerText = 'Start';
      break;
    case 'Stopping':
      actionButton.classList.add('stop-button');
      actionButton.classList.remove('start-button');
      actionButton.innerText = 'Stopping...';
      break;
    default: {
      actionButton.classList.add('stop-button');
      actionButton.classList.remove('start-button');
      actionButton.innerText = 'Stop';
    }
  }
}

function updateSliderValue() {
  const value = parseFloat(intervalSlider.value);
  console.log(intervalSlider.value); // No need to divide, as the range is already set correctly
  sliderCurrentValue.innerText = value.toFixed(2) + 's'; // Update to show 2 decimal points for consistency
}
