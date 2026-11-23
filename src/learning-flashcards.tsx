import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Check, ChevronLeft, ChevronRight, RotateCcw, Search, Shuffle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { authAPI } from './api/auth';
import { flashcardsAPI, type FlashcardProgress, type FlashcardProgressUpdate } from './api/flashcards';
import { publishedDashboardSymbols, reviewDashboardSymbols, type SymbolSeverity } from './dashboard-symbols';
import { ErrorState, Loading } from './components';

type SignManifestItem = { code: string; series: string; file: string };
export type LearningCard = {
  id: string;
  code: string;
  image: string;
  name: string;
  category: string;
  meaning: string;
  action: string;
  severity?: SymbolSeverity;
  kind?: 'warning' | 'status' | 'control';
  quizEligible: boolean;
};
export type QuizQuestion = { card: LearningCard; options: LearningCard[] };

const signCategories: Record<string, string> = { A:'Speed', B:'Priority', C:'Prohibitions', D:'Mandatory directions', E:'Parking and stopping', F:'Directions', G:'Road information', H:'Built-up areas', J:'Warnings', K:'Temporary signs', L:'Information' };

export function filterFlashcards(cards: LearningCard[], search: string, category: string, bookmarked: boolean, progress: Map<string, FlashcardProgress>) {
  const query = search.trim().toLocaleLowerCase();
  return cards.filter(card => (!category || card.category === category)
    && (!bookmarked || progress.get(card.id)?.bookmarked)
    && (!query || `${card.code} ${card.name} ${card.meaning}`.toLocaleLowerCase().includes(query)));
}

export function buildQuizQuestions(cards: LearningCard[], count = 5, random = Math.random): QuizQuestion[] {
  const eligible = cards.filter(card => card.quizEligible);
  const shuffled = [...eligible].sort(() => random() - .5).slice(0, Math.min(count, eligible.length));
  return shuffled.map(card => {
    const distractors = eligible.filter(item => item.id !== card.id).sort(() => random() - .5).slice(0, 3);
    return { card, options: [card, ...distractors].sort(() => random() - .5) };
  });
}

export function isQuizAnswerCorrect(question: QuizQuestion, answerID: string) {
  return question.card.id === answerID;
}

export function trafficSignAssetPath(file: string) {
  const relative = file.replace(/^\/+/, '');
  return `/traffic-signs/${relative}`;
}

export function LearningFlashcardsPage({ initialDeck = 'traffic_signs' }: { initialDeck?: 'traffic_signs' | 'dashboard_symbols' }) {
  const [deck, setDeck] = useState<'traffic_signs' | 'dashboard_symbols'>(initialDeck);
  const signs = useQuery({
    queryKey: ['traffic-sign-manifest'],
    queryFn: async () => {
      const response = await fetch('/traffic-signs/manifest.json');
      if (!response.ok) throw new Error('manifest unavailable');
      const items = await response.json() as SignManifestItem[];
      if (!Array.isArray(items)) throw new Error('invalid manifest');
      return items;
    },
    enabled: deck === 'traffic_signs',
  });
  const signCards = useMemo(() => (signs.data ?? []).map(sign => ({
    id: sign.code.toLocaleLowerCase(), code: sign.code, image: trafficSignAssetPath(sign.file), name: `Traffic sign ${sign.code}`,
    category: signCategories[sign.series] ?? sign.series, meaning: `${signCategories[sign.series] ?? sign.series} sign`,
    action: 'A verified plain-language explanation is not included for this asset yet. Study the visual and code without inventing a meaning.', quizEligible: false,
  } satisfies LearningCard)), [signs.data]);
  const dashboardCards = useMemo(() => publishedDashboardSymbols.map(symbol => ({
    id:symbol.id, code:symbol.id, image:symbol.file, name:symbol.name, category:symbol.category, meaning:symbol.meaning,
    action:symbol.action, severity:symbol.severity, kind:symbol.kind, quizEligible:true,
  } satisfies LearningCard)), []);

  if (deck === 'traffic_signs' && signs.isPending) return <Loading/>;
  if (deck === 'traffic_signs' && signs.error) return <ErrorState message="Traffic-sign assets could not be loaded."/>;
  const cards = deck === 'traffic_signs' ? signCards : dashboardCards;
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><p className="font-bold text-ocean">VISUAL STUDY</p><h1 className="mt-1 text-3xl font-bold">Flashcards</h1><p className="mt-2 max-w-3xl text-slate-600">Switch between Dutch traffic signs and vehicle dashboard symbols. Appearance and recommended action can vary by vehicle, so always consult its handbook.</p></header>
    <div className="inline-flex rounded-xl border bg-white p-1" role="tablist" aria-label="Flashcard deck">
      <button role="tab" aria-selected={deck==='traffic_signs'} className={`flashcard-deck-tab ${deck==='traffic_signs'?'active':''}`} onClick={()=>setDeck('traffic_signs')}>Traffic signs</button>
      <button role="tab" aria-selected={deck==='dashboard_symbols'} className={`flashcard-deck-tab ${deck==='dashboard_symbols'?'active':''}`} onClick={()=>setDeck('dashboard_symbols')}>Dashboard lights &amp; symbols</button>
    </div>
    <FlashcardDeck key={deck} deck={deck} cards={cards} reviewCount={deck==='dashboard_symbols'?reviewDashboardSymbols.length:0}/>
  </div>;
}

