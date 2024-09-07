export const styles = `
  .App {
    font-family: 'Poppins', sans-serif;
    background-color: #1d1c1cff;
    color: #a99dfaff;
    text-align: center;
    margin: 0;
    padding: 10px;
    font-size: 16px;
  }
  .container {
    margin: auto;
    padding: 20px;
    background-color: #2b292eff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    width: 90%;
    min-width: 350px;
    position: relative;
    overflow: hidden;
  }
  .container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, #7d7898ff, #a99dfaff);
    animation: gradient 10s ease infinite;
    z-index: -1;
  }
  @keyframes gradient {
    0% { transform: translate(0%, 0%); }
    50% { transform: translate(50%, 50%); }
    100% { transform: translate(0%, 0%); }
  }
  .logo {
    height: 40px;
    width: 40px;
    margin: 10px auto;
    display: block;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  h1, p, label {
    font-weight: 600;
    margin: 10px 0;
    color: #a99dfaff;
  }
  .status-message {
    color: #7d7898ff;
    margin-bottom: 15px;
  }
  .slider-container {
    margin: 5px auto;
    position: relative;
    width: 90%;
  }
  .tooltip {
    position: absolute;
    right: 0px;
    top: 3px;
    font-size: 16px;
  }
  input[type='range'] {
    width: 100%;
    height: 8px;
    border-radius: 5px;
    background: #7d7898ff;
    outline: none;
    appearance: none;
    transition: background 0.3s;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #a99dfaff;
    cursor: pointer;
    transition: transform 0.3s;
  }
  input[type='range']::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  .start-button {
    position: relative;
    background-color: #66bd77;
    border: none;
    padding: 15px 20px;
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
    display: block;
    margin: 20px auto;
    color: #f8f8f2;
    transition: background-color 0.3s, transform 0.3s;
    overflow: hidden;
  }
  .start-button:hover {
    background-color: #56a365;
    transform: translateY(-2px);
  }
  #progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 4px;
    background-color: #f8f8f2;
    transition: width 0.3s;
  }
  .start-button.solving-button {
    background-color: #fca414;
  }
  .start-button.solved-button {
    background-color: #a9a9a9;
    cursor: not-allowed;
  }
  .stop-button {
    background-color: #ef7064;
    color: #ffffff;
    border: none;
    border-radius: 10%;
    cursor: pointer;
    transition: background-color 0.3s;
    display: none;
    padding: 15px 20px;
    font-size: 20px;
    border-radius: 8px;
    margin: 20px auto;
    animation: popIn 0.5s ease-in-out;
  }
  .stop-button:hover {
    background-color: #e55c51;
  }
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    80% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .error-message {
    background-color: #ff4d4d;
    color: #f8f8f2;
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 5px;
    display: none;
    text-align: center;
    font-weight: bold;
    animation: fadeIn 0.5s ease-in-out;
  }
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  
  a {
    font-weight: 500;
    color: #646cff;
    text-decoration: inherit;
  }
  a:hover {
    color: #535bf2;
  }
  
  h1 {
    font-size: 3.2em;
    line-height: 1.1;
  }

  
  .stop-button {
    background-color: #ff4d4d;
    border: none;
    padding: 15px 20px;
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
    color: #F8F8F2;
    display: block;
    margin: 20px auto;
    position: relative;
    overflow: hidden;
    width: 150px;
  }
  
  .pause-resume-button {
    background-color: #FFB86C;
    border: none;
    padding: 15px 20px;
    font-size: 18px;
    cursor: pointer;
    border-radius: 8px;
    color: #F8F8F2;
    display: block;
    margin: 20px auto;
    position: relative;
    overflow: hidden;
    width: 150px;
  }
  
  .start-button:hover {
    background-color: #56a365;
    transform: translateY(-2px);
  }
  
  .stop-button:hover {
    background-color: #ce3939;
    transform: translateY(-2px);
  }
  
  .pause-button:hover {
    background-color: #56a365;
    transform: translateY(-2px);
  }
  
  #progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0%;
    height: 4px;
    background-color: #F8F8F2;
    transition: width 0.3s ease-in-out;
  }
  .solving-button {
    background-color: #fca414;
  }
  .solved-button {
    background-color: #a9a9a9;
    cursor: not-allowed;
  }
  
  /* General Styling */

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.items-center {
  align-items: center;
}

.h-screen {
  height: 100vh;
}

.App {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 5px;
}

.center-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo {
  width: 40px;
  height: 40px;
}

.title {
  color: #a99dfa;
  text-align: center;
  font-size: 1rem;
  font-weight: bold;
}

.drag-drop-text {
  color: #7d7898;
  font-size: 0.75rem;
  font-weight: semibold;
}

.pasting-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.pasting-text {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
}

.file-info {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: center;
  text-align: center;
  font-size: 1rem;
}

.file-name {
  color: #a99dfa;
  font-size: 0.875rem;
  font-weight: bold;
}

.file-selected {
  color: #555557;
  font-size: 0.875rem;
  font-weight: bold;
}

.file-notice {
  color: #555557;
  font-size: 0.875rem;
  font-weight: bold;
}

.form-group {
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
}

.label {
  color: #a99dfa;
  font-size: 14px;
  font-weight: bold;
  width: 75%;
  text-align: left;
}

.input {
  background-color: #3e3c40;
  color: white;
  font-size: 0.65rem;
  text-align: center;
  font-weight: semibold;
  width: 25%;
  padding: 8px;
  border-radius: 5px;
  border: none;
}
.status-message {
  color: #a99dfa;
  font-size: 12px;
  font-weight: bold;
  text-align: justify;
  text-justify: inter-word;
}

.buttons-group {
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: center;
}

.start-button,
.stop-button {
  height: 50px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: white;
  width: 150px;
}

.stop-button {
  background-color: #FF5722;
}

.start-button:disabled {
  background-color: #3e3c40;
  cursor: not-allowed;
}

.break-countdown {
  color: #6c6c6c;
  font-size: 0.75rem;
  text-align: center;
}
`;