import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext';

// Enable MSW in demo mode
async function enableMSW() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      });
      console.log('MSW started successfully');
    } catch (error) {
      console.error('Failed to start MSW:', error);
      // Continue without MSW if it fails
    }
  }
}

// Start MSW in background (don't wait for it)
enableMSW();

// Render app immediately
console.log('App starting...');
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
