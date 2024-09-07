// Create the overlay window
import ReactDom from 'react-dom/client';
import React from 'react';
import TempComponent from '../components/TempComponent';

const overlayWindow = document.createElement('div');
overlayWindow.id = 'examripper-overlay';
overlayWindow.style.cssText = `
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100%;
  background-color: white;
  z-index: 10000;
  overflow-y: auto;
  box-shadow: -2px 0 5px rgba(0,0,0,0.2);
  transition: transform 0.3s ease-in-out;
`;
document.body.appendChild(overlayWindow);

// Create a button to toggle the overlay
const toggleButton = document.createElement('button');
toggleButton.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10001;
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  background-color: transparent;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

// Create an image element for the logo
const logoImage = document.createElement('img');
logoImage.src = chrome.runtime.getURL('icons/icon128.png'); // Adjust the path as needed
logoImage.alt = 'Auto Typer';
logoImage.style.cssText = `
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
`;

toggleButton.appendChild(logoImage);

// check if the user is a donor
chrome.storage.local.get(['donor_status'], function({ donor_status }) {
  if (donor_status === true) {
    document.body.appendChild(toggleButton);
  }
});


// Function to load styles
function loadStyles() {
  return new Promise((resolve, reject) => {
    fetch(chrome.runtime.getURL('popup/docsAutoType.css'))
      .then(response => response.text())
      .then(css => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        resolve();
      })
      .catch(reject);
  });
}

// Function to load and render the DocsAutoTyper component
async function loadAndRenderComponent() {
  try {
    await loadStyles();
    const div = document.createElement('div');
    div.style.backgroundColor = '#2b292e';
    const root = ReactDom.createRoot(div);
    root.render(<TempComponent />);
    overlayWindow.appendChild(div);
  } catch (error) {
    console.error('Error loading component:', error);
  }
}

// Toggle overlay visibility
let isOverlayVisible = false;
let isComponentLoaded = false;

function toggleOverlay() {
  if (isOverlayVisible) {
    overlayWindow.style.transform = 'translateX(100%)';
    logoImage.style.transform = 'rotate(0deg)';
  } else {
    overlayWindow.style.transform = 'translateX(0)';
    logoImage.style.transform = 'rotate(180deg)';
    if (!isComponentLoaded) {
      loadAndRenderComponent();
      isComponentLoaded = true;
    }
  }
  isOverlayVisible = !isOverlayVisible;
}

toggleButton.addEventListener('click', toggleOverlay);
toggleButton.addEventListener('mousedown', () => {
  toggleButton.style.transform = 'scale(0.95)';
});
toggleButton.addEventListener('mouseup', () => {
  toggleButton.style.transform = 'scale(1)';
});
toggleButton.addEventListener('mouseleave', () => {
  toggleButton.style.transform = 'scale(1)';
});

// Initially hide the overlay
overlayWindow.style.transform = 'translateX(100%)';