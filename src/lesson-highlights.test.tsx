import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { fireEvent,render,screen } from '@testing-library/react';
import { describe,expect,it,vi } from 'vitest';
import { HighlightableLesson } from './lesson-highlights';

describe('HighlightableLesson',()=>{
 it('restores a matching private highlight and restricts ordinary copying',async()=>{
  vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({highlights:[{id:'h1',lessonId:'l1',lessonTitle:'Lesson',selectedText:'priority rule',prefixText:'Important ',suffixText:' applies.',startOffset:10,endOffset:23,color:'yellow',lessonVersion:1,currentLessonVersion:1,updatedAt:'2026-11-12T00:00:00Z'}]}),{status:200}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><HighlightableLesson lessonId="l1"><p>Important priority rule applies.</p></HighlightableLesson></QueryClientProvider>);
  const marked=await screen.findByText('priority rule');expect(marked.tagName).toBe('MARK');
  fireEvent.copy(marked);expect(await screen.findByText(/lesson copying is restricted/i)).toBeInTheDocument();
 });
});
