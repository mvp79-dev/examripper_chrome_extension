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

### /imageDetermine

Questions that include images (potentially for many types of questions).

> request

```json
{
  ...
  "imgdata": string,
}
```

- `imgdata`: Basically, a screenshot of the question form encoded into a [Data Url](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) via the [HTMLCanvasElement.toDataURL()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL) method. This string can be very long and may require [streaming the request](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams) (possibly using the HTTP [Multipart](https://www.w3.org/Protocols/rfc1341/7_2_Multipart.html) feature?).

> response

```json
{
  ...
}
```

---

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
