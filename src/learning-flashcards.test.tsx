import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishedDashboardSymbols } from './dashboard-symbols';
import { DashboardSymbolsPage } from './learning-flashcards';
import { buildQuizQuestions, filterFlashcards, isQuizAnswerCorrect, type LearningCard } from './learning-flashcards';

const cards: LearningCard[] = publishedDashboardSymbols.map(symbol => ({
  id:symbol.id, code:symbol.id, image:symbol.file, name:symbol.name, category:symbol.category,
  meaning:symbol.meaning, action:symbol.action, severity:symbol.severity, kind:symbol.kind, quizEligible:true,
}));

describe('dashboard flashcard data', () => {
  it('maps unique supplied assets and filters by name, category and bookmark', () => {
    expect(new Set(cards.map(card=>card.id)).size).toBe(cards.length);
    expect(cards.every(card=>card.image.startsWith('/lighting/')||card.image.startsWith('/warnings/'))).toBe(true);
    expect(filterFlashcards(cards,'ABS','',false,new Map()).map(card=>card.id)).toEqual(['abs']);
    expect(filterFlashcards(cards,'','Brakes',false,new Map()).every(card=>card.category==='Brakes')).toBe(true);
    const saved=new Map([['abs',{assetId:'abs',bookmarked:true} as never]]);
    expect(filterFlashcards(cards,'','',true,saved).map(card=>card.id)).toEqual(['abs']);
  });

  it('builds five multiple-choice questions with one correct answer each', () => {
    const questions=buildQuizQuestions(cards,5,()=>.25);
    expect(questions).toHaveLength(5);
    expect(new Set(questions.map(question=>question.card.id)).size).toBe(5);
    for(const question of questions){
      expect(question.options).toHaveLength(4);
      expect(question.options.filter(option=>option.id===question.card.id)).toHaveLength(1);
      expect(isQuizAnswerCorrect(question,question.card.id)).toBe(true);
      expect(isQuizAnswerCorrect(question,question.options.find(option=>option.id!==question.card.id)!.id)).toBe(false);
    }
  });
});

describe('dashboard flashcard navigation', () => {
  beforeEach(()=>{
    vi.restoreAllMocks();
    vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({error:'not authenticated'}),{status:401,headers:{'Content-Type':'application/json'}}));
  });

  it('loads the actual asset, flips, navigates and filters without reloading', async () => {
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><MemoryRouter><DashboardSymbolsPage/></MemoryRouter></QueryClientProvider>);
    const card=await screen.findByRole('button',{name:/flip high beam card/i});
    expect(screen.getByRole('img',{name:'High beam'})).toHaveAttribute('src','/lighting/A01_High_Beam_Indicator.svg');
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole('button',{name:/next/i}));
    expect(screen.getByRole('img',{name:'Dipped headlights'})).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search by code/i),{target:{value:'ABS'}});
    expect(await screen.findByRole('button',{name:/flip abs malfunction card/i})).toBeInTheDocument();
  });
});
