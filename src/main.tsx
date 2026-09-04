import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { SplashLoader } from './components/SplashLoader.tsx';
import { LanguageProvider } from './lib/i18n.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <SplashLoader />
      <App />
    </LanguageProvider>
  </StrictMode>,
);
