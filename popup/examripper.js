console.log('examripper.js loaded');

const intervalSlider = /** @type{HTMLInputElement} */ (document.getElementById('action-interval-slider'));
const sliderCurrentValue = /** @type{HTMLSpanElement} */ (document.getElementById('current-value'));
const actionButton = /** @type{HTMLButtonElement} */ (document.getElementById('start-button'));
const quizTitle = /** @type{HTMLSpanElement} */ (document.getElementById('quiz-title'));
const stopbutton = /** @type{HTMLSpanElement} */ (document.getElementById('stop-button'));
const subjectRadios = document.querySelectorAll('input[name="subject"]');

function getSelectedSubject() {
  for (const radio of subjectRadios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null; // Return null if no radio is selected
}



class ProgressController {
  constructor() {
    this.totalSteps = 0;
    this.currentStep = 0;
    this.isSolving = false;  // Boolean to track whether it is currently solving
    this.startButton = document.getElementById('start-button');
    this.progressBar = document.getElementById('progress-bar');
    this.buttonText = document.getElementById('button-text');
    this.stopButton = document.querySelector('.stop-button');
    this.errorMessage = document.getElementById('error-message'); // New property for error message element
    this.errorText = document.getElementById('error-text'); // New property for error text element
    this.errorLink = document.getElementById('error-link'); // New property for error link element

}

  startSolving(step = 0) {
      this.currentStep = step;
      this.isSolving = true;
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

  markAsSolved() {
      this.startButton.classList.remove('solving-button');
      this.startButton.classList.add('solved-button');
      this.buttonText.innerHTML = '<i class="fas fa-check icon"></i> Solved';
      this.progressBar.style.width = '100%';
      this.stopButton.style.display = 'none';
      this.isSolving = false;
  }

  updateProgressBar() {
      const progress = (this.currentStep / this.totalSteps) * 100;
      this.progressBar.style.width = `${progress}%`;
  }

  stopSolving() {
      this.currentStep = 0;
      this.isSolving = false;
      this.startButton.classList.remove('solving-button', 'solved-button');
      this.buttonText.innerHTML = 'Start';
      this.progressBar.style.width = '0%';
      this.stopButton.style.display = 'none';
      this.errorMessage = document.getElementById('error-message'); // New property for error message element

  }
  /**
   * 
   * @param {number} steps 
   */
  setTotalSteps(steps) {
    this.totalSteps = steps;
  }

  // Method to check if it is currently solving
  isCurrentlySolving() {
      return this.isSolving;
  }
  displayError(message, link) {
    this.errorText.textContent = "Error occured! " + message + " . Please click here to report the issue.";
    this.errorLink.href = link;
    this.errorMessage.style.display = 'block';
  }

  // New method to hide error message
  hideError() {
    this.errorMessage.style.display = 'none';
  }
  
}



let progress = new ProgressController();




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
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTotalQuestions' }, function (response) {
          if (response && response.total_questions) {
            console.log('Total Questions:', response.total_questions);
            resolve(parseInt(response.total_questions));
          } else {
            console.log('Failed to get total questions');
            reject('Failed to get total questions');
          }
        });
      }
    });
  });
}

function getCurrentQuestion() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentQuestion' }, function (response) {
          if (response && response.current_question) {
            console.log('Current Question:', response.current_question);
            resolve(response.current_question);
          } else {
            console.log('Failed to get current question');
            reject('Failed to get current question');
          }
        });
      }
    });
  });
}



try {
  if (!(intervalSlider instanceof HTMLInputElement)) throw 'intervalSlider not HTMLInputElement';
  if (!(sliderCurrentValue instanceof HTMLSpanElement)) throw 'sliderCurrentValue not HTMLSpanElement';
  if (!(actionButton instanceof HTMLButtonElement)) throw 'startButton not HTMLButtonElement';
  
  

  chrome.runtime.onMessage.addListener((message) => {
    console.log('onMessage:', message);
    switch (message.action) {
      case 'updateStatus': {
        console.log('updateStatus:', message.status);
        const step = message.step;
        console.log(step)
        updateButtons(message.status, step);
        break;
      } 
      case 'error': {
        console.log('Error:', message.error);
        if (message.error.includes('token')) {
          progress.displayError('Your token is invalid. Please click here to relogin.', 'https://examripper-288287396080.herokuapp.com/auth/start-auth');
          break;
        }
        else {
          progress.displayError(message.error, "https://discord.gg/examripper");
          break;
        }
        
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
    console.log(getSelectedSubject());
    if (!progress.isCurrentlySolving()) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]?.id) {
          const brainlyCheckbox = document.getElementById('use-brainly');
          console.log('chrome.tabs.sendMessage, startHighlighting');
          console.log(brainlyCheckbox.checked);
          chrome.tabs.sendMessage(tabs[0].id, { action: 'startHighlighting', interval: parseFloat(intervalSlider.value) * 1000, subject: getSelectedSubject(), brainly: brainlyCheckbox.checked }, function () {
            const error = chrome.runtime.lastError;
            if (error) console.log('chrome.runtime.lastError', error);
          });
        }
      });
      return;
    }
    else  {
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
  stopbutton.addEventListener('click', function () {
    console.log("stop button clicked");
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
  });

  updateSliderValue();
  
} catch (error) {
  console.log('Error:', error);
}



/**
 * @param {'Ready'|'Running'|'Increment'|'Stopping'} status
 * @param {number} currentStep
 */

async function updateButtons(status, currentStep=0) {
  console.log('updateButtons:', status);
  switch (status) {
    case 'Ready':
      console.log('Ready');
      try {
        const totalQuestions = await getTotalQuestions();
        console.log('Total Questions Received:', totalQuestions);
        progress.setTotalSteps(totalQuestions);
      } catch (error) {
        console.error('Error getting total questions:', error);
      }
      break;

    case 'Stopping':
      console.log('Stopping');
      progress.stopSolving();    
      break;

    
    case "Running": {
      console.log('Running: we are in the switch function and it detected running');
      try {
        const currentQuestion = await getCurrentQuestion();
        console.log('Current Question Received:', currentQuestion);
        progress.startSolving(currentQuestion);
      } catch (error) {
        console.error('Error getting current question:', error);
      }
      break;
    }
    case 'Increment':
      console.log("Incrementing we are in the switch function and it dtected increment"); 
      progress.incrementStep();
      break;
    

  }
}


function updateSliderValue() {
  const value = parseFloat(intervalSlider.value);
  sliderCurrentValue.innerText = value.toFixed(2) + 's'; // Update to show 2 decimal points for consistency
}



