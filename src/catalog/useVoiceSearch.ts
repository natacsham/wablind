import { useEffect, useRef, useState } from "react";

type Results = ArrayLike<{
  isFinal: boolean;
  [index: number]: { transcript: string };
}>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: { results: Results }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type Session = {
  recognition: Recognition;
  timeout?: number;
  watchdog?: number;
  finalText: string;
};

function constructor() {
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return window.isSecureContext
    ? host.SpeechRecognition || host.webkitSpeechRecognition
    : undefined;
}

const errors: Record<string, string> = {
  "not-allowed":
    "Microfone não autorizado. Verifique a permissão do site no navegador ou digite o nome da página.",
  "service-not-allowed":
    "O navegador não permitiu o reconhecimento de voz. Continue digitando.",
  "audio-capture":
    "Não foi possível acessar o microfone. Verifique o dispositivo ou digite o nome da página.",
  network:
    "O serviço de voz não respondeu. Verifique a conexão ou continue digitando.",
  "no-speech":
    "Nenhuma fala foi reconhecida. Tente novamente ou digite o nome da página.",
  "language-not-supported":
    "O reconhecimento em português não está disponível. Continue digitando.",
};

/** One explicit, bounded utterance. No recording, automatic restart or navigation. */
export function useVoiceSearch(onText: (text: string) => void) {
  const [phase, setPhase] = useState<
    "idle" | "starting" | "listening" | "stopping"
  >("idle");
  const [message, setMessage] = useState("");
  const [provisional, setProvisional] = useState("");
  const current = useRef<Session | null>(null);
  const callback = useRef(onText);
  callback.current = onText;

  function detach() {
    const session = current.current;
    current.current = null;
    if (!session) return;
    window.clearTimeout(session.timeout);
    window.clearTimeout(session.watchdog);
    const rec = session.recognition;
    rec.onstart = rec.onend = rec.onresult = rec.onerror = null;
    try {
      rec.abort();
    } catch {
      /* The service may have already closed. */
    }
  }
  function cancel(
    notice = "Microfone encerrado. Você pode continuar digitando.",
  ) {
    if (!current.current) return;
    detach();
    setPhase("idle");
    setProvisional("");
    setMessage(notice);
  }
  function finish(session: Session) {
    if (current.current !== session) return;
    const text = session.finalText
      .trim()
      .replace(/[.,!?;:]+$/u, "")
      .trim()
      .slice(0, 200);
    detach();
    setPhase("idle");
    setProvisional("");
    if (text) {
      callback.current(text);
      setMessage(
        "Nome reconhecido. Revise o campo e escolha uma página ou use Buscar.",
      );
    } else setMessage(errors["no-speech"]);
  }
  function stop() {
    const session = current.current;
    if (!session) return;
    window.clearTimeout(session.timeout);
    setPhase("stopping");
    setMessage("Encerrando o microfone…");
    // Browsers may omit the end event after a device or service failure.
    session.watchdog = window.setTimeout(() => finish(session), 1500);
    try {
      session.recognition.stop();
    } catch {
      finish(session);
    }
  }
  function start() {
    if (current.current) return;
    const Constructor = constructor();
    if (!Constructor) {
      setMessage(
        "Busca por voz indisponível neste navegador. Use o campo de texto.",
      );
      return;
    }
    try {
      const rec = new Constructor();
      const session: Session = { recognition: rec, finalText: "" };
      current.current = session;
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      setProvisional("");
      setPhase("starting");
      setMessage(
        "Aguardando o microfone. Autorize o acesso se o navegador solicitar.",
      );
      rec.onstart = () => {
        if (current.current !== session || session.watchdog) return;
        setPhase("listening");
        setMessage(
          "Microfone ativo. Diga o nome da página. Use Parar ou Escape para encerrar.",
        );
      };
      rec.onresult = (event) => {
        if (current.current !== session) return;
        const finals: string[] = [],
          interim: string[] = [];
        // Each event contains the current hypotheses, not additional text to append.
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          (result.isFinal ? finals : interim).push(result[0]?.transcript || "");
        }
        session.finalText = finals.join(" ").replace(/\s+/gu, " ");
        setProvisional(interim.join(" ").slice(0, 200));
        if (session.finalText.trim()) finish(session);
      };
      rec.onerror = (event) => {
        if (current.current !== session) return;
        detach();
        setPhase("idle");
        setProvisional("");
        setMessage(
          errors[event.error] ||
            "A busca por voz foi interrompida. Tente novamente ou continue digitando.",
        );
      };
      rec.onend = () => finish(session);
      session.timeout = window.setTimeout(stop, 30000);
      rec.start();
    } catch {
      detach();
      setPhase("idle");
      setProvisional("");
      setMessage(
        "Não foi possível iniciar o microfone. Você pode continuar digitando.",
      );
    }
  }

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const hide = () => {
      if (document.hidden) cancel("Microfone encerrado ao sair desta aba.");
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", detach);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", detach);
      detach();
    };
  }, []);

  return {
    supported: Boolean(constructor()),
    phase,
    busy: phase !== "idle",
    message,
    provisional,
    start,
    stop,
    cancel,
  };
}
