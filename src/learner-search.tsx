import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { learningAPI } from './api/learning';

function useDebounced<T>(value:T,delay=300){const [debounced,setDebounced]=useState(value);useEffect(()=>{const timer=window.setTimeout(()=>setDebounced(value),delay);return()=>window.clearTimeout(timer)},[delay,value]);return debounced}
function Match({text,query}:{text:string;query:string}){if(!query)return <>{text}</>;const parts=text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig'));return <>{parts.map((part,index)=>part.toLowerCase()===query.toLowerCase()?<mark className="rounded bg-yellow-200 px-0.5" key={index}>{part}</mark>:<Fragment key={index}>{part}</Fragment>)}</>}

export function LearningSearch({compact=false}:{compact?:boolean}){
  const [search,setSearch]=useState('');const [topic,setTopic]=useState('');const query=useDebounced(search.trim());
  const resultsRef=useRef<HTMLDivElement>(null);
  const topics=useQuery({queryKey:['topics'],queryFn:learningAPI.listTopics});
  const results=useQuery({queryKey:['learning-search',query,topic],queryFn:()=>learningAPI.search(query,topic),enabled:query.length>=2});
  return <section className={compact?'':'mx-auto max-w-4xl'} aria-labelledby="learning-search-title">
    {!compact&&<><p className="font-bold text-ocean">FIND YOUR NEXT LESSON</p><h1 id="learning-search-title" className="mt-1 text-3xl font-bold">Search learning content</h1></>}
    <div className={`${compact?'':'mt-5'} grid gap-3 sm:grid-cols-[1fr_13rem]`}><label className="relative"><span className="sr-only">Search topics and lessons</span><Search className="absolute left-4 top-3.5 text-slate-400" size={20}/><input className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-sky" value={search} onChange={(event)=>setSearch(event.target.value)} onKeyDown={(event)=>{if(event.key==='ArrowDown'){event.preventDefault();resultsRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()}}} placeholder="Search topics and lessons…" /></label><select aria-label="Filter lessons by topic" className="rounded-xl border border-slate-300 bg-white px-3 py-3" value={topic} onChange={(event)=>setTopic(event.target.value)}><option value="">All topics</option>{topics.data?.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    {query.length>0&&query.length<2&&<p className="mt-3 text-sm text-slate-500">Enter at least two characters.</p>}
    {results.isFetching&&<p className="mt-4 text-sm text-slate-500" role="status">Searching…</p>}
    {results.error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-red-800" role="alert">Search could not be completed.</p>}
    {results.data&&<div ref={resultsRef} className="mt-4 grid gap-3">{results.data.map((item)=><Link key={`${item.type}-${item.id}`} to={item.type==='topic'?`/topics/${item.id}`:`/lessons/${item.id}`} className="rounded-xl border bg-white p-4 shadow-sm hover:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean"><span className="text-xs font-bold uppercase text-ocean">{item.type}</span><h2 className="mt-1 font-bold"><Match text={item.title} query={query}/></h2>{item.description&&<p className="mt-1 line-clamp-2 text-sm text-slate-600"><Match text={item.description} query={query}/></p>}</Link>)}{results.data.length===0&&<p className="rounded-xl bg-slate-100 p-4 text-slate-600">No published topics or lessons match your search.</p>}</div>}
  </section>
}

export function SearchPage(){return <LearningSearch/>}
