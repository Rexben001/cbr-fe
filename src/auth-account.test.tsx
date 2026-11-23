import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VerifyEmailPage } from './auth-pages';

afterEach(()=>vi.unstubAllGlobals());

test('confirms email verification token and shows continuation',async()=>{
  const fetchMock=vi.fn(async()=>new Response(null,{status:204}));vi.stubGlobal('fetch',fetchMock);
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/verify-email?token=token-1']}><VerifyEmailPage/></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Verify email'}));
  await waitFor(()=>expect(screen.getByText(/Email verified/)).toBeInTheDocument());
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/email-verification/confirm',expect.objectContaining({method:'POST',body:JSON.stringify({token:'token-1'})}));
});
