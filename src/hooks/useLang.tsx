import { useState, useCallback, useContext, createContext } from "react";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { t as translate } from "@/lib/i18n";

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; }

const LangContext = createContext<LangCtx>({ lang: "zh", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("corolar_lang") as Lang) || "zh");
  const setLang = useCallback((l: Lang) => { localStorage.setItem("corolar_lang", l); setLangState(l); }, []);
  const t = useCallback((key: string) => translate(key, lang), [lang]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }
