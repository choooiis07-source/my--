import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Lang, type Translation } from './translations'

interface LangContextValue {
  lang: Lang
  t: Translation
  toggleLang: () => void
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko')

  const toggleLang = () => setLang((p) => (p === 'ko' ? 'en' : 'ko'))

  return (
    <LangContext.Provider value={{ lang, t: translations[lang] as unknown as Translation, toggleLang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}