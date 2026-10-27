import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { InitialSSRData } from './types';

let initialData: InitialSSRData | undefined;
try {
  const ssrScript = document.getElementById('__INITIAL_DATA__');
  if (ssrScript && ssrScript.textContent) {
    initialData = JSON.parse(ssrScript.textContent);
    (window as unknown as { __INITIAL_DATA__: InitialSSRData }).__INITIAL_DATA__ = initialData!;
  }
} catch (e) {
  console.warn('Initial SSR hydration parse error:', e);
}

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App
        initialProfile={initialData?.profile}
        initialLeaderboard={initialData?.leaderboard}
      />
    </React.StrictMode>
  );
}
