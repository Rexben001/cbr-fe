import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LearningSearch } from './learner-search';

describe('LearningSearch',()=>{
 it('debounces learner search, highlights matches, and links directly to lessons',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async(input)=>String(input).includes('/api/v1/topics')?new Response(JSON.stringify({topics:[{id:'m01',slug:'m01',title:'Priority',description:'',displayOrder:0}]}),{status:200}):new Response(JSON.stringify({results:[{type:'lesson',id:'l03',topicId:'m01',title:'Understanding priority signs',description:'Learn priority rules'}]}),{status:200}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><LearningSearch/></MemoryRouter></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText(/search topics and lessons/i),{target:{value:'priority'}});
  expect(await screen.findByRole('link',{name:/understanding priority signs/i})).toHaveAttribute('href','/lessons/l03');
  expect(screen.getAllByText(/priority/i).some((item)=>item.tagName==='MARK')).toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('q=priority'),expect.anything());
  fireEvent.keyDown(screen.getByLabelText(/search topics and lessons/i),{key:'ArrowDown'});
  expect(screen.getByRole('link',{name:/understanding priority signs/i})).toHaveFocus();
 });
});
