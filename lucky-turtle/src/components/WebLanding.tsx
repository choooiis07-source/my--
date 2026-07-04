import { useEffect, useRef, useState } from 'react'
import { Turtle } from './Turtle'

type Locale = 'ko' | 'en'
type Mood = 'walking' | 'happy' | 'annoyed' | 'angry' | 'sad' | 'shy' | 'sleepy'

const DOWNLOAD_URL = 'https://github.com/choooiis07-source/my--/releases/latest/download/Lucky-Turtle-Windows-0.1.0.zip'

const copy = {
  ko: {
    nav: ['이야기', '움직임', '반응'],
    downloadShort: '다운로드',
    eyebrow: 'DESKTOP COMPANION FOR WINDOWS',
    heroTitleA: '집중은 그대로.',
    heroTitleB: '행운은 화면 위로.',
    heroBody: '어떤 앱을 열어도, 작은 바다거북이가 화면 가장자리를 유유히 산책해요. 방해하지 않고 곁에 머무는 가장 귀여운 행운입니다.',
    primaryCta: 'Windows에 거북이 데려오기',
    secondaryCta: '먼저 만져보기',
    downloadMeta: 'Windows 10/11 · ZIP 압축 해제 후 설치 · 무료',
    badges: ['항상 화면 위에', '감정으로 반응', '화면 선을 탐색'],
    scroll: 'SCROLL TO MEET YOUR LUCK',
    storyEyebrow: '01 / ALIVE ON YOUR SCREEN',
    storyTitle: '작업 화면이\n거북이의 세상이 됩니다.',
    storyBody: '무작위로 떠돌지 않아요. 화면 아래를 걷다가 길이 될 만한 세로선을 발견하면 천천히 올라갑니다.',
    storySteps: ['아래를 천천히 산책하고', '세로선을 만나면 올라가고', '당신의 손길에 표정으로 답해요'],
    featureEyebrow: '02 / TINY, BUT ALIVE',
    featureTitle: '귀엽기만 한 위젯은\n오래 남지 않으니까.',
    features: [
      ['방해하지 않는 존재감', '작업은 그대로 이어가세요. 거북이는 화면 가장자리에서 조용히 자신의 하루를 보냅니다.', '01'],
      ['손길을 기억하는 감정', '한 번은 눈웃음, 자꾸 건드리면 화난 눈. 다섯 번째에는 등딱지 속으로 쏙 숨어요.', '02'],
      ['오늘의 기분을 닮은 색', '차분한 초록부터 선명한 코랄까지. 등딱지 색과 움직임 속도를 내 기분에 맞게 고르세요.', '03'],
    ],
    demoEyebrow: '03 / TOUCH & FEEL',
    demoTitle: '말풍선 없이도,\n기분은 다 보여요.',
    demoBody: '거북이를 여러 번 눌러 보세요. 손길이 쌓일수록 표정이 달라집니다.',
    touch: '거북이 만지기',
    touchCount: '번의 손길',
    moodLabels: ['산책 중', '반가워!', '조금 귀찮아', '화났어!', '슬퍼…', '등딱지로 숨기'],
    customize: '내 거북이 설정 미리보기',
    finalEyebrow: 'YOUR LITTLE LUCK STARTS HERE',
    finalTitle: '오늘부터,\n화면 한쪽에\n작은 행운을.',
    finalBody: '다운로드하고 실행하면 끝. 행운의 거북이는 당신이 어떤 앱을 사용하든 곁에 머뭅니다.',
    finalCta: '무료로 시작하기',
    safety: 'ZIP 압축 해제 → 설치 파일 실행 · Windows 전용 · 언제든 트레이에서 종료 가능',
    footer: '행운의 거북이 · Lucky Turtle',
  },
  en: {
    nav: ['Story', 'Motion', 'Reactions'],
    downloadShort: 'Download',
    eyebrow: 'DESKTOP COMPANION FOR WINDOWS',
    heroTitleA: 'Keep your focus.',
    heroTitleB: 'Let luck wander in.',
    heroBody: 'A tiny sea turtle quietly explores the edges of your screen, no matter which app is open. A gentle bit of luck that stays without getting in your way.',
    primaryCta: 'Bring Turtle to Windows',
    secondaryCta: 'Meet it first',
    downloadMeta: 'Windows 10/11 · Unzip, then install · Free',
    badges: ['Always on top', 'Emotionally alive', 'Explores screen lines'],
    scroll: 'SCROLL TO MEET YOUR LUCK',
    storyEyebrow: '01 / ALIVE ON YOUR SCREEN',
    storyTitle: 'Your workspace becomes\nits little world.',
    storyBody: 'It never wanders without purpose. It strolls along the bottom, finds a vertical line, and slowly climbs.',
    storySteps: ['Strolls along the bottom', 'Climbs when it finds a line', 'Answers your touch with a face'],
    featureEyebrow: '02 / TINY, BUT ALIVE',
    featureTitle: 'Because cute alone\ndoes not make a companion.',
    features: [
      ['Present, never distracting', 'Keep working as you are. Your turtle lives its quiet little day around the edges of your screen.', '01'],
      ['It remembers every touch', 'One touch brings a smile. Keep poking and it gets upset. On the fifth, it slips into its shell.', '02'],
      ['A color for today’s mood', 'From calm green to vivid coral, choose a shell color and walking pace that feels like you.', '03'],
    ],
    demoEyebrow: '03 / TOUCH & FEEL',
    demoTitle: 'No speech bubbles.\nYou can read every feeling.',
    demoBody: 'Tap the turtle a few times. Its expression changes as your touches add up.',
    touch: 'Touch the turtle',
    touchCount: 'touches',
    moodLabels: ['Just strolling', 'Good to see you!', 'A little annoyed', 'Now I’m mad!', 'That hurt…', 'Hiding in my shell'],
    customize: 'Preview my turtle settings',
    finalEyebrow: 'YOUR LITTLE LUCK STARTS HERE',
    finalTitle: 'Put a little luck\nin the corner\nof your screen.',
    finalBody: 'Download, run, and you are done. Lucky Turtle stays nearby, whichever app you use.',
    finalCta: 'Start for free',
    safety: 'Unzip and run the installer · Quit anytime from the system tray',
    footer: 'Lucky Turtle · 행운의 거북이',
  },
} as const

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" /></svg>
}

function DownloadIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9m0 0 4-4m-4 4L6 8M4 15h12" /></svg>
}

export function WebLanding() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('lucky-turtle-locale') === 'en' ? 'en' : 'ko')
  const [touches, setTouches] = useState(0)
  const [storyStep, setStoryStep] = useState(0)
  const storyRef = useRef<HTMLElement>(null)
  const text = copy[locale]
  const moodSequence: Mood[] = ['walking', 'happy', 'annoyed', 'angry', 'sad', 'shy']
  const mood = moodSequence[Math.min(touches, moodSequence.length - 1)]

  useEffect(() => {
    localStorage.setItem('lucky-turtle-locale', locale)
    document.documentElement.lang = locale
    document.title = locale === 'ko' ? '행운의 거북이 — 화면 위 작은 행운' : 'Lucky Turtle — A little luck on your screen'
  }, [locale])

  useEffect(() => {
    const reveals = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' })
    reveals.forEach((element) => observer.observe(element))

    let frame = 0
    const updateScroll = () => {
      frame = 0
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const pageProgress = Math.min(1, Math.max(0, window.scrollY / max))
      document.documentElement.style.setProperty('--page-progress', String(pageProgress))
      const story = storyRef.current
      if (!story) return
      const rect = story.getBoundingClientRect()
      const distance = Math.max(1, story.offsetHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, -rect.top / distance))
      story.style.setProperty('--story-progress', String(progress))
      setStoryStep(progress < .34 ? 0 : progress < .68 ? 1 : 2)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateScroll)
    }
    updateScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const cycleMood = () => setTouches((count) => count >= 5 ? 0 : count + 1)

  return (
    <main className="landing">
      <div className="landing-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="landing-progress" aria-hidden="true"><span /></div>

      <nav className="landing-nav" aria-label="Main navigation">
        <a className="landing-brand" href="#top" aria-label="Lucky Turtle home">
          <span className="landing-brand__mark"><Turtle shellColor="#53765d" skinColor="#91aa77" mood="happy" view="left" /></span>
          <span>LUCKY<br />TURTLE</span>
        </a>
        <div className="landing-nav__links">
          <a href="#story">{text.nav[0]}</a><a href="#features">{text.nav[1]}</a><a href="#demo">{text.nav[2]}</a>
        </div>
        <div className="landing-nav__actions">
          <button className="language-switch" onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')} aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}>
            <span className={locale === 'ko' ? 'active' : ''}>KO</span><i /><span className={locale === 'en' ? 'active' : ''}>EN</span>
          </button>
          <a className="nav-download" href={DOWNLOAD_URL}>{text.downloadShort}<DownloadIcon /></a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero__grain" aria-hidden="true" />
        <div className="hero__copy">
          <p className="landing-eyebrow hero__eyebrow" data-reveal>{text.eyebrow}</p>
          <h1 data-reveal><span>{text.heroTitleA}</span><strong>{text.heroTitleB}</strong></h1>
          <p className="hero__body" data-reveal>{text.heroBody}</p>
          <div className="hero__actions" data-reveal>
            <a className="cta cta--primary" href={DOWNLOAD_URL}><DownloadIcon />{text.primaryCta}</a>
            <a className="cta cta--ghost" href="#demo">{text.secondaryCta}<ArrowIcon /></a>
          </div>
          <p className="hero__meta" data-reveal>{text.downloadMeta}</p>
        </div>
        <div className="hero__world" aria-hidden="true">
          <span className="hero__orbit hero__orbit--one" /><span className="hero__orbit hero__orbit--two" />
          <span className="hero__luck">LUCK<br />IS<br />MOVING</span>
          <div className="hero__turtle"><Turtle shellColor="#53765d" skinColor="#91aa77" mood="walking" view="right" isMoving /></div>
          <span className="hero__line" />
        </div>
        <div className="hero__badges" data-reveal>{text.badges.map((badge, index) => <span key={badge}><i>0{index + 1}</i>{badge}</span>)}</div>
        <a className="hero__scroll" href="#story"><span>{text.scroll}</span><i /></a>
      </section>

      <section className="story" id="story" ref={storyRef}>
        <div className="story__sticky">
          <div className="story__copy" data-reveal>
            <p className="landing-eyebrow">{text.storyEyebrow}</p>
            <h2>{text.storyTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
            <p>{text.storyBody}</p>
            <ol>{text.storySteps.map((step, index) => <li className={storyStep === index ? 'active' : ''} key={step}><span>0{index + 1}</span>{step}</li>)}</ol>
          </div>
          <div className={`story-monitor story-monitor--step-${storyStep}`}>
            <div className="story-monitor__bar"><i /><i /><i /><span>today-project.tsx</span></div>
            <div className="story-monitor__screen">
              <div className="story-monitor__sidebar"><i /><i /><i /><i /></div>
              <div className="story-monitor__code" aria-hidden="true">{[72, 48, 84, 58, 64, 37, 76, 55].map((width, index) => <i key={index} style={{ width: `${width}%` }} />)}</div>
              <div className="story-monitor__rail" />
              <div className="story-monitor__turtle"><Turtle shellColor="#5f8063" skinColor="#91aa77" mood={storyStep === 2 ? 'happy' : 'walking'} view={storyStep === 1 ? 'back' : 'right'} isMoving={storyStep !== 2} /></div>
              <span className="story-monitor__touch">+</span>
            </div>
            <div className="story-monitor__base" />
          </div>
        </div>
      </section>

      <section className="features landing-section" id="features">
        <div className="section-heading" data-reveal>
          <p className="landing-eyebrow">{text.featureEyebrow}</p>
          <h2>{text.featureTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
        </div>
        <div className="feature-grid">
          {text.features.map(([title, body, number], index) => (
            <article className={`feature-card feature-card--${index + 1}`} data-reveal key={title}>
              <span className="feature-card__number">{number}</span>
              <div className="feature-card__visual" aria-hidden="true">
                {index === 0 && <div className="mini-window"><i /><i /><span><Turtle shellColor="#53765d" skinColor="#91aa77" mood="walking" view="right" isMoving /></span></div>}
                {index === 1 && <div className="mood-row"><span><Turtle shellColor="#6b8060" skinColor="#91aa77" mood="happy" view="left" /></span><span><Turtle shellColor="#6b8060" skinColor="#91aa77" mood="angry" view="left" /></span><span><Turtle shellColor="#6b8060" skinColor="#91aa77" mood="shy" view="left" /></span></div>}
                {index === 2 && <div className="shell-palette">{['#53765d', '#6e9fc8', '#a58bca', '#df8788', '#d9a84e'].map((color) => <i key={color} style={{ background: color }} />)}</div>}
              </div>
              <h3>{title}</h3><p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="demo landing-section" id="demo">
        <div className="demo__copy" data-reveal>
          <p className="landing-eyebrow">{text.demoEyebrow}</p>
          <h2>{text.demoTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{text.demoBody}</p>
          <div className="demo__count"><strong>0{touches}</strong><span>{text.touchCount}</span></div>
          <p className="demo__mood">“{text.moodLabels[touches]}”</p>
        </div>
        <div className={`demo__stage demo__stage--${mood}`} data-reveal>
          <span className="demo__halo" aria-hidden="true" />
          <button className="demo__turtle" onClick={cycleMood} aria-label={text.touch}>
            <Turtle shellColor="#5f8063" skinColor="#91aa77" mood={mood} view="left" isMoving={touches === 0} />
          </button>
          <button className="demo__touch-button" onClick={cycleMood}><span>+</span>{text.touch}</button>
          <a className="demo__customize" href="?mode=settings">{text.customize}<ArrowIcon /></a>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta__rings" aria-hidden="true"><i /><i /><i /></div>
        <div className="final-cta__copy" data-reveal>
          <p className="landing-eyebrow">{text.finalEyebrow}</p>
          <h2>{text.finalTitle.split('\n').map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{text.finalBody}</p>
          <a className="cta cta--light" href={DOWNLOAD_URL}><DownloadIcon />{text.finalCta}</a>
          <small>{text.safety}</small>
        </div>
        <div className="final-cta__visual" aria-hidden="true">
          <span className="final-cta__visual-label">READY TO WALK</span>
          <div className="final-cta__turtle"><Turtle shellColor="#5f8063" skinColor="#91aa77" mood="happy" view="right" /></div>
          <span className="final-cta__ground" />
          <span className="final-cta__spark final-cta__spark--one">✦</span>
          <span className="final-cta__spark final-cta__spark--two">✦</span>
        </div>
      </section>

      <footer className="landing-footer"><span>{text.footer}</span><span>© 2026</span><button onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}>{locale === 'ko' ? 'English' : '한국어'}</button></footer>
    </main>
  )
}
