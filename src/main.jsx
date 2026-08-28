import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bWVhc3VyZWQtcmVwdGlsZS0yNTIxLmNsZXJrLmFjY291bnRzLmRldiQ';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/login">
      <App />
    </ClerkProvider>
  </StrictMode>
);
