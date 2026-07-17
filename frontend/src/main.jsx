import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializeMsal, isMsalConfigured } from './services/msalConfig';

async function bootstrap() {
  if (isMsalConfigured()) {
    await initializeMsal();
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
