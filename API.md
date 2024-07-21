# Server API

### /

The expected properties on every **request** and **_response_** object.

> request

```json
{
  "authToken": string,
  "quizTitle": string,
}
```

- `authToken`: Received from the server during the login auth flow.
- `quizTitle`: Every assessment should have a quiz title/name at the top.

> response

```json
{
  "id": string,
}
```

- `id`: A unique id for the quiz to be used with the `/validate` endpoint.

---

### /api/ask

Text-only questions (ie. multiple choice and short answer).

> request

```json
{
  ...
  "text": string,
}
```

- `text`: The entire prompt for the current question form. Includes the question title/name, the question itself, and the available answer choices if any.

> response

```json
{
  "answer": string,
}
```

- `answer`: The text for the answer.

---

### /api/image

This endpoint is designed to process images submitted by users, apply transformations, and interact with external services for image analysis and response generation.

Request

The request should be a POST request containing a JSON payload with the following fields:

	•	imgdata: A string containing the base64 encoded data of the image.
	•	authToken: An authentication token for user verification.
	•	quizType: A string indicating the type of quiz the image is related to. This can be “multipleChoice”, “freeResponse”, or “checkbox”.

Response

The response will be a JSON object containing the following fields:

	•	Depending on the quiz type specified in the request:
	•	For “multipleChoice” and “freeResponse”, the field answer will contain the processed result.
	•	For “checkbox”, the field answer_list will contain a list of processed results.
	•	id: A unique identifier for the request session.

Status Codes

	•	200 OK: The request was successful and the response contains the processed data.
	•	403 Forbidden: The request was unauthorized. This occurs if the user’s email is not listed in the subscribers.

Notes

	•	The image is resized to 600x600 using the LANCZOS filter for standardization before processing.
	•	The system checks if the request limit is exceeded based on the user’s past submissions.
	•	Unauthorized attempts and exceeding request limits trigger alerts to a webhook with detailed user information.



Example Response for “Multiple Choice”

When the quizType is set to “multipleChoice”, the response will include the selected answer based on the image analysis. Here is an example of what the response might look like:

```json
{
“answer”: “B”,
“id”: “67890”
}
```

In this example, the processed image has led to the selection of answer “B” for the multiple choice quiz. The session ID for this request is “67890”.

Example Response for “Checkbox”

For the “checkbox” quiz type, where multiple answers might be correct, the response will include a list of the correct answers. Here’s what that response could look like:

```json
{
“answer_list”: [“A”, “C”, “E”],
“id”: “54321”
}
```


This indicates that the correct answer to the quiz question identified by the processed image is “C”, and the session ID for this transaction is “12345”.


### /match-terms

Drag and drop questions (ie. match a term with its definition).

> request

```json
{
 ...
 string: string, ...
}
```

- As of this moment, terms and their definitions are provided as `key:value` pairs directly in the request object.

> ⚠️ **todo**
>
> Should `key:value` pairs have a dedicated property container?

> response

```json
{
  "answer_dictionary": {
    string: string, ...
  }
}
```

- `answer_dictionary`: An object containing `key:value` pairs for matching.

---

### /???checkboxes???

Multiple selection questions via checkboxes (do not confuse with multiple choice).

> request

```json
{
  ...
  ???
}
```

- Expected data is unknown at the moment.

> ⚠️ **todo**
>
> Are the answer choices being uploaded as a list?  
> What is the property key?

> response

```json
{
 "answer_list": string[]
}
```

- `answer_list`: An array of texts for all answers that should be marked/selected.

---

### /validate

Feedback from the assessment (if provided answer is marked correct or incorrect).

> request

```json
{
 ...
 "id": string,
 "isCorrect": boolean,
}
```

- `id`: A unique id for the quiz provided by the server during calls to the other endpoints.
- `isCorrect`: A boolean set to `true` if the assessment accepted the provided answer; `false` otherwise. The assessment may not provide direct feedback or may provide potentially misleading feedback. Try to determine the answer's correctness as accurately as possible.

> response

no response

---

# Notes

### Consistency Issues

- Some endpoint names lack consistency.
  - ie. `/imageDetermine` vs `/match-terms`
- Some request/response property names lack consistency.
  - ie. `authToken` and `quizTitle` vs `imgdata`