export function DashboardSymbolsPage() {
  return <LearningFlashcardsPage initialDeck="dashboard_symbols"/>;
}

function FlashcardDeck({ deck, cards, reviewCount }: { deck: FlashcardProgress['deck']; cards: LearningCard[]; reviewCount: number }) {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey:['me'], queryFn:authAPI.me, retry:false });
  const progressQuery = useQuery({ queryKey:['flashcard-progress',deck], queryFn:()=>flashcardsAPI.progress(deck), enabled:Boolean(me.data), retry:false });
  const [localProgress, setLocalProgress] = useState<Map<string,FlashcardProgress>>(new Map());
  const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const [savedOnly,setSavedOnly]=useState(false);
  const [active,setActive]=useState(0); const [flipped,setFlipped]=useState(false); const [mode,setMode]=useState<'study'|'quiz'>('study');
  const [quiz,setQuiz]=useState<QuizQuestion[]>([]); const [quizIndex,setQuizIndex]=useState(0); const [answer,setAnswer]=useState(''); const [incorrect,setIncorrect]=useState<string[]>([]); const [quizDone,setQuizDone]=useState(false);
  const serverProgress = useMemo(() => new Map((progressQuery.data ?? []).map(item=>[item.assetId,item])),[progressQuery.data]);
  const progress = useMemo(() => new Map([...serverProgress,...localProgress]),[serverProgress,localProgress]);
  const updateMutation = useMutation({ mutationFn:({id,value}:{id:string;value:FlashcardProgressUpdate})=>flashcardsAPI.update(deck,id,value), onSuccess:item=>queryClient.setQueryData<FlashcardProgress[]>(['flashcard-progress',deck], current=>[...(current??[]).filter(value=>value.assetId!==item.assetId),item]) });
  const update = (id:string,value:FlashcardProgressUpdate) => {
    setLocalProgress(current=>{ const next=new Map(current); const prior=progress.get(id); next.set(id,{ deck,assetId:id,status:value.status??prior?.status??'new',bookmarked:value.bookmarked??prior?.bookmarked??false,studiedCount:(prior?.studiedCount??0)+(value.studied?1:0),quizAttempts:(prior?.quizAttempts??0)+(value.quizCorrect===undefined?0:1),quizCorrect:(prior?.quizCorrect??0)+(value.quizCorrect?1:0),updatedAt:new Date().toISOString() }); return next; });
    if(me.data) updateMutation.mutate({id,value});
  };
  const filtered=useMemo(()=>filterFlashcards(cards,search,category,savedOnly,progress),[cards,search,category,savedOnly,progress]);
  useEffect(()=>{setActive(0);setFlipped(false)},[search,category,savedOnly]);
  useEffect(()=>{ const key=(event:KeyboardEvent)=>{ if(mode!=='study'||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return; if(event.key==='ArrowRight')move(1); if(event.key==='ArrowLeft')move(-1); if(event.key===' '||event.key==='Enter'){event.preventDefault();flipCard();} }; window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key); });
  const safeActive=Math.min(active,Math.max(0,filtered.length-1)); const card=filtered[safeActive]; const currentProgress=card?progress.get(card.id):undefined;
  function move(amount:number){setActive(index=>Math.max(0,Math.min(filtered.length-1,index+amount)));setFlipped(false)}
  function flipCard(){if(!card)return;setFlipped(value=>{if(!value)update(card.id,{studied:true});return !value})}
  const categories=[...new Set(cards.map(item=>item.category))].sort();
  const studied=cards.filter(item=>(progress.get(item.id)?.studiedCount??0)>0).length; const known=cards.filter(item=>progress.get(item.id)?.status==='known').length;
  const beginQuiz=(only?:string[])=>{const source=only?.length?cards.filter(item=>only.includes(item.id)):cards;setQuiz(buildQuizQuestions(source));setQuizIndex(0);setAnswer('');setIncorrect([]);setQuizDone(false);setMode('quiz')};
  const selectAnswer=(id:string)=>{if(answer)return;setAnswer(id);const correct=isQuizAnswerCorrect(quiz[quizIndex],id);if(!correct)setIncorrect(current=>[...current,quiz[quizIndex].card.id]);update(quiz[quizIndex].card.id,{quizCorrect:correct,status:correct?undefined:'needs_practice'})};
  const nextQuestion=()=>{if(quizIndex>=quiz.length-1){setQuizDone(true);return}setQuizIndex(index=>index+1);setAnswer('')};

  if(mode==='quiz') return <QuizPanel questions={quiz} index={quizIndex} answer={answer} incorrect={incorrect} done={quizDone} onAnswer={selectAnswer} onNext={nextQuestion} onRetry={()=>beginQuiz(incorrect)} onStudy={()=>setMode('study')}/>;
  return <>
    <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[minmax(0,1fr)_13rem_auto]"><label className="relative"><span className="sr-only">Search cards</span><Search className="absolute left-4 top-3 text-slate-400"/><input className="w-full rounded-xl border py-3 pl-11 pr-4" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by code, name or meaning…"/></label><select className="rounded-xl border px-3 py-3" value={category} onChange={event=>setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</select><button type="button" aria-pressed={savedOnly} className={`sign-control ${savedOnly?'bg-sky':''}`} onClick={()=>setSavedOnly(value=>!value)}><Bookmark size={17}/>Saved</button></section>
    <section className="grid gap-4 sm:grid-cols-3"><Stat label="Studied" value={`${studied}/${cards.length}`}/><Stat label="Known" value={String(known)}/><Stat label="Quiz accuracy" value={quizAccuracy(progress)}/></section>
    {reviewCount>0&&<details className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><summary className="cursor-pointer font-semibold">{reviewCount} supplied asset{reviewCount===1?' is':'s are'} excluded pending identification or duplicate review</summary><ul className="mt-2 list-disc space-y-1 pl-5">{reviewDashboardSymbols.map(item=><li key={item.id}><b>{item.name}:</b> {item.reviewReason}</li>)}</ul></details>}
    {!me.data&&!me.isPending&&<p className="rounded-xl bg-sky/50 p-3 text-sm text-slate-700">Sign in to save bookmarks, mastery and quiz progress across devices.</p>}
    {card?<section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="rounded-3xl border bg-white p-5 shadow-sm"><div className={`sign-flashcard ${flipped?'sign-flashcard-flipped':''}`}><button type="button" onClick={flipCard} className="sign-flashcard-inner" aria-label={deck==='dashboard_symbols'?'Flip dashboard symbol card':`Flip ${card.name} card`} aria-pressed={flipped}><span className="sign-flashcard-face sign-flashcard-front"><img className="h-52 w-64 object-contain sm:h-64" src={card.image} alt={deck==='dashboard_symbols'?'Dashboard warning symbol to identify':card.name}/>{deck!=='dashboard_symbols'&&<strong>{card.name}</strong>}<small>{deck==='dashboard_symbols'?'What does this symbol mean?':'Tap to reveal details'}</small></span><span className="sign-flashcard-face sign-flashcard-back"><small>{card.kind?`${card.kind.toUpperCase()} · ${severityLabel(card.severity)}`:'RVV 1990'}</small><strong>{card.name}</strong><p>{card.meaning}</p><p className="text-sm"><b>What to do:</b> {card.action}</p></span></button></div><div className="mt-5 flex flex-wrap justify-center gap-2"><button className="sign-control" disabled={!safeActive} onClick={()=>move(-1)}><ChevronLeft/>Previous</button><button className="sign-control" onClick={()=>{setFlipped(false);setActive(Math.floor(Math.random()*filtered.length))}}><Shuffle/>Shuffle</button><button className="sign-control" disabled={safeActive===filtered.length-1} onClick={()=>move(1)}>Next<ChevronRight/></button></div><div className="mt-3 flex flex-wrap justify-center gap-2"><button className={`sign-control ${currentProgress?.bookmarked?'bg-sky':''}`} onClick={()=>update(card.id,{bookmarked:!currentProgress?.bookmarked})}><Bookmark size={17} fill={currentProgress?.bookmarked?'currentColor':'none'}/>Bookmark</button><button className={`sign-control ${currentProgress?.status==='known'?'bg-emerald-50':''}`} onClick={()=>update(card.id,{status:'known'})}><Check size={17}/>Known</button><button className={`sign-control ${currentProgress?.status==='needs_practice'?'bg-amber-50':''}`} onClick={()=>update(card.id,{status:'needs_practice'})}><RotateCcw size={17}/>Needs practice</button></div><p className="mt-3 text-center text-sm text-slate-500">{safeActive+1} of {filtered.length} · Arrow keys navigate · Space flips</p>{deck==='dashboard_symbols'&&<button type="button" className="mx-auto mt-4 block rounded-xl bg-sun px-5 py-3 font-bold" onClick={()=>beginQuiz()}>Start 5-question quiz</button>}</div><aside className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Browse cards</h2><div className="mt-4 grid max-h-[42rem] grid-cols-2 gap-2 overflow-y-auto pr-1">{filtered.map((item,index)=><button type="button" key={item.id} onClick={()=>{setActive(index);setFlipped(false)}} className={`rounded-xl border p-2 ${index===safeActive?'border-ocean bg-sky':'hover:border-ocean'}`} aria-label={deck==='dashboard_symbols'?`Study dashboard symbol ${index+1}`:`Study ${item.name}`}><img className="mx-auto h-16 w-20 object-contain" src={item.image} alt="" loading="lazy"/>{deck!=='dashboard_symbols'&&<span className="mt-1 block text-xs font-bold">{item.name}</span>}{progress.get(item.id)?.bookmarked&&<Bookmark className="mx-auto mt-1 text-ocean" size={13} fill="currentColor"/>}</button>)}</div></aside></section>:<p className="rounded-2xl bg-slate-100 p-5 text-slate-600">No cards match these filters.</p>}
  </>;
}

