import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { generateShareCard, generatePoster, generateComicCover, generateMemoryBookCover, analyzeTranscription, type MeetingData, type InsideResult } from '../utils/openrouter'
import { addHistory, dispatchHistoryUpdate } from './HistoryPage'

interface SavedResult {
  episodeTitle: string
  quote: string
  mvp: { name: string; reason: string }
  meme: string
  plotTwist: string
  ending: string
  funFact: string
  chemistry: string
}

interface LocationState {
  meetingName: string
  participants: string[]
  detectedSpeakerCount?: number
  audioBlob?: Blob
  speakers?: { pitch: number; talkTime: number; voiceSamples: number[] }[]
  transcription?: string
  transcriptionDuration?: number
  _savedResult?: SavedResult
}

const SAMPLE_RESULT: LocationState = {
  meetingName: '금요일 저녁 회식',
  participants: ['민수', '지현', '영호', '수진'],
  detectedSpeakerCount: 4,
  transcription: '민수: 야 그거 알아? 김치찌개에 라면 사리를 넣으면 진짜 천국이야\n지현: ㅋㅋㅋㅋ 그거 완전 말도 안 되는데?\n영호: 근데 생각보다 맛있다니까?\n수진: 영호 너 김치 싫어하잖아. 그런데 왜?\n영호: 김치 싫어하는 거랑 라면 사리는 별개야\n민수: ㅋㅋㅋㅋ 이게 바로 인간이다\n수진: 영호야 솔직히 말해봐\n영호: 엄마가 김치 싫어해서 나도 싫어하게 됐어\n지현: 우와 그거 완전 트라우마네\n민수: 다음엔 다 함께 김치찌개 먹어야지',
  transcriptionDuration: 180,
}

const premiumFeatures = [
  { id: 'shorts', icon: '🎞️', title: 'AI Shorts', description: '오늘의 하이라이트를 숏츠로 제작', color: 'from-amber-500/20 to-red-500/20' },
  { id: 'poster', icon: '🎬', title: 'AI Poster', description: '오늘을 영화 포스터처럼', color: 'from-pink-500/20 to-rose-500/20' },
  { id: 'comic', icon: '📚', title: 'AI Comic', description: '오늘의 에피소드를 웹툰으로', color: 'from-blue-500/20 to-purple-500/20' },
  { id: 'book', icon: '📔', title: 'Memory Book', description: '오늘의 추억을 추억북으로', color: 'from-emerald-500/20 to-teal-500/20' },
]

const shareFormats = [
  { id: '9:16', label: '인스타 스토리', icon: '📱', desc: '9:16 세로' },
  { id: '1:1', label: '인스타 피드', icon: '📸', desc: '1:1 정방형' },
  { id: '16:9', label: '블로그/트위터', icon: '🖥️', desc: '16:9 가로' },
]

// CSS 기반 공유 카드 컴포넌트 (API 없이도 작동)
function ShareCardPreview({ meetingData, format, cardRef }: { meetingData: MeetingData; format: string; cardRef?: React.RefObject<HTMLDivElement | null> }) {
  const sizeClass = format === '9:16' ? 'w-[270px] h-[480px]' : format === '16:9' ? 'w-[480px] h-[270px]' : 'w-[360px] h-[360px]'
  const titleSize = format === '9:16' ? 'text-2xl' : format === '16:9' ? 'text-xl' : 'text-2xl'
  const quoteSize = format === '9:16' ? 'text-sm' : format === '16:9' ? 'text-xs' : 'text-sm'

  return (
    <div ref={cardRef} className={`${sizeClass} bg-black rounded-2xl p-6 flex flex-col relative overflow-hidden`}>
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-amber-500/5 blur-3xl rounded-full" />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* 로고 */}
        <div className="text-[10px] text-gray-500 tracking-widest uppercase mb-4">Inside</div>
        
        {/* 제목 */}
        <h2 className={`${titleSize} font-black text-white tracking-tight leading-tight mb-4`}>
          {meetingData.episodeTitle}
        </h2>
        
        {/* 구분선 */}
        <div className="w-full h-px bg-white/15 mb-4" />
        
        {/* 인용구 */}
        <div className="flex gap-3 mb-4 flex-1">
          <div className="w-[3px] bg-amber-500 rounded-full flex-shrink-0" />
          <p className={`${quoteSize} text-gray-200 leading-relaxed italic`}>
            "{meetingData.quote}"
          </p>
        </div>
        
        {/* MVP */}
        <div className="mb-4">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">MVP</div>
          <div className="text-sm font-bold text-white">{meetingData.mvp}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{meetingData.mvpReason}</div>
        </div>
        
        {/* 참여자 */}
        <div className="mt-auto text-center">
          <div className="text-[10px] text-gray-600">
            {meetingData.participants.join('  ·  ')}
          </div>
        </div>
      </div>
    </div>
  )
}

