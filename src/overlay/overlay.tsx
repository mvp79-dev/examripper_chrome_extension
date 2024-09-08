// Create the overlay window
import ReactDOM from 'react-dom/client';  // Correct capitalization
import React from 'react';
import DocsAutoTyper from '../components/Docs/Docs';  // Ensure this path is correct
import EdPuzzle from '../components/EdPuzzle/EdPuzzle';  // Ensure this path is correct

// Create the overlay div
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
// Check if the user is a donor
chrome.storage.local.get(['donor_status'], function({ donor_status }) {
    if (donor_status === true) {
        console.log('User is a donor');
        document.body.appendChild(toggleButton);
    }
    else {
        console.log('User is not a donor');
    }
});

// Function to load and render the appropriate component based on URL
interface UrlRenderMap {
    [key: string]: JSX.Element;
}



async function loadAndRenderComponent(url: string): Promise<void> {
    try {
        const div = document.createElement('div');
        // div.style.backgroundColor = '#2b292e';
        const root = ReactDOM.createRoot(div); // Corrected capitalization
        console.log(new URL(url).origin);
        // Define a mapping for the URLs
        const urlRenderMap: UrlRenderMap = {
            'https://docs.google.com': <DocsAutoTyper />,
            'https://edpuzzle.com': <EdPuzzle />
        };

        // Render the appropriate component based on the URL
        const componentToRender = urlRenderMap[new URL(url).origin];
        root.render(componentToRender ? componentToRender : <div>URL not supported</div>);
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
            const currentUrl = window.location.href;
            loadAndRenderComponent(currentUrl);
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
