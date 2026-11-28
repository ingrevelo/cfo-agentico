import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Punto de entrada: engancha la app en el <div id="root"> de index.html.
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
