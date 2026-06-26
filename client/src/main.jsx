/**
 * client/src/main.jsx
 *
 * Application entry point. Mounts the root React component inside the #root
 * div defined in index.html. StrictMode is enabled to surface potential issues
 * during development — it has no effect in production builds.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
