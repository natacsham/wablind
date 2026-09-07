import { useEffect, useRef, useState } from 'react';
import type { ReadingDocument } from '../shared/model';
import { readingText } from '../shared/export';

type Preferences = { size: number; spacing: boolean };
export function initialReadingPreferences(): Preferences {
  try { const value = JSON.parse(localStorage.getItem('wablind.reading-preferences') || '{}'); return { size: [1, 1.2, 1.4].includes(value.size) ? value.size : 1, spacing: value.spacing === true }; } catch { return { size: 1, spacing: false }; }
}
export function ReadingControls({ document: doc, preferences, onChange }: { document: ReadingDocument; preferences: Preferences; onChange: (value: Preferences) => void }) {
  const [state, setState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [message, setMessage] = useState('');
  const run = useRef(0);
  const available = typeof window.speechSynthesis !== 'undefined';
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => () => { run.current++; if (utterance.current && available) window.speechSynthesis.cancel(); }, [available]);

  function stop() { run.current++; window.speechSynthesis.cancel(); utterance.current = null; setState('idle'); setMessage('Leitura em voz encerrada.'); }
  function play() {
    if (state === 'paused') { window.speechSynthesis.resume(); setState('speaking'); setMessage('Leitura em voz retomada.'); return; }
    const ticket = ++run.current;
    const chunks = readingText(doc).match(/.{1,240}(?:\s|$)|\S{1,240}/g) || [];
    window.speechSynthesis.cancel(); setState('speaking'); setMessage('Leitura em voz iniciada.');
    function next(index: number) {
      if (ticket !== run.current) return;
      if (index >= chunks.length) { utterance.current = null; setState('idle'); setMessage('Leitura em voz concluída.'); return; }
      const u = new SpeechSynthesisUtterance(chunks[index]); utterance.current = u; u.lang = doc.language;
      u.onend = () => next(index + 1);
      u.onerror = () => { if (ticket === run.current) { setState('idle'); setMessage('A leitura em voz foi interrompida pelo navegador. Você pode reiniciar ou continuar pelo texto e seu leitor de tela.'); } };
      window.speechSynthesis.speak(u);
    }
    next(0);
  }
  function change(value: Preferences) { onChange(value); try { localStorage.setItem('wablind.reading-preferences', JSON.stringify(value)); } catch { setMessage('Preferência aplicada nesta leitura. O navegador não permitiu guardá-la.'); } }
  return <section className="reading-controls" aria-label="Controles da leitura"><div className="actions">
    <button onClick={play} disabled={!available || state === 'speaking'} className="primary">{state === 'paused' ? 'Continuar leitura em voz' : 'Ouvir leitura'}</button>
    <button onClick={() => { window.speechSynthesis.pause(); setState('paused'); setMessage('Leitura em voz pausada.'); }} disabled={!available || state !== 'speaking'}>Pausar</button>
    <button onClick={stop} disabled={!available || state === 'idle'}>Parar</button>
  </div>{!available && <p className="field-help">A voz do navegador está indisponível. Todo conteúdo permanece em texto para leitura e tecnologias assistivas.</p>}
    <details><summary>Opções de leitura</summary><label htmlFor="reading-size">Tamanho do texto</label><select id="reading-size" value={preferences.size} onChange={event => change({ ...preferences, size: Number(event.target.value) })}><option value={1}>Padrão</option><option value={1.2}>Ampliado</option><option value={1.4}>Mais ampliado</option></select><label className="check"><input type="checkbox" checked={preferences.spacing} onChange={event => change({ ...preferences, spacing: event.target.checked })} />Aumentar espaçamento entre linhas e parágrafos</label></details>
    <p role="status" className="field-help">{message}</p>
  </section>;
}
