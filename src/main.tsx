import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { NotificationProvider } from './notifications';

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <NotificationProvider><App /></NotificationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
