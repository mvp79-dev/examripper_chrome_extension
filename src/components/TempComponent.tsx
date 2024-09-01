import React, { useState, useEffect } from "react";
import mammoth from "mammoth";

function DocsAutoTyper() {
  const [fileContent, setFileContent] = useState("");
  const [googleDriveFile, setGoogleDriveFile] = useState(null);
  const [typingSpeed, setTypingSpeed] = useState(30);
  const [mistakeRate, setMistakeRate] = useState(10);
  const [correctionSpeed, setCorrectionSpeed] = useState(30);
  const [breakTime, setBreakTime] = useState(10);
  const [breakInterval, setBreakInterval] = useState(100);
  const [eta, setEta] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [replacementProgress, setReplacementProgress] = useState(0);
  const BACKEND_URL = "https://1a37-156-3-109-91.ngrok-free.app";
  useEffect(() => {
    chrome.storage.local.get(["authToken"], (result) => {
      if (result.authToken) {
        setAuthToken(result.authToken);
      }
    });

    const handleProgressUpdate = (message) => {
      if (message.action === "progressUpdate") {
        setProgress(message.progress);
        if (message.progress >= 90) {
          setIsTyping(false);
          setIsSolving(false);
        }
      } else if (message.action === "typingComplete") {
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
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handlePaste = async (e) => {
    e.preventDefault();
    setIsPasting(true);

    const items = e.clipboardData.items;
    let file = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        file = items[i].getAsFile();
        break;
      }
    }

    if (file) {
      handleFileUpload(file);
    } else {
      alert("No file found in clipboard. Please copy a file and try again.");
    }

    setIsPasting(false);
  };

  const handleStop = () => {
    // Refresh the page
    window.location.reload();
  };

  const handleFileUpload = (file) => {
    if (file) {
      setFileName(file.name);
    }

    if (file && file.name.endsWith(".docx")) {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setFileContent(result.value);
        } catch (err) {
          console.error("Error extracting text:", err);
        }
      };

      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const calculateETA = (
    contentLength,
    typingSpeed,
    mistakeRate,
    correctionSpeed,
    breakInterval,
    breakTime
  ) => {
    const avgWordLength = 5;
    const totalWords = contentLength / avgWordLength;
    const typingTimeMinutes = totalWords / typingSpeed;
    const numberOfMistakes = Math.ceil(totalWords / mistakeRate);
    const correctionTimeMinutes =
      numberOfMistakes * (avgWordLength / correctionSpeed);
    const numberOfBreaks = Math.floor(totalWords / breakInterval);
    const totalBreakTimeMinutes = numberOfBreaks * breakTime;
    const totalMinutes =
      typingTimeMinutes + correctionTimeMinutes + totalBreakTimeMinutes;

    setEta(`${Math.ceil(totalMinutes)} minutes`);
  };

  const replaceWords = async (text, wordsToReplace) => {
    let replacedText = text;
    for (const word of wordsToReplace) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      try {
        const response = await fetch(
          "https://1a37-156-3-109-91.ngrok-free.app/api/autotyper/replacement",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              id: "1",
              word: word,
              auth_token: authToken,
            }),
          }
        );
        const data = await response.json();
        console.log(data);
        if (data.success && data.result.replacement) {
          replacedText = replacedText.replace(regex, data.result.replacement);
        }
      } catch (error) {
        console.error(`Error replacing word "${word}":`, error);
      }
      setReplacementProgress(
        (prevProgress) => prevProgress + 100 / wordsToReplace.length
      );
    }
    return replacedText;
  };

  const handleStartTyping = async () => {
    let contentToType = fileContent || googleDriveFile || "";
    if (contentToType) {
      calculateETA(
        contentToType.length,
        typingSpeed,
        mistakeRate,
        correctionSpeed,
        breakInterval,
        breakTime
      );

      try {
        // Send initial request to backend to get words to replace
        const response = await fetch(`${BACKEND_URL}/api/autotyper/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
          const replacedContent = await replaceWords(
            contentToType,
            data.result.wordsToReplace
          );
          // console.log("Replaced content:", replacedContent);

          // Now that we have the replaced content, send the message to start typing
          chrome.runtime.sendMessage({
            action: "startTyping",
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
        } else {
          alert("Failed to get words to replace");
        }
      } catch (error) {
        console.error("Error in handleStartTyping:", error);
        alert("An error occurred while processing your request.");
      }
    } else {
      alert("Please upload a file or select a Google Drive document.");
    }
  };

  const handleStopTyping = () => {
    chrome.runtime.sendMessage({ action: "stopTyping" });
    setIsTyping(false);
    setIsSolving(false);
    setProgress(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDrop = (e) => {
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
    document.getElementById("fileInput").click();
  };

  const handlePauseTyping = () => {
    chrome.runtime.sendMessage({ action: "pauseTyping" });
    setIsPaused(true);
  };

  const handleResumeTyping = () => {
    chrome.runtime.sendMessage({ action: "resumeTyping" });
    setIsPaused(false);
  };

  return (
    <div className="App">
      <h1>Google Docs Auto Typer</h1>
      <input
        id="fileInput"
        type="file"
        style={{ display: "none" }}
        onChange={(e) => handleFileUpload(e.target.files[0])}
        accept=".txt,.docx"
      />
      <div
        id="drag-drop-area"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: dragging ? "2px solid #000" : "2px dashed #ccc",
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          marginTop: "20px",
          cursor: "pointer",
          transition: "border 0.3s ease",
        }}
      >
        <p>Drag & Drop a .txt or .docx file here, or click to upload</p>
      </div>
      {isPasting && (
        <div
          className="pasting-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "5px",
            }}
          >
            Processing pasted file...
          </div>
        </div>
      )}
      <div>
        <label>File Name: {fileName}</label>
      </div>
      <div>
        <label>Typing Speed (WPM): </label>
        <select
          value={typingSpeed}
          onChange={(e) => setTypingSpeed(parseInt(e.target.value, 10))}
        >
          {[...Array(31)].map((_, i) => (
            <option key={i + 30} value={i + 30}>
              {i + 30} WPM
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Mistake Rate (Words): </label>
        <input
          type="number"
          value={mistakeRate}
          onChange={(e) => setMistakeRate(parseInt(e.target.value, 10))}
        />
      </div>
      <div>
        <label>Correction Speed (WPM): </label>
        <select
          value={correctionSpeed}
          onChange={(e) => setCorrectionSpeed(parseInt(e.target.value, 10))}
        >
          {[...Array(31)].map((_, i) => (
            <option key={i + 30} value={i + 30}>
              {i + 30} WPM
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Break Time (Minutes): </label>
        <input
          type="number"
          value={breakTime}
          onChange={(e) => setBreakTime(parseInt(e.target.value, 10))}
        />
      </div>
      <div>
        <label>Break Interval (Words): </label>
        <input
          type="number"
          value={breakInterval}
          onChange={(e) => setBreakInterval(parseInt(e.target.value, 10))}
        />
      </div>
      <div>
        <label>ETA: {eta}</label>
      </div>
      {replacementProgress > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <label>Replacement Progress:</label>
          <div
            style={{
              width: "100%",
              backgroundColor: "#e0e0e0",
              borderRadius: "5px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${replacementProgress}%`,
                height: "20px",
                backgroundColor: "#4CAF50",
                transition: "width 0.3s ease-in-out",
              }}
            ></div>
          </div>
        </div>
      )}

      <button
        id="start-button"
        className={`start-button ${
          isTyping ? "solving-button" : "start-button"
        }`}
        onClick={handleStartTyping}
      >
        {isTyping ? "Typing..." : "Start"}
        <div id="progress-bar" style={{ width: `${progress}%` }}></div>
      </button>
      {isTyping && (
        <button
          id="stop-button"
          className="stop-button"
          onClick={handleStopTyping}
        >
          Stop
        </button>
      )}
      {isTyping &&
        (!isPaused ? (
          <button
            id="pause-button"
            className="pause-button"
            onClick={handlePauseTyping}
          >
            Pause
          </button>
        ) : (
          <button
            id="pause-button"
            className="pause-button"
            onClick={handleResumeTyping}
          >
            Resume
          </button>
        ))}
    </div>
  );
}

export default DocsAutoTyper;
