import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler for external resource loading failures
window.addEventListener('error', (event) => {
  // Suppress errors from external resources that fail to load (e.g., CDNs)
  if (event.message && event.message.includes('Failed to fetch')) {
    console.warn('External resource failed to load:', event.filename);
    event.preventDefault();
  }
});

// Handle unhandled promise rejections from external resources
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'string' && 
      (event.reason.includes('Failed to fetch') || event.reason.includes('403'))) {
    console.warn('External resource request failed:', event.reason);
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)