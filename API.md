# Server API

### /api/ask

This endpoint is designed to handle requests for answering text-based quiz questions, verifying user authentication, and interacting with an external service for generating answers.

#### Request

The request should be a POST request containing a JSON payload with the following fields:

```json
{
  "authToken": "An authentication token for user verification.",
  "quizTitle": "The title of the quiz associated with the request.",
  "text": "A string containing the quiz question."
}
```

- should this include `quizType`?

#### Response

The response will be a JSON object containing the following fields:

```json
{
  "id": "A unique identifier for the request session.",
  "answer": "A string containing the correct answer to the quiz question based on the external service's analysis."
}
```

#### Status Codes

- 200 OK: The request was successful and the response contains the correct answer.
- 400 Bad Request: The request contained a question that has already been answered.
- 403 Forbidden: The request was unauthorized.
- 500 Internal Server Error: There was an error processing the request due to an external service failure or other backend issue.

> Notes

- The system checks if the request limit is exceeded and prevents excessive submissions by the same user.
- Unauthorized attempts trigger alerts to a webhook with detailed user information.

> Example

For a POST request with appropriate JSON data, the response might look like this:

```json
{
  "id": "abcdef",
  "answer": "11"
}
```

### /api/image

This endpoint is designed to process images submitted by users, apply transformations, and interact with external services for image analysis and response generation.

Generally needed for:

- questions with images
- questions with math equations

#### Request

The request should be a POST request containing a JSON payload with the following fields:

```json
{
  "authToken": "An authentication token for user verification.",
  "quizTitle": "The title of the quiz associated with the request.",
  "quizType": "A string indicating the type of quiz the image is related to. This can be 'multipleChoice', 'freeResponse', or 'checkbox'.",
  "imgdata": "A string containing the base64 encoded data of the image."
}
```

- seems like `quizType` was meant to be `questionType`?

#### Response

The response will be a JSON object containing the following fields:

For `quizType` equal to `multipleChoice` or `freeResponse`:

```json
{
  "id": "A unique identifier for the request session.",
  "answer": "Will contain the processed result."
}
```

For `quizType` equal to `checkbox`:

```json
{
  "id": "A unique identifier for the request session.",
  "answer_list": "Will contain a list of processed results."
}
```

#### Status Codes

- 200 OK: The request was successful and the response contains the processed data.
- 403 Forbidden: The request was unauthorized.

> Notes

- The image is resized to 600x600 using the LANCZOS filter for standardization before processing.
- The system checks if the request limit is exceeded based on the user's past submissions.
- Unauthorized attempts and exceeding request limits trigger alerts to a webhook with detailed user information.

> Example Response for "Multiple Choice"

When the quizType is set to `multipleChoice`, the response will include the selected answer based on the image analysis. Here is an example of what the response might look like:

```json
{
  "id": "67890",
  "answer": "B"
}
```

In this example, the processed image has led to the selection of answer "B" for the multiple choice quiz. The session ID for this request is "67890".

> Example Response for "Checkbox"

For the `checkbox` quiz type, where multiple answers might be correct, the response will include a list of the correct answers. Here's what that response could look like:

```json
{
  "id": "54321",
  "answer_list": ["A", "C", "E"]
}
```

This indicates that the correct answer to the quiz question identified by the processed image is "C", and the session ID for this transaction is "12345".

### /match-terms

This endpoint is designed to process text submissions for matching terms with their descriptions, validate user authentication, and interact with an external service for generating matching responses.

#### Request

The request should be a POST request containing a JSON payload with the following fields:

```json
{
  "authToken": "An authentication token for user verification.",
  "quizTitle": "The title of the quiz associated with the request.",
  "text": "A string containing the quiz question or prompt."
}
```

#### Response

The response will be a JSON object containing the following fields:

```json
{
  "id": "A unique identifier for the request session.",
  "answer_dictionary": "A dictionary with terms as keys and their matched descriptions as values."
}
```

#### Status Codes

- 200 OK: The request was successful and the response contains the matched terms.
- 400 Bad Request: The request contained a question that has already been answered.
- 500 Internal Server Error: There was an error processing the request due to an external service failure or other backend issue.

> Notes

- The system checks if the request limit is exceeded and prevents excessive submissions by the same user.
- Unauthorized attempts trigger alerts to a webhook with detailed user information.

> Example

For a POST request with appropriate JSON data, the response might look like this:

```json
{
  "id": "123",
  "answer_dictionary": {
    "Term1": "Description A",
    "Term2": "Description B",
    "Term3": "Description C"
  }
}
```

This response indicates that the terms have been successfully matched with their descriptions, and the session ID for this request is "123".

### /validate

Feedback from the assessment (if provided answer is marked correct or incorrect).

#### Request

```json
{
  "authToken": "An authentication token for user verification.",
  "quizTitle": "The title of the quiz associated with the request.",
  "id": "A unique identifier for the request session.",
  "isCorrect": "The boolean `true` if the answer was correct, or `false` if incorrect."
}
```

- `id`: A unique id for the quiz provided by the server during calls to the other endpoints.
- `isCorrect`: A boolean set to `true` if the assessment accepted the provided answer; `false` otherwise. The assessment may not provide direct feedback or may provide potentially misleading feedback. Try to determine the answer's correctness as accurately as possible.

#### Response

No response.

---

# Notes

### Consistency Issues

- Some endpoint names lack consistency.
  - ie. `/imageDetermine` vs `/match-terms`
- Some request/response property names lack consistency.
  - ie. `authToken` and `quizTitle` vs `imgdata`
