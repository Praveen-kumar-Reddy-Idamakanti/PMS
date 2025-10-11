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
        waitUntilReady: true,
      });
      console.log('MSW started successfully');
    } catch (error) {
      console.error('Failed to start MSW:', error);
      // Continue without MSW if it fails
    }
  }
}

// Initialize MSW and then render the app
enableMSW()
  .then(() => {
    console.log('App starting...');
    createRoot(document.getElementById("root")!).render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
  })
  .catch((error) => {
    console.error('Failed to initialize app:', error);
    // Render app anyway
    createRoot(document.getElementById("root")!).render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
  });
