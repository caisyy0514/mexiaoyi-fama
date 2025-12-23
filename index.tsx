
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("[Portal] Bootstrapping React Application...");

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("[Portal] Core Render Initiated.");
} else {
  console.error("[Portal] Critical Error: Root element '#root' not found.");
}
