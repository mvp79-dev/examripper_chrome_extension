### More Detailed Status Indicator

- ideally, would like to show individual processing steps, possibly with timer
- almost ready

---

### Resume on New Page Load

- for multipage assessments, restart process when a _new page_ is loaded
- don't restart on _page refresh_

<br>
<br>
<br>

# Finished

### Support for "Drag and Drop" Questions

> Add drag and drop support (Attached above)

- need to add new code

---

### Support for "Answer Here" Questions

> Add input box support ( attached above)

- `data-placeholder="Answer here"`

### On Incorrect Answer, Send Correct Answer to Server

> After question is done, if it hasnt moved onto a new question, send another request back to my endpoint with a bool if it got the answer correct or not (correct answer attached above)

- assume that the Next button means the question is correct, otherwise incorrect

---

### Interval Bug

> Fix the interval bug where it keeps on repeating asking the question multiple times ( if you go to log you see the function runs over and over)

---

### Send Quiz Title

> Add a field for the quiz its on in the request (inner text trimmed of body > kp-app > kp-platform > kp-app-shell > kp-nav-header > div.toolbar.ng-star-inserted > kp-content-lane > div. you can also see this at the top of any of the of the quizes i showed you)

- to the extension's api server

---

### Better Popup Management

> Better way of managing popups

- referring to extension main popup
- is this part of 6?

---

### Status Indicator in Popup

> right now clicking start just changes the css property to the stop button, and vice versa, would it be possible when the popup is rendered for the the button to be rendered of what the state of the loop is
>
> for example if the interval is running and you close out of the popup and open it again would it be possible to just store the runinng status as a local storage variable so it would say "STOP" when you open it
