import { useState } from 'react';

export type TrafficSignSize = 'inline' | 'card' | 'exam';
const validCode = /^[A-Z][0-9]{1,2}[a-z]?$/;

// Deliberately require a sign-reference word. Do not turn unrelated IDs such
// as a lesson number or user input into an image.
export function referencedTrafficSignCodes(value: string) {
  return [...value.matchAll(/\b(?:traffic\s+sign|road\s+sign|sign|verkeersbord)\s+([A-L][0-9]{1,2}[a-z]?)\b/gi)]
    .map(match => `${match[1][0].toUpperCase()}${match[1].slice(1)}`)
    .filter((code, index, values) => validCode.test(code) && values.indexOf(code) === index);
}

/** Renders only code-shaped RVV references, with an accessible text fallback. */
export function TrafficSign({ code, size = 'inline', className = '' }: { code: string; size?: TrafficSignSize; className?: string }) {
  const normalized = code.trim();
  const [missing, setMissing] = useState(!validCode.test(normalized));
  if (missing) return <span className={`traffic-sign-fallback ${className}`} title={normalized}>{normalized}</span>;
  return <span className={`traffic-sign traffic-sign-${size} ${className}`} title={`Dutch RVV traffic sign ${normalized}`}><img src={`/traffic-signs/${normalized[0]}/${normalized}.svg`} alt={`Dutch RVV traffic sign ${normalized}`} onError={() => setMissing(true)} /><span className="sr-only">{normalized}</span></span>;
}
