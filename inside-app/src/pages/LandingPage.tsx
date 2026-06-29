import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LangContext'
import { useScrollRatio, useInView } from '../hooks/useScroll'
import Reveal from '../components/Reveal'

const NAV_HEIGHT = 56

export default function LandingPage() {
  const navigate = useNavigate()
  const { t, lang, toggleLang } = useLang()
  const ratio = useScrollRatio()

  // 히어로 타이핑 효과
  const heroQ = t.hero.question.replace('\n', ' ')
  const [typed, setTyped] = useState('')
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(heroQ.slice(0, i))
      if (i >= heroQ.length) clearInterval(id)
    }, 45)
    return () => clearInterval(id)
  }, [heroQ])

  // 스크롤 시 네비 축소
  const [navSolid, setNavSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setNavSolid(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - NAV_HEIGHT, behavior: 'smooth' })
  }

  const goSample = () =>
    navigate('/result', {
      state: {
        meetingName: lang === 'ko' ? '금요일 저녁 회식' : 'Friday dinner',
        participants: ['민수', '지현', '영호', '수진'],
        detectedSpeakerCount: 4,
        speakers: [
          { pitch: 150, talkTime: 80, voiceSamples: [150] },
          { pitch: 180, talkTime: 55, voiceSamples: [180] },
          { pitch: 210, talkTime: 40, voiceSamples: [210] },
          { pitch: 240, talkTime: 25, voiceSamples: [240] },
        ],
        transcription: '샘플 대화 데이터 - 김치찌개에 라면 사리 넣기 논쟁',
        transcriptionDuration: 180,
      },
    })

  // 스크롤 오버레이 색상 변화
  const overlayHue = Math.round(ratio * 28)
  const overlayOpacity = 0.15 + ratio * 0.35

  return (
    <div className="landing-root w-full text-white" style={{ paddingTop: NAV_HEIGHT }}>
      {/* 스크롤 진행 바 */}
      <div className="scroll-progress" style={{ width: `${ratio * 100}%` }} />

      {/* 그레인 오버레이 */}
      <div className="grain-overlay" />

      {/* 스크롤 컬러 오버레이 (화면 전체 색감 변화) */}
      <div
        className="fixed inset-0 pointer-events-none z-[80] transition-opacity duration-300"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, hsla(${overlayHue}, 100%, 55%, ${overlayOpacity}), transparent 60%)`,
        }}
      />

      {/* ===== NAV ===== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[95] transition-all duration-300 ${
          navSolid ? 'bg-black/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
        }`}
        style={{ height: NAV_HEIGHT }}
      >
        <div className="max-w-6xl mx-auto h-full px-5 flex items-center justify-between">
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center glow-orange">
              <span className="text-sm font-black text-black">I</span>
            </div>
            <span className="font-bold tracking-tight">Inside</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-white/15 hover:bg-white/5 transition-colors"
            >
              {t.nav.langLabel}
            </button>
            <button
              onClick={() => scrollTo('how')}
              className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors"
            >
              {t.how.tag}
            </button>
            <button
              onClick={() => navigate('/history')}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {t.nav.history}
            </button>
            <button
              onClick={() => navigate('/recording')}
              className="px-4 py-1.5 bg-primary text-black text-sm font-bold rounded-full active:scale-95 transition-transform"
            >
              {t.nav.start}
            </button>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section
        id="hero"
        className="relative min-h-[100svh] flex flex-col items-center justify-center px-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-black to-black anim-gradient" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-primary/20 blur-[120px] rounded-full" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-40 h-40 rounded-full border border-primary/30 anim-ring" />
        </div>

        <div className="relative z-10 text-center max-w-3xl">
          <Reveal direction="scale" once>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-primary/30 bg-primary/5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary tracking-wide">{t.hero.badge}</span>
            </div>
          </Reveal>

          <h1 className="landing-hero-title text-5xl sm:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-glow">
            <span className="cursor-blink">{typed}</span>
          </h1>

          <Reveal direction="up" delay={400} once>
            <p className="text-base sm:text-lg text-gray-400 whitespace-pre-line mb-10 max-w-xl mx-auto">
              {t.hero.sub}
            </p>
          </Reveal>

          <Reveal direction="up" delay={700} once>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => navigate('/recording')}
                className="group relative px-8 py-4 bg-primary text-black font-bold rounded-full active:scale-95 transition-transform glow-orange overflow-hidden shimmer-line"
              >
                <span className="relative z-10">{t.hero.cta}</span>
              </button>
              <button
                onClick={goSample}
                className="px-6 py-4 text-sm text-gray-300 border border-white/15 rounded-full hover:bg-white/5 transition-colors"
              >
                ✨ {t.hero.sample}
              </button>
            </div>
          </Reveal>
        </div>

        <button
          onClick={() => scrollTo('problem')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
        >
          <span className="text-[10px] tracking-widest uppercase">{t.hero.scroll}</span>
          <div className="w-5 h-9 border border-gray-600 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-primary rounded-full anim-floaty" />
          </div>
        </button>
      </section>

      {/* ===== PROBLEM ===== */}
      <section id="problem" className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal direction="blur" once>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-gray-600" />
              <span className="text-xs text-gray-500 uppercase tracking-widest">{t.problem.tag}</span>
            </div>
          </Reveal>

          <Reveal direction="up" delay={150} once>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-16 whitespace-pre-line">
              {t.problem.title}
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-8 mb-16">
            <Reveal direction="left" delay={200} once>
              <div>
                <p className="text-2xl font-bold mb-3">{t.problem.p1}</p>
                <p className="text-gray-400 whitespace-pre-line">{t.problem.p2}</p>
              </div>
            </Reveal>
            <Reveal direction="right" delay={350} once>
              <div className="sm:pt-12">
                <p className="text-gray-500 text-lg">{t.problem.p3}</p>
              </div>
            </Reveal>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <Reveal direction="scale" delay={200} once>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/10">
                <div className="text-5xl font-black text-primary mb-2">{t.problem.stat1}</div>
                <div className="text-sm text-gray-400">{t.problem.stat1d}</div>
              </div>
            </Reveal>
            <Reveal direction="scale" delay={350} once>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-800/40 to-transparent border border-white/5">
                <div className="text-5xl font-black text-white mb-2">{t.problem.stat2}</div>
                <div className="text-sm text-gray-400">{t.problem.stat2d}</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== SOLUTION ===== */}
      <section id="solution" className="relative py-32 px-6 bg-gradient-to-b from-black via-zinc-950 to-black">
        <div className="max-w-5xl mx-auto">
          <Reveal direction="blur" once>
            <div className="flex items-center gap-3 mb-8 justify-center">
              <div className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">{t.solution.tag}</span>
              <div className="w-8 h-px bg-primary" />
            </div>
          </Reveal>

          <Reveal direction="up" delay={150} once>
            <h2 className="text-4xl sm:text-6xl font-black text-center tracking-tight leading-[1.1] mb-20 whitespace-pre-line">
              {t.solution.title}
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: '01', t: t.solution.step1, d: t.solution.step1d, delay: 0 },
              { n: '02', t: t.solution.step2, d: t.solution.step2d, delay: 150 },
              { n: '03', t: t.solution.step3, d: t.solution.step3d, delay: 300 },
            ].map((s) => (
              <Reveal key={s.n} direction="up" delay={s.delay} once>
                <div className="group relative p-8 rounded-3xl border border-white/5 bg-zinc-900/40 hover:border-primary/30 hover:bg-zinc-900/70 transition-all duration-500 h-full">
                  <div className="text-xs font-mono text-primary mb-6">{s.n}</div>
                  <div className="text-2xl font-black mb-3">{s.t}</div>
                  <div className="text-sm text-gray-400">{s.d}</div>
                  <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOOKS (후킹 포인트) ===== */}
      <section id="hooks" className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal direction="blur" once>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">{t.hooks.tag}</span>
            </div>
          </Reveal>

          <Reveal direction="up" delay={150} once>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-20 whitespace-pre-line">
              {t.hooks.title}
            </h2>
          </Reveal>

          <HookCard
            label={t.hooks.mvp.label}
            title={t.hooks.mvp.title}
            desc={t.hooks.mvp.desc}
            emoji="👑"
            accent="from-amber-500/20 to-yellow-500/5"
            align="left"
          />
          <HookCard
            label={t.hooks.meme.label}
            title={t.hooks.meme.title}
            desc={t.hooks.meme.desc}
            emoji="🔥"
            accent="from-rose-500/20 to-red-500/5"
            align="right"
          />
          <HookCard
            label={t.hooks.twist.label}
            title={t.hooks.twist.title}
            desc={t.hooks.twist.desc}
            emoji="⚡"
            accent="from-purple-500/20 to-indigo-500/5"
            align="left"
          />
          <HookCard
            label={t.hooks.chemistry.label}
            title={t.hooks.chemistry.title}
            desc={t.hooks.chemistry.desc}
            emoji="💫"
            accent="from-cyan-500/20 to-blue-500/5"
            align="right"
          />
        </div>
      </section>

      {/* ===== PREMIUM ===== */}
      <section id="premium" className="relative py-32 px-6 bg-gradient-to-b from-black to-zinc-950">
        <div className="max-w-5xl mx-auto">
          <Reveal direction="blur" once>
            <div className="flex items-center gap-3 mb-8 justify-center">
              <div className="w-8 h-px bg-primary" />
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">{t.premium.tag}</span>
              <div className="w-8 h-px bg-primary" />
            </div>
          </Reveal>

          <Reveal direction="up" delay={150} once>
            <h2 className="text-4xl sm:text-6xl font-black text-center tracking-tight leading-[1.1] mb-16">
              {t.premium.title}
            </h2>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🎞️', title: t.premium.shorts, d: t.premium.shortsd, color: 'from-amber-500/20 to-red-500/20' },
              { icon: '🎬', title: t.premium.poster, d: t.premium.posterd, color: 'from-pink-500/20 to-rose-500/20' },
              { icon: '📚', title: t.premium.comic, d: t.premium.comicd, color: 'from-blue-500/20 to-purple-500/20' },
              { icon: '📔', title: t.premium.book, d: t.premium.bookd, color: 'from-emerald-500/20 to-teal-500/20' },
            ].map((f, i) => (
              <Reveal key={f.title} direction="scale" delay={i * 120} once>
                <div className={`bg-gradient-to-br ${f.color} border border-white/10 rounded-3xl p-6 h-full hover:scale-[1.03] active:scale-[0.98] transition-transform cursor-pointer`}>
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <div className="font-bold text-sm mb-1">{f.title}</div>
                  <div className="text-xs text-gray-300">{f.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW ===== */}
      <section id="how" className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal direction="blur" once>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-gray-600" />
              <span className="text-xs text-gray-500 uppercase tracking-widest">{t.how.tag}</span>
            </div>
          </Reveal>

          <Reveal direction="up" delay={150} once>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-20">
              {t.how.title}
            </h2>
          </Reveal>

          <div className="space-y-4">
            {t.how.steps.map((s, i) => (
              <Reveal key={i} direction="left" delay={i * 150} once>
                <div className="flex items-center gap-6 p-6 rounded-3xl border border-white/5 bg-zinc-900/40 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-primary font-black">{i + 1}</span>
                  </div>
                  <div>
                    <div className="text-xl font-bold mb-1">{s.t}</div>
                    <div className="text-sm text-gray-400">{s.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="cta" className="relative py-40 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[40vh] bg-primary/20 blur-[140px] rounded-full" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <Reveal direction="scale" once>
            <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] mb-8 whitespace-pre-line text-glow">
              {t.cta.title}
            </h2>
          </Reveal>
          <Reveal direction="up" delay={200} once>
            <p className="text-gray-400 mb-12 text-lg">{t.cta.sub}</p>
          </Reveal>
          <Reveal direction="up" delay={400} once>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/recording')}
                className="px-10 py-5 bg-primary text-black font-bold rounded-full active:scale-95 transition-transform glow-orange text-lg"
              >
                {t.cta.btn}
              </button>
              <button
                onClick={() => navigate('/history')}
                className="px-8 py-5 text-gray-300 border border-white/15 rounded-full hover:bg-white/5 transition-colors"
              >
                {t.cta.history}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-xs font-black text-black">I</span>
            </div>
            <span className="text-sm text-gray-500">{t.footer.tagline}</span>
          </div>
          <span className="text-xs text-gray-600">{t.footer.copy}</span>
        </div>
      </footer>
    </div>
  )
}

/* ===== 후킹 카드 ===== */
function HookCard({
  label,
  title,
  desc,
  emoji,
  accent,
  align,
}: {
  label: string
  title: string
  desc: string
  emoji: string
  accent: string
  align: 'left' | 'right'
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 })
  const alignClass = align === 'left' ? 'sm:flex-row' : 'sm:flex-row-reverse'

  return (
    <div
      ref={ref}
      className={`flex flex-col ${alignClass} items-center gap-8 mb-20 transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
      }`}
    >
      <div className={`relative w-full sm:w-1/2 aspect-square max-w-xs rounded-3xl bg-gradient-to-br ${accent} border border-white/10 flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="text-7xl anim-floaty relative z-10">{emoji}</div>
        <div className="absolute -inset-1 shimmer-line rounded-3xl opacity-40" />
      </div>

      <div className="w-full sm:w-1/2">
        <div className="inline-block px-3 py-1 mb-4 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-xs text-primary font-semibold tracking-wider uppercase">{label}</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">{title}</h3>
        <p className="text-gray-400 text-base leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}