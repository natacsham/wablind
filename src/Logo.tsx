export function Logo({ large = false }: { large?: boolean }) {
  return <span className={`logo${large ? ' logo-large' : ''}`}><svg aria-hidden="true" focusable="false" viewBox="0 0 96 96" width="44" height="44"><circle cx="48" cy="48" r="42" fill="#4735c9" /><path d="M30 68V30h20c8 0 14 5 14 14s-6 14-14 14H35v10" fill="none" stroke="#f2f2ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><path d="M30 54h18" stroke="#63eadc" strokeWidth="6" strokeLinecap="round" /><path d="M26 68h26" stroke="#d9d6ff" strokeWidth="4" strokeLinecap="round" /></svg><span>WABlind</span></span>;
}
export function MicrophoneIcon() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>;
}