function QuizPanel({questions,index,answer,incorrect,done,onAnswer,onNext,onRetry,onStudy}:{questions:QuizQuestion[];index:number;answer:string;incorrect:string[];done:boolean;onAnswer:(id:string)=>void;onNext:()=>void;onRetry:()=>void;onStudy:()=>void}){
  if(done)return <section className="rounded-3xl border bg-white p-8 text-center"><p className="font-bold text-ocean">QUIZ COMPLETE</p><h2 className="mt-2 text-3xl font-bold">{questions.length-incorrect.length}/{questions.length} correct</h2><p className="mt-2 text-slate-600">{incorrect.length?'Retry the symbols that need another look.':'Excellent — every answer was correct.'}</p><div className="mt-5 flex justify-center gap-2">{incorrect.length>0&&<button className="rounded-xl bg-sun px-5 py-3 font-bold" onClick={onRetry}>Retry incorrect</button>}<button className="sign-control" onClick={onStudy}>Back to study</button></div></section>;
  const question=questions[index]; if(!question)return <ErrorState message="There are not enough verified symbols for a quiz."/>; const correct=answer===question.card.id;
  return <section className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm"><div className="flex justify-between text-sm font-bold text-slate-500"><span>DASHBOARD QUIZ</span><span>{index+1}/{questions.length}</span></div><img className="mx-auto my-6 h-52 w-64 object-contain" src={question.card.image} alt="Dashboard symbol to identify"/><h2 className="text-center text-2xl font-bold">What does this symbol mean?</h2><div className="mt-5 grid gap-2">{question.options.map(option=><button type="button" disabled={Boolean(answer)} onClick={()=>onAnswer(option.id)} key={option.id} className={`rounded-xl border p-4 text-left font-semibold ${answer&&option.id===question.card.id?'border-emerald-500 bg-emerald-50':answer===option.id?'border-red-400 bg-red-50':'hover:border-ocean'}`}>{option.name}</button>)}</div>{answer&&<div className={`mt-5 rounded-xl p-4 ${correct?'bg-emerald-50':'bg-amber-50'}`} role="status"><strong>{correct?'Correct':'Not quite'}</strong><p className="mt-1 text-sm">{question.card.meaning}</p><p className="mt-2 text-sm"><b>What to do:</b> {question.card.action}</p><button className="mt-4 rounded-xl bg-ocean px-4 py-2 font-bold text-white" onClick={onNext}>{index===questions.length-1?'See results':'Next question'}</button></div>}<button className="sign-control mt-5" onClick={onStudy}><X size={17}/>Leave quiz</button></section>;
}

function Stat({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-white p-4"><strong className="text-2xl">{value}</strong><span className="ml-2 text-sm text-slate-500">{label}</span></div>}
function severityLabel(value?:SymbolSeverity){return value==='green-blue'?'Green/Blue':value==='amber'?'Amber/Yellow':value==='red'?'Red':'Informational'}
function quizAccuracy(progress:Map<string,FlashcardProgress>){const items=[...progress.values()];const attempts=items.reduce((sum,item)=>sum+item.quizAttempts,0);const correct=items.reduce((sum,item)=>sum+item.quizCorrect,0);return attempts?`${Math.round(correct/attempts*100)}%`:'—'}
