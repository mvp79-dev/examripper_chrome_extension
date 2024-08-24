(function () {
  function log(...args) {
    console.log('sendAnswer.js', ...args);
  }
  function error(...args) {
    console.error('sendAnswer.js', ...args);
  }
  log('sendAnswer.js');

  // log('Received message: ', message);
  // log('Received message: ', message);
  // log('Received message: ', message);

  getAssignment((questions) => {
    let answersMap = parseQuestions(questions);
    log(answersMap);
    let answer = answersMap.get(message.question);
    log(answer);
    if (answer) {
      sendResponse({ answer: answer });
    } else {
      sendResponse({ error: 'No answer found for the given question.' });
    }
  });

  function getAssignment(callback) {
    log('getAssignment');

    var assignment_id = window.location.href.split('/')[4];
    if (typeof assignment_id === 'undefined') {
      error('Error: Could not infer the assignment ID. Are you on the correct URL?');
      return;
    }
    var url1 = 'https://edpuzzle.com/api/v3/assignments/' + assignment_id;

    fetch(url1)
      .then((response) => {
        if (!response.ok) {
          error(`Error: Status code ${response.status} received when attempting to fetch the assignment data.`);
        } else return response.json();
      })
      .then((assignment) => {
        getMedia(assignment, callback);
      });
  }

  function getMedia(assignment, callback) {
    log('getMedia');
    log('assignment:', assignment);

    var media_id = assignment.teacherAssignments[0].contentId;
    var url2 = `https://edpuzzle.com/api/v3/media/${media_id}`;

    fetch(url2, { credentials: 'omit' })
      .then((response) => {
        if (!response.ok) {
          error(`Error: Status code ${response.status} received when attempting to fetch the answers.`);
        } else return response.json();
      })
      .then((media) => {
        callback(media.questions);
      });
  }

  function parseQuestions(questions) {
    log('parseQuestions');
    log('questions:', questions);

    let answersMap = new Map();

    if (questions == null) {
      error('Error: Could not get the media for this assignment.');
      return;
    }

    questions.sort((a, b) => a.time - b.time);

    for (let question of questions) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(question.body[0].html, 'text/html');
      let questionText = doc.body.innerText; // The question text as key

      if (typeof question.choices != 'undefined') {
        question.choices.forEach((choice) => {
          if (choice.isCorrect) {
            answersMap.set(questionText, choice.body[0].text || choice.body[0].html);
          }
        });
      }
    }

    return answersMap;
  }
})();
