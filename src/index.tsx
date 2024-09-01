import React from 'react';
import { createRoot } from 'react-dom/client';
import DocsAutoTyper from './components/TempComponent';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DocsAutoTyper />);
} else {
  console.error('Root element not found');
}