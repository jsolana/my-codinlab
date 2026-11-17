import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { ExecutionProvider } from './core/execution/ExecutionContext';
import { RemoteRunnerAdapter } from './core/execution/RemoteRunnerAdapter';
import './styles/tokens.css';
import './styles/global.css';

// Swap this adapter to run code somewhere else (Worker, WASM, other API).
const adapter = new RemoteRunnerAdapter(import.meta.env.VITE_RUNNER_URL ?? '/api');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ExecutionProvider adapter={adapter}>
        <App />
      </ExecutionProvider>
    </ErrorBoundary>
  </StrictMode>,
);
