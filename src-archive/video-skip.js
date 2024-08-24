function skipVideo() {
  function httpGet(url, callback, headers = [], method = 'GET', content = null) {
    var request = new XMLHttpRequest();
    request.addEventListener('load', callback);
    request.open(method, url, true);
    if (window.__EDPUZZLE_DATA__ && window.__EDPUZZLE_DATA__.token) {
      console.log('token found');
      console.log(window.__EDPUZZLE_DATA__);
      headers.push(['authorization', window.__EDPUZZLE_DATA__.token]);
    }
    for (const header of headers) {
      request.setRequestHeader(header[0], header[1]);
    }
    request.send(content);
  }

  function getCSRF(callback) {
    var csrfURL = 'https://edpuzzle.com/api/v3/csrf';
    httpGet(csrfURL, function () {
      var data = JSON.parse(this.responseText);
      var csrf = data.CSRFToken;
      console.log('Got CSRF token: ' + csrf);
      callback(csrf);
    });
  }

  function getAssignment(csrf, callback) {
    var assignment_id = window.location.href.split('/')[4];
    var url = 'https://edpuzzle.com/api/v3/assignments/' + assignment_id + '/attempt';
    httpGet(url, function () {
      var data = JSON.parse(this.responseText);
      console.log('Got assignment data: ' + JSON.stringify(data, null, 2));
      callback(csrf, data);
    });
  }

  function postAttempt(csrf, data) {
    var id = data._id;
    var teacher_assignment_id = data.teacherAssignmentId;
    var referrer = 'https://edpuzzle.com/assignments/' + teacher_assignment_id + '/watch';
    var url = 'https://edpuzzle.com/api/v4/media_attempts/' + id + '/watch';
    console.log(window.__EDPUZZLE_DATA__);
    var content = { timeIntervalNumber: 10 };
    var headers = [
      ['accept', 'application/json, text/plain, */*'],
      ['accept_language', 'en-US,en;q=0.9'],
      ['content-type', 'application/json'],
      ['x-csrf-token', csrf],
      ['x-edpuzzle-referrer', referrer],
      ['x-edpuzzle-web-version', window.__EDPUZZLE_DATA__.version],
    ];

    httpGet(
      url,
      function () {
        console.log('Video skipped successfully. Response: ' + this.responseText);
        location.reload();
      },
      headers,
      'POST',
      JSON.stringify(content),
    );
  }

  getCSRF(function (csrf) {
    console.log('Fetching assignment data...');
    getAssignment(csrf, function (csrf, data) {
      console.log('Posting watch attempt...');
      postAttempt(csrf, data);
    });
  });
}
