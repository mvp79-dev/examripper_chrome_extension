console.log('examripper.js loaded');

const intervalSlider = /** @type{HTMLInputElement} */ (document.getElementById('action-interval-slider'));
const sliderCurrentValue = /** @type{HTMLSpanElement} */ (document.getElementById('current-value'));
const actionButton = /** @type{HTMLButtonElement} */ (document.getElementById('start-button'));
const quizTitle = /** @type{HTMLSpanElement} */ (document.getElementById('quiz-title'));

class ProgressController {
  constructor(totalSteps) {
      this.totalSteps = totalSteps;
      this.currentStep = 0;
      this.startButton = document.getElementById('start-button');
      this.progressBar = document.getElementById('progress-bar');
      this.buttonText = document.getElementById('button-text');
      this.stopButton = document.querySelector('.stop-button');
  }

  startSolving() {
      this.startButton.classList.add('solving-button');
      this.buttonText.innerHTML = 'Solving...';
      this.stopButton.style.display = 'block';
      this.updateProgressBar();
  }

  incrementStep() {
      if (this.currentStep < this.totalSteps) {
          this.currentStep++;
          this.updateProgressBar();
          if (this.currentStep === this.totalSteps) {
              this.markAsSolved();
          }
      }
  }

  setStep(stepNumber) {
      if (stepNumber >= 0 && stepNumber <= this.totalSteps) {
          this.currentStep = stepNumber;
          this.updateProgressBar();
          if (this.currentStep === this.totalSteps) {
              this.markAsSolved();
          } else {
              this.startButton.classList.remove('solved-button');
              this.startButton.classList.add('solving-button');
              this.buttonText.innerHTML = 'Solving...';
              this.stopButton.style.display = 'block';
          }
      } else {
          console.error('Invalid step number');
      }
  }

  markAsSolved() {
      this.startButton.classList.remove('solving-button');
      this.startButton.classList.add('solved-button');
      this.buttonText.innerHTML = '<i class="fas fa-check icon"></i> Solved';
      this.progressBar.style.width = '100%';
      this.stopButton.style.display = 'none';
  }

  updateProgressBar() {
      const progress = (this.currentStep / this.totalSteps) * 100;
      this.progressBar.style.width = `${progress}%`;
  }
}

function setQuizName() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getQuizTitle' }, function (response) {
        if (response && response.quiz_title) {
          console.log('Quiz Title:', response.quiz_title);
          const quizName = response.quiz_title;
          quizTitle.innerText = quizName;
        } else {
          console.log('Failed to get quiz title');
        }
      });
    }
  });
}

function getTotalQuestions() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getTotalQuestions' }, function (response) {
        if (response && response.total_questions) {
          console.log('Total Questions:', response.total_questions);
          return response.total_questions;
        } else {
          console.log('Failed to get total questions');
        }
      });
    }
  });
}



try {
  if (!(intervalSlider instanceof HTMLInputElement)) throw 'intervalSlider not HTMLInputElement';
  if (!(sliderCurrentValue instanceof HTMLSpanElement)) throw 'sliderCurrentValue not HTMLSpanElement';
  if (!(actionButton instanceof HTMLButtonElement)) throw 'startButton not HTMLButtonElement';
  let progress;

  chrome.runtime.onMessage.addListener((message) => {
    console.log('onMessage:', message);
    switch (message.action) {
      case 'updateStatus': {
        updateButtons(message.status);
        break;
      }
      
    }
  });
  setQuizName();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      console.log('chrome.tabs.sendMessage, getStatus');
      chrome.tabs.sendMessage(tabs[0]?.id, { action: 'getStatus' }, function (response) {
        console.log('getStatus response:', response);
        const error = chrome.runtime.lastError;
        if (error) console.log('chrome.runtime.lastError', error);
        else updateButtons(response.status);
      });
    }
  });

  intervalSlider.addEventListener('input', updateSliderValue);

  actionButton.addEventListener('click', function () {
    if (actionButton.classList.contains('start-button')) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          console.log('chrome.tabs.sendMessage, startHighlighting');
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startHighlighting', interval: parseFloat(intervalSlider.value) * 1000 }, function () {
            const error = chrome.runtime.lastError;
            if (error) console.log('chrome.runtime.lastError', error);
          });
        }
      });
      return;
    }
    if (actionButton.classList.contains('stop-button')) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          console.log('chrome.tabs.sendMessage, stopHighlighting');
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stopHighlighting' }, function () {
            const error = chrome.runtime.lastError;
            if (error) console.log('chrome.runtime.lastError', error);
          });
        }
      });
      return;
    }
  });

  updateSliderValue();
  
} catch (error) {
  console.log('Error:', error);
}



/**
 * @param {'Ready'|'Start'|'Incriment'|'Stop'} status
 * @param {ProgressController} controller
 * @param {number} steps
 * @param {number} currentStep
 */

async function updateButtons(status, controller, steps=0, currentStep=0) {
  console.log('updateButtons:', status);
  switch (status) {
    case 'Ready':
      controller = new ProgressController(steps);
      return controller;
    case 'Stop':
      controller.markAsSolved();
      
      break;
    case "Start": {
      controller = new ProgressController(steps);
      controller.startSolving
    }
    case 'Incriment':
      progress.incrementStep();
      break;
  }
}

function updateSliderValue() {
  const value = parseFloat(intervalSlider.value);
  sliderCurrentValue.innerText = value.toFixed(2) + 's'; // Update to show 2 decimal points for consistency
}






// To set directly to a specific step
// When the last step is incremented, it automatically marks as solved.