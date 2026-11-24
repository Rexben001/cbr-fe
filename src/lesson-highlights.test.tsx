import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe,expect,it,vi } from 'vitest';
import { HighlightableLesson } from './lesson-highlights';

describe('HighlightableLesson',()=>{
 it('restores a matching private highlight and restricts ordinary copying',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({highlights:[{id:'h1',lessonId:'l1',lessonTitle:'Lesson',selectedText:'priority rule',prefixText:'Important ',suffixText:' applies.',startOffset:10,endOffset:23,color:'yellow',lessonVersion:1,currentLessonVersion:1,updatedAt:'2026-11-12T00:00:00Z'}]}),{status:200}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><HighlightableLesson lessonId="l1"><p>Important priority rule applies.</p></HighlightableLesson></QueryClientProvider>);
  const marked=await screen.findByText('priority rule');expect(marked.tagName).toBe('MARK');
  fireEvent.copy(marked);expect(await screen.findByText(/lesson copying is restricted/i)).toBeInTheDocument();
 });
 it('reapplies a saved highlight after lesson content rerenders',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({highlights:[{id:'h1',lessonId:'l1',lessonTitle:'Lesson',selectedText:'priority rule',prefixText:'Important ',suffixText:' applies.',startOffset:10,endOffset:23,color:'yellow',lessonVersion:1,currentLessonVersion:1,updatedAt:'2026-11-12T00:00:00Z'}]}),{status:200}));
  function Lesson(){const [updated,setUpdated]=useState(false);return <><button onClick={()=>setUpdated(true)}>Load interaction</button><HighlightableLesson lessonId="l1"><p>Important priority rule applies.{updated?' Updated.':''}</p></HighlightableLesson></>}
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><Lesson/></QueryClientProvider>);
  expect((await screen.findByText('priority rule')).tagName).toBe('MARK');
  fireEvent.click(screen.getByRole('button',{name:'Load interaction'}));
  await waitFor(()=>expect(screen.getByText('priority rule').tagName).toBe('MARK'));
 });
 it('restores one saved highlight across multiple paragraphs',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({highlights:[{id:'h2',lessonId:'l1',lessonTitle:'Lesson',selectedText:'alphabeta',prefixText:'Lead ',suffixText:' tail',startOffset:5,endOffset:14,color:'green',lessonVersion:1,currentLessonVersion:1,updatedAt:'2026-11-24T00:00:00Z'}]}),{status:200}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});const {container}=render(<QueryClientProvider client={client}><HighlightableLesson lessonId="l1"><p>Lead alpha</p><p>beta tail</p></HighlightableLesson></QueryClientProvider>);
  await waitFor(()=>expect(container.querySelectorAll('mark[data-lesson-highlight="h2"]')).toHaveLength(2));
  expect([...container.querySelectorAll('mark[data-lesson-highlight="h2"]')].map(mark=>mark.textContent).join('')).toBe('alphabeta');
 });
});
