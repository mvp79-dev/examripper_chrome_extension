export const styles = `
  /* Custom properties */
/* :root {
  --dark-bg: #282A36;
  --light-bg: #2b292e;
  --accent: #66bd77;
  --text: #F8F8F2;
} */

/* Global styles */
/* body {
  background-color: var(--dark-bg);
  color: var(--text);
  font-family: 'Poppins', sans-serif;
  font-size: 1.125rem;
} */

.container {
  color: #F8F8F2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Main content area */
.main-content {

  background-color: #282A36;
  border-radius: 0.75rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  padding: 2rem;
  max-width: 42rem;
  margin: 0 auto;
}

/* Logo */
.logo {
  height: 5rem;
  margin: 0 auto 1.5rem;
  display: block;
  border-radius: 9999px;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
}

/* Headings */
h1 {
  font-size: 1.875rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

/* Paragraphs */
p {
  color: #9CA3AF;
  margin-bottom: 2rem;
}

/* Buttons */
.btn {
  background-color: var(--accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s;
  display: inline-block;
  cursor: pointer;
}

.btn:hover {
  background-color: #4CAF50;
}

.btn-full {
  display: block;
  width: 100%;
  text-align: center;
}

#start-button {
  background-color: #66bd77;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  width: 100%;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

#start-button:hover {
  background-color: #4CAF50;
  transform: translateY(-2px);
}

#start-button:disabled {
  background-color: #4B5563;
  cursor: not-allowed;
}

#pause-resume-button {
  background-color: #F1FA8C;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  width: 100%;
  text-align: center;
  cursor: pointer;
  margin-top: 1rem;
}

#pause-button:hover {
  background-color: #E6E600;
}

#stop-button {
  background-color: #FF5555;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  width: 100%;
  text-align: center;
  cursor: pointer;
  margin-top: 1rem;
}

#stop-button:hover {
  background-color: #FF0000;
}

#skip-break-button {
  background-color: #BD93F9;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  width: 100%;
  text-align: center;
  cursor: pointer;
  margin-top: 1rem;
}

#skip-break-button:hover {
  background-color: #9A5BFF;
}

.tooltiptext {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

#break-button {
  background-color: #8BE9FD;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  width: 100%;
  text-align: center;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-yellow:hover {
  background-color: #E6E600;
}

.btn-red {
  background-color: #FF5555;
}

.btn-red:hover {
  background-color: #FF0000;
}

.btn-purple {
  background-color: #BD93F9;
}

.btn-purple:hover {
  background-color: #9A5BFF;
}

/* File upload area */
.upload-area {
  background-color: var(--dark-bg);
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: transform 0.3s;
}

.upload-area:hover {
  transform: translateY(-0.25rem);
}

.drag-drop-area {
  background-color: #2b292e;
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

/* Form elements */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  color: #9CA3AF;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--light-bg);
  color: #E5E7EB;
}

.form-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent);
}

/* Range input styling */
input[type="range"] {
  width: 100%;
  background-color: #4B5563;
  border-radius: 9999px;
  height: 0.5rem;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
}

/* Utility classes */
.hidden {
  display: none;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mt-8 {
  margin-top: 2rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.ml-4 {
  margin-left: 1rem;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

/* Animations */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animate-pulse {
  animation: pulse 2s infinite;
}

/* Tooltip */
.tooltip {
  position: relative;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 120px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px 0;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -60px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}

#change-file-button {
  background-color: #66bd77;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s;
  margin-left: 1rem;
}

#change-file-button:hover {
  background-color: #4CAF50;
}

#upload-file-box {
  background-color: #282A36;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  padding: 1.5rem;
  transition: transform 0.3s ease;
}

#upload-file-box:hover {
  transform: translateY(-0.25rem);
}

#settings-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

#typing-speed-slider {
  width: 100%;
  appearance: none;
  background-color: #4B5563; /* bg-gray-700 */
  border-radius: 0.5rem; /* rounded-lg */
  height: 0.5rem; /* h-2 */
}

#typing-speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 1rem;
  height: 1rem;
  background-color: #66bd77; /* Green color */
  border-radius: 50%;
  cursor: pointer;
}

#typing-speed-slider::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background-color: #66bd77; /* Green color */
  border-radius: 50%;
  cursor: pointer;
}

#typing-speed-slider:focus {
  outline: none;
  box-shadow: 0 0 0 2px #66bd77; /* focus:ring-2 focus:ring-accent */
}

#advanced-settings-button {
  background-color: #66bd77;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 5px 5px 10px #1e1e24, -5px -5px 10px #38363e;
  transition: background-color 0.3s, transform 0.3s;
  margin-bottom: 1rem;
}

#advanced-settings-button:hover {
  background-color: #4CAF50;
  transform: translateY(-2px);
}

#form-labels {
  display: block;
  color: #9CA3AF; /* text-gray-400 */
  margin-bottom: 0.5rem; /* mb-2 */
}

#label-inputs {
  width: 100%;
  padding: 0.5rem;
  background-color: var(--light-bg);
  color: #E5E7EB;
  transition: all 0.3s ease;
  margin-bottom: 0.5rem; /* mb-2 */
  border-radius: 0.5rem;
}

#label-inputs:focus {
  outline: none;
  box-shadow: 0 0 0 2px #66bd77;
}

#iconn {
  margin-right: 0.5rem;
}
`;