import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext';

// Enable MSW in demo mode
async function enableMSW() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { worker } = await import('./mocks/browser');
    worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

// Initialize MSW and then render the app
enableMSW().then(() => {
  createRoot(document.getElementById("root")!).render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
});
