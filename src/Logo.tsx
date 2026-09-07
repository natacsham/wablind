export function Logo({ large = false }: { large?: boolean }) {
  return <span className={`logo${large ? ' logo-large' : ''}`}><svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" width="44" height="44"><rect width="64" height="64" rx="18" fill="#4735c9" /><path d="M14 19h10l8 20 8-20h10L36 49h-8Z" fill="white" /><path d="M16 16h10M38 16h10" stroke="#63eadc" strokeWidth="5" strokeLinecap="round" /></svg><span>WABlind</span></span>;
}
export function MicrophoneIcon() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>;
}