// Premium 모달 컴포넌트
function PremiumModal({ feature, meetingData, onClose }: { feature: string; meetingData: MeetingData; onClose: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [error, setError] = useState('')

  const featureInfo = premiumFeatures.find((f) => f.id === feature)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    setGeneratedImage('')
    try {
      let result
      switch (feature) {
        case 'poster':
          result = await generatePoster(meetingData)
          break
        case 'comic':
          result = await generateComicCover(meetingData)
          break
        case 'book':
          result = await generateMemoryBookCover(meetingData)
          break
        default:
          setError('아직 지원하지 않는 기능입니다.')
          setIsGenerating(false)
          return
      }
      if (result?.imageUrl) {
        setGeneratedImage(result.imageUrl)
      } else {
        setError('이미지 생성에 실패했습니다. API 키를 확인해주세요.')
      }
    } catch (e: any) {
      setError(e.message || '이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return
    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `inside-${feature}-${meetingData.episodeTitle.replace(/[\s\n]/g, '-')}.png`
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-zinc-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{featureInfo?.icon}</div>
          <h3 className="text-xl font-bold">{featureInfo?.title}</h3>
          <p className="text-sm text-gray-400 mt-2">{featureInfo?.description}</p>
        </div>

        {generatedImage ? (
          <div className="mb-4 rounded-xl overflow-hidden border border-zinc-700">
            <img src={generatedImage} alt={featureInfo?.title} className="w-full" />
          </div>
        ) : (
          <div className="mb-4 p-8 bg-zinc-800/50 rounded-xl flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              {isGenerating ? 'AI가 이미지를 생성하고 있습니다...' : '아래 버튼을 눌러 이미지를 생성하세요'}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {!generatedImage && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 bg-primary text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
            >
              {isGenerating ? '생성 중...' : '이미지 생성하기'}
            </button>
          )}
          {generatedImage && (
            <button onClick={handleDownload} className="w-full py-3 bg-primary text-black font-bold rounded-xl active:scale-95 transition-transform">
              이미지 저장하기
            </button>
          )}
          <button onClick={onClose} className="w-full py-3 bg-zinc-800 rounded-xl font-medium">닫기</button>
        </div>
      </div>
    </div>
  )
}

// 공유 모달 컴포넌트
function ShareModal({ meetingData, onClose }: { meetingData: MeetingData; onClose: () => void }) {
  const [selectedFormat, setSelectedFormat] = useState<string>('1:1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [error, setError] = useState('')
  const [useCSSPreview, setUseCSSPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    setGeneratedImage('')
    try {
      const result = await generateShareCard(meetingData, selectedFormat as '9:16' | '1:1' | '16:9')
      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl)
        setUseCSSPreview(false)
      } else {
        setUseCSSPreview(true)
      }
    } catch (e: any) {
      setUseCSSPreview(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (useCSSPreview) {
      // html2canvas로 CSS 카드를 실제 이미지로 변환
      if (!cardRef.current) return
      setIsSaving(true)
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#000000',
          scale: 2, // 고해상도
          useCORS: true,
          logging: false,
        })
        const link = document.createElement('a')
        link.download = `inside-${meetingData.episodeTitle.replace(/[\s\n]/g, '-')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } catch (e) {
        alert('이미지 저장에 실패했습니다. 스크린을 사용해주세요.')
      } finally {
        setIsSaving(false)
      }
      return
    }
    if (!generatedImage) return
    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `inside-${meetingData.episodeTitle.replace(/\s/g, '-')}.png`
    link.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full mx-4 border border-zinc-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold">공유하기</h3>
          <p className="text-sm text-gray-400 mt-2">오늘의 모임을 공유해보세요!</p>
        </div>

        {/* 포맷 선택 */}
        <div className="space-y-2 mb-6">
          {shareFormats.map((f) => (
            <div
              key={f.id}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedFormat === f.id
                  ? 'border-primary bg-primary/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
              onClick={() => setSelectedFormat(f.id)}
            >
              <span className="text-2xl">{f.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{f.label}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
              {selectedFormat === f.id && <span className="text-primary">✓</span>}
            </div>
          ))}
        </div>

        {/* CSS 미리보기 또는 생성된 이미지 */}
        <div className="mb-4 flex justify-center">
          {useCSSPreview ? (
            <ShareCardPreview meetingData={meetingData} format={selectedFormat} cardRef={cardRef} />
          ) : (
            <div className="rounded-xl overflow-hidden border border-zinc-700">
              <img src={generatedImage} alt="공유 카드" className="max-w-full" />
            </div>
          )}
        </div>

        {error && !useCSSPreview && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-primary text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {isGenerating ? 'AI 이미지 생성 중...' : 'AI로 이미지 생성하기'}
          </button>
          <button onClick={handleDownload} disabled={isSaving} className="w-full py-3 bg-zinc-800 text-gray-300 rounded-xl font-medium disabled:opacity-50">
            {isSaving ? '이미지 저장 중...' : useCSSPreview ? '이미지로 저장' : '이미지 다운로드'}
          </button>
          <button onClick={onClose} className="w-full py-3 bg-zinc-800/50 rounded-xl font-medium text-gray-400">닫기</button>
        </div>
      </div>
    </div>
  )
}

export default function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const eff = state || SAMPLE_RESULT

  const [result, setResult] = useState<InsideResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  useEffect(() => {
    const doAnalyze = async () => {
      let r: InsideResult
      
      // 저장된 결과가 있으면 바로 사용 (히스토리에서 클릭한 경우)
      if (eff._savedResult) {
        r = eff._savedResult as InsideResult
        setResult(r)
        setIsAnalyzing(false)
        return
      }
      
      if (!eff.transcription || eff.transcription.trim().length < 20) {
        r = {
          episodeTitle: `${eff.participants.length}명의 대화`,
          quote: '더 녹음해보세요!',
          mvp: { name: eff.participants[0] || '참여자', reason: '첫 참여자' },
          meme: '밈 없음',
          plotTwist: '반전 없음',
          ending: '',
          funFact: '특별한 사실 없음!',
          chemistry: '좋은 케미!',
        }
      } else {
        try {
          const res = await analyzeTranscription(eff.participants, eff.transcription, eff.transcriptionDuration || 0)
          r = res || {
            episodeTitle: `${eff.participants.length}명의 대화`,
            quote: '분석 패',
            mvp: { name: eff.participants[0] || '참여자', reason: '' },
            meme: '', plotTwist: '', ending: '', funFact: '', chemistry: '',
          }
        } catch {
          r = {
            episodeTitle: `${eff.participants.length}명의 대화`,
            quote: eff.transcription.substring(0, 50),
            mvp: { name: eff.participants[0] || '참여자', reason: '' },
            meme: '', plotTwist: '', ending: '', funFact: '', chemistry: '',
          }
        }
      }
      setResult(r)
      setIsAnalyzing(false)
      try {
        addHistory({ meetingName: eff.meetingName, participants: eff.participants, ...r })
        dispatchHistoryUpdate()
      } catch { /* ignore */ }
    }
    doAnalyze()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isAnalyzing) {
    return (
      <div className="app-container flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="w-16 h-16 border-4 border-zinc-800 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-lg font-bold">AI가 대화 분석 중...</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen bg-black text-white">
        <p>결과 없음</p>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 bg-zinc-800 rounded-xl">홈으로</button>
      </div>
    )
  }

  const meetingData: MeetingData = {
    meetingName: eff.meetingName,
    participants: eff.participants,
    episodeTitle: result.episodeTitle,
    quote: result.quote,
    quoteAuthor: result.mvp.name,
    quoteContext: '',
    mvp: result.mvp.name,
    mvpReason: result.mvp.reason,
  }

  return (
    <div className="app-container bg-black text-white overflow-y-auto snap-y snap-mandatory" style={{ scrollBehavior: 'smooth' }}>
      {/* 히어로 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-black to-black" />
        <div className="relative z-10 text-center">
          <div className="text-xs text-gray-400 mb-4">Inside · {eff.meetingName}</div>
          <h1 className="text-4xl font-black whitespace-pre-line mb-6">{result.episodeTitle}</h1>
          <div className="flex justify-center gap-3 mb-8">
            {eff.participants.map((n, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border-2 border-primary">
                  <span className="text-sm font-bold text-primary">{n.charAt(0)}</span>
                </div>
                <span className="text-[10px] text-gray-500 mt-1">{n}</span>
              </div>
            ))}
          </div>
          <div className="animate-bounce text-2xl">↓</div>
        </div>
      </section>

      {/* MVP */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 text-center w-full">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-[2px] bg-primary" />
            <span className="text-xs text-primary font-semibold uppercase tracking-wider">오늘의 MVP</span>
            <div className="w-8 h-[2px] bg-primary" />
          </div>
          <div className="inline-block px-4 py-1.5 bg-primary rounded-full mb-4">
            <span className="text-xs font-bold text-black">{result.mvp.reason.split('\n')[0]}</span>
          </div>
          <h2 className="text-5xl font-black text-primary mb-4">{result.mvp.name}</h2>
          <p className="text-lg text-gray-300 whitespace-pre-line">{result.mvp.reason}</p>
        </div>
      </section>

      {/* 밈 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-[2px] bg-primary" />
            <span className="text-xs text-primary font-semibold uppercase tracking-wider">오늘의 밈</span>
          </div>
          <h2 className="text-2xl font-black whitespace-pre-line">{result.meme}</h2>
        </div>
      </section>

      {/* 반전 & 엔딩 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 w-full max-w-sm">
          <h2 className="text-xl font-bold mb-6 text-center">반전 & 엔딩</h2>
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="font-semibold mb-2">🔄 반전</div>
              <p className="text-sm text-gray-300">{result.plotTwist}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="font-semibold mb-2"> 엔딩</div>
              <p className="text-sm text-gray-300">{result.ending}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 재미있는 사실 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 w-full max-w-sm">
          <h2 className="text-xl font-bold mb-6 text-center">💡 재미있는 사실</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-lg">{result.funFact || '특별한 사실 없음!'}</p>
          </div>
        </div>
      </section>

      {/* 케미 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 w-full max-w-sm">
          <h2 className="text-xl font-bold mb-6 text-center">🤝 오늘의 케미</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-lg">{result.chemistry || '좋은 케미!'}</p>
          </div>
        </div>
      </section>

      {/* 아웃트로 */}
      <section className="min-h-[50vh] snap-start flex flex-col items-center justify-center px-6 relative py-12">
        <div className="relative z-10 text-center w-full max-w-sm">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-black text-black">I</span>
          </div>
          <h2 className="text-2xl font-bold mb-8">오늘의 Inside 완성!</h2>
          <div className="space-y-3 mb-6">
            <button onClick={() => setShowShareModal(true)} className="w-full py-4 bg-primary text-black font-bold rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2">📤 공유하기</button>
            <button onClick={() => navigate('/')} className="w-full py-4 bg-zinc-900 text-white font-bold rounded-2xl active:scale-95 transition-transform border border-zinc-800">새 모임 시작하기</button>
            <button onClick={() => navigate('/history')} className="w-full py-3 bg-zinc-800 text-gray-300 font-medium rounded-2xl active:scale-95">📋 기록 보기</button>
          </div>
        </div>
      </section>

      {/* Premium */}
      <section className="min-h-screen snap-start flex flex-col px-6 py-16 relative">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
            <span className="text-xs text-primary font-semibold">✨ Premium</span>
          </div>
          <h2 className="text-3xl font-black">Make Today<br /><span className="text-primary">Unforgettable</span></h2>
        </div>
        <div className="space-y-3">
          {premiumFeatures.map((f) => (
            <div key={f.id} className={`bg-gradient-to-r ${f.color} border border-white/10 rounded-2xl p-5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all`} onClick={() => setSelectedFeature(f.id)}>
              <div className="flex items-center gap-4">
                <div className="text-3xl">{f.icon}</div>
                <div className="flex-1">
                  <div className="font-bold">{f.title}</div>
                  <div className="text-xs text-gray-300">{f.description}</div>
                </div>
                <div className="text-xs px-2 py-1 bg-white/10 rounded-lg">PREMIUM</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 공유 모달 */}
      {showShareModal && (
        <ShareModal
          meetingData={meetingData}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Premium 모달 */}
      {selectedFeature && (
        <PremiumModal
          feature={selectedFeature}
          meetingData={meetingData}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  )
}