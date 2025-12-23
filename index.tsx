
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("[System] Initializing React Root...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("[System] Root element not found!");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("[System] Render initiated successfully.");
} catch (err) {
  console.error("[System] Render failed:", err);
}
