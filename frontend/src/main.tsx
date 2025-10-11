import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext';

// Enable simple mock API in demo mode
if (import.meta.env.VITE_DEMO_MODE === 'true') {
  import('./mocks/simpleMock');
  console.log('Demo mode enabled - using simple mock API');
}

// Render app immediately
console.log('App starting...');
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
