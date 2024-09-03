import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';

function DocsAutoTyper() {
  const [fileContent, setFileContent] = useState('');
  const [googleDriveFile, setGoogleDriveFile] = useState(null);
  const [typingSpeed, setTypingSpeed] = useState(30);
  const [mistakeRate, setMistakeRate] = useState(10);
  const [correctionSpeed, setCorrectionSpeed] = useState(30);
  const [breakTime, setBreakTime] = useState(10);
  const [breakInterval, setBreakInterval] = useState(100);
  const [eta, setEta] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [wordsToReplace, setWordsToReplace] = useState([]);
  const [replacementProgress, setReplacementProgress] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakCountdown, setBreakCountdown] = useState(0);
  const BACKEND_URL = 'https://examripper-288287396080.herokuapp.com';
  useEffect(() => {
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        setAuthToken(result.authToken);
      }
    });

    const handleProgressUpdate = (message) => {
      if (message.action === 'progressUpdate') {
        setProgress(message.progress);
        if (message.progress >= 90) {
          setIsTyping(false);
          setIsSolving(false);
        }
      } else if (message.action === 'typingComplete') {
        setIsTyping(false);
        setIsSolving(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleProgressUpdate);

    return () => {
      chrome.runtime.onMessage.removeListener(handleProgressUpdate);
    };
  }, []);
  useEffect(() => {
    const handleBreakMessage = (message: any) => {
      if (message.action === 'startBreak') {
        setIsOnBreak(true);
        setBreakCountdown(message.breakTime);
      } else if (message.action === 'updateBreak') {
        setBreakCountdown(message.timeLeft);
        if (message.timeLeft === 0) {
          setIsOnBreak(false);
        }
      } else if (message.action === 'breakEnded' || message.action === 'breakSkipped') {
        setIsOnBreak(false);
        setBreakCountdown(0);
      } else if (message.action === 'stopBreak') {
        setIsOnBreak(false);
        setBreakCountdown(0);
      }
    };

    chrome.runtime.onMessage.addListener(handleBreakMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleBreakMessage);
    };
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['autoTyperState'], (result) => {
      if (result.autoTyperState) {
        const state = JSON.parse(result.autoTyperState);
        setFileContent(state.fileContent || '');
        setTypingSpeed(state.typingSpeed || 30);
        setMistakeRate(state.mistakeRate || 10);
        setCorrectionSpeed(state.correctionSpeed || 30);
        setBreakTime(state.breakTime || 10);
        setBreakInterval(state.breakInterval || 100);
        setEta(state.eta || '');
        setFileName(state.fileName || '');
        setIsTyping(state.isTyping || false);
        setIsPaused(state.isPaused || false);
        setProgress(state.progress || 0);
        // ... set other relevant state variables
      }
    });
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    persistState();
  }, [fileContent, typingSpeed, mistakeRate, correctionSpeed, breakTime, breakInterval, eta, fileName, isTyping, isPaused, progress]);

  const persistState = () => {
    const stateToSave = {
      fileContent,
      typingSpeed,
      mistakeRate,
      correctionSpeed,
      breakTime,
      breakInterval,
      eta,
      fileName,
      isTyping,
      isPaused,
      progress,
      // ... other relevant state variables
    };
    chrome.storage.local.set({ autoTyperState: JSON.stringify(stateToSave) });
  };

  const handlePaste = async (e: any) => {
    e.preventDefault();
    setIsPasting(true);

    const items = e.clipboardData.items;
    let file = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        file = items[i].getAsFile();
        break;
      }
    }

    if (file) {
      handleFileUpload(file);
    } else {
      alert('No file found in clipboard. Please copy a file and try again.');
    }

    setIsPasting(false);
  };

  const handleStop = () => {
    // Refresh the page
    window.location.reload();
  };

  const handleFileUpload = (file: any) => {
    if (file) {
      setFileName(file.name);
    }

    if (file && file.name.endsWith('.docx')) {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setFileContent(result.value);
          setFileName(file.name);
          persistState();
        } catch (err) {
          console.error('Error extracting text:', err);
        }
      };

      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
        setFileName(file.name);
        persistState();
      };
      reader.readAsText(file);
    }
  };

  const calculateETA = (contentLength: number, typingSpeed: number, mistakeRate: number, correctionSpeed: number, breakInterval: number, breakTime: number) => {
    const avgWordLength = 5;
    const totalWords = contentLength / avgWordLength;
    const typingTimeMinutes = totalWords / typingSpeed;
    const numberOfMistakes = Math.ceil(totalWords / mistakeRate);
    const correctionTimeMinutes = numberOfMistakes * (avgWordLength / correctionSpeed);
    const numberOfBreaks = Math.floor(totalWords / breakInterval);
    const totalBreakTimeMinutes = numberOfBreaks * breakTime;
    const totalMinutes = typingTimeMinutes + correctionTimeMinutes + totalBreakTimeMinutes;

    setEta(`${Math.ceil(totalMinutes)} minutes`);
  };

  const replaceWords = async (text: string, wordsToReplace: string[]) => {
    let replacedText = text;
    for (const word of wordsToReplace) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      try {
        const response = await fetch('https://examripper-288287396080.herokuapp.com/api/autotyper/replacement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            id: '1',
            word: word,
            auth_token: authToken,
          }),
        });
        const data = await response.json();
        console.log(data);
        if (data.success && data.result.replacement) {
          replacedText = replacedText.replace(regex, data.result.replacement);
        }
      } catch (error) {
        console.error(`Error replacing word "${word}":`, error);
      }
      setReplacementProgress((prevProgress) => prevProgress + 100 / wordsToReplace.length);
    }
    return replacedText;
  };

  const handleStartTyping = async () => {
    let contentToType = fileContent || googleDriveFile || '';
    if (contentToType) {
      calculateETA(contentToType.length, typingSpeed, mistakeRate, correctionSpeed, breakInterval, breakTime);


      try {
        // Send initial request to backend to get words to replace
        const response = await fetch(`${BACKEND_URL}/api/autotyper/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            essay: contentToType,
            error_rate: mistakeRate,
            auth_token: authToken,
          }),
        });

        const data = await response.json();
        console.log(data);

        if (data.success) {
          // Replace words in the content
          setWordsToReplace(data.result.wordsToReplace);
          const replacedContent = await replaceWords(contentToType, data.result.wordsToReplace);
          // console.log("Replaced content:", replacedContent);

          // Now that we have the replaced content, send the message to start typing
          chrome.runtime.sendMessage({
            action: 'startTyping',
            data: {
              text: replacedContent,
              typingSpeed,
              mistakeRate,
              correctionSpeed,
              breakTime,
              breakInterval,
            },
          });

          setIsSolving(true);
          setIsTyping(true);
          setProgress(0);
          persistState();
        } else {
          alert('Failed to get words to replace');
        }
      } catch (error) {
        console.error('Error in handleStartTyping:', error);
        alert('An error occurred while processing your request.');
      }
    } else {
      alert('Please upload a file or select a Google Drive document.');
    }
  };

  const handleStopTyping = () => {
    chrome.runtime.sendMessage({ action: 'stopTyping' });
    setIsTyping(false);
    setIsSolving(false);
    setProgress(0);
    setIsOnBreak(false);
    setBreakCountdown(0);
    persistState();
  };

  const handleSkipBreak = () => {
    chrome.runtime.sendMessage({ action: 'skipBreak' });
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleClick = () => {
    document.getElementById('fileInput').click();
  };

  const handlePauseTyping = () => {
    chrome.runtime.sendMessage({ action: 'pauseTyping' });
    setIsPaused(true);
    persistState();
  };

  const handleResumeTyping = () => {
    chrome.runtime.sendMessage({ action: 'resumeTyping' });
    setIsPaused(false);
    persistState();
  };

  return (
    <div className="flex justify-center items-center h-screen bg-[#FFB86C]">
      <div className="App">
        <div className="center-content">
          <img
            className="logo"
            src="../icons/icon128.png"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>
        <h1 className="title">Google Docs Auto Typer</h1>
        <div>
          <input id="fileInput" type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0])} accept=".txt,.docx" />
          <div
            id="drag-drop-area"
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: dragging ? '2px solid #000' : '2px dashed #ccc',
              padding: '20px',
              borderRadius: '10px',
              textAlign: 'center',
              marginTop: '20px',
              cursor: 'pointer',
              transition: 'border 0.3s ease',
            }}
          >
            <p className="drag-drop-text">Drag & Drop a .txt or .docx file here, or click to upload</p>
          </div>
          {isPasting && (
            <div className="pasting-overlay">
              <div className="pasting-text">Processing pasted file...</div>
            </div>
          )}
        </div>
        <div className="file-info">
          {fileName ? (
            <label className="file-name">
              {fileName} <span className="file-selected">Selected</span>
            </label>
          ) : (
            <label className="file-notice">Please upload a file</label>
          )}
        </div>
        <div className="form-group">
          <label className="label">Typing Speed (WPM): </label>
          <select value={typingSpeed} className="input" onChange={(e) => setTypingSpeed(parseInt(e.target.value, 10))}>
            {[...Array(31)].map((_, i) => (
              <option key={i + 30} value={i + 30}>
                {i + 30} WPM
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Mistake Rate (Words): </label>
          <input type="number" value={mistakeRate} className="input" onChange={(e) => setMistakeRate(parseInt(e.target.value, 10))} />
        </div>
        <div className="form-group">
          <label className="label">Correction Speed (WPM): </label>
          <select value={correctionSpeed} className="input" onChange={(e) => setCorrectionSpeed(parseInt(e.target.value, 10))}>
            {[...Array(31)].map((_, i) => (
              <option key={i + 30} value={i + 30}>
                {i + 30} WPM
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Break Time (Minutes): </label>
          <input type="number" value={breakTime} className="input" onChange={(e) => setBreakTime(parseInt(e.target.value, 10))} />
        </div>
        <div className="form-group">
          <label className="label">Break Interval (Words): </label>
          <input type="number" value={breakInterval} className="input" onChange={(e) => setBreakInterval(parseInt(e.target.value, 10))} />
        </div>
        <div className="form-group">
          <label className="label">ETA (Estimated Time of Arrival): {eta}</label>
        </div>

        {isOnBreak && (
          <div className="break-countdown">
            Break time! Resuming in {breakCountdown} seconds...
            <button
              className="skip-break-button"
              onClick={handleSkipBreak}
              style={{
                backgroundColor: '#66bd77',
                border: 'none',
                padding: '15px 20px',
                fontSize: '18px',
                cursor: 'pointer',
                borderRadius: '8px',
                color: '#F8F8F2',
                display: 'block',
                margin: '10px auto',
                position: 'relative',
                overflow: 'hidden',
                width: '150px',
              }}
            >
              Skip Break
            </button>
          </div>
        )}

        <div className="buttons-group">
          <div>
            <button
              id="start-button"
              className="start-button"
              onClick={handleStartTyping}
              disabled={isTyping && replacementProgress < 100}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span>{replacementProgress > 0 && replacementProgress < 100 ? `Replacing ${Math.ceil((replacementProgress / 100) * wordsToReplace.length)}/${wordsToReplace.length} words` : 'Start'}</span>
              {replacementProgress > 0 && replacementProgress < 100 && (
                <div
                  id="progress-bar"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: `${replacementProgress}%`,
                    height: '4px',
                    backgroundColor: '#F8F8F2',
                    transition: 'width 0.3s ease-in-out',
                  }}
                ></div>
              )}
            </button>
          </div>
          <div>
            <button
              id="pause-resume-button"
              className={isTyping ? 'solving-button' : 'start-button'}
              onClick={isPaused ? handleResumeTyping : handlePauseTyping}
              disabled={!isTyping}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFB86C',
                border: 'none',
                padding: '15px 20px',
                fontSize: '18px',
                cursor: 'pointer',
                borderRadius: '8px',
                color: '#F8F8F2',
                margin: '20px auto',
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
              {!isPaused ? (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    marginLeft: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 320 512"
                    width="100%"
                    height="100%"
                    fill="currentColor" // This will use the current text color
                  >
                    <path d="M48 64C21.5 64 0 85.5 0 112L0 400c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48L48 64zm192 0c-26.5 0-48 21.5-48 48l0 288c0 26.5 21.5 48 48 48l32 0c26.5 0 48-21.5 48-48l0-288c0-26.5-21.5-48-48-48l-32 0z" />
                  </svg>
                </div>
              ) : null}
            </button>
          </div>
        </div>

        <div>
          {isTyping && (
            <button
              id="stop-button"
              className="stop-button"
              onClick={handleStopTyping}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocsAutoTyper;
