import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { analyzeSpeakerCharacter } from '../utils/openrouter'

interface SpeakerInfo {
  pitch: number
  talkTime: number
  voiceSamples: number[]
}

interface LocationState {
  meetingName: string
  participants: string[]
  detectedSpeakerCount?: number
  audioBlob?: Blob
  speakers?: SpeakerInfo[]
  transcription?: string
  transcriptionDuration?: number
}

// 화자 말투 분석 키워드 기반 매칭
function analyzeSpeakerStyle(text: string): string {
  if (!text || text.length < 5) return '알 수 없음'
  
  const patterns = [
    { style: '유머러스', keywords: ['ㅋㅋ', 'ㅎㅎ', '하하', 'ㅋㅋㅋ', '웃'], emoji: '😂' },
    { style: '분석적', keywords: ['그니까', '정확히', '사실', '의미', '논리', '이치'], emoji: '🧐' },
    { style: '공감', keywords: ['맞아', '그렇지', '응', 'ㅇㅇ', '진짜', '공감'], emoji: '🤝' },
    { style: '이야기꾼', keywords: ['그랬는데', '있었어', '나한테', '어떤', '근데', '알아?'], emoji: '📖' },
    { style: '주도적', keywords: ['야', '어이', '잠깐', '내가', '내 말은'], emoji: '🎤' },
    { style: '차분한', keywords: ['음...', '글쎄', '모르겠', '생각해보면', '아마도'], emoji: '😌' },
  ]
  
  const matches = patterns.filter(p => 
    p.keywords.some(k => text.includes(k))
  )
  
  if (matches.length > 0) {
    const best = matches[0]
    return `${best.emoji} ${best.style} 스타일`
  }
  
  return '✨ 개성 가득'
}

export default function NameSettingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState

  // 감지된 화자 (피치 기반 클러스터)
  const detectedSpeakers: SpeakerInfo[] = state?.speakers || []
  const detectedCount = state?.detectedSpeakerCount || detectedSpeakers.length || 2
  const transcription = state?.transcription || ''
  const transcriptionDuration = state?.transcriptionDuration || 0
  
  // 화자 수가 감지되지 않은 경우 기본값 설정
  const totalSpeakers = Math.max(detectedCount, detectedSpeakers.length, 2)
  
  // 각 화자별 이름 (사용자 입력)
  const [names, setNames] = useState<string[]>(
    Array.from({ length: totalSpeakers }, () => '')
  )
  
  // AI 분석 결과
  const [aiSummaries, setAiSummaries] = useState<string[]>(
    Array.from({ length: totalSpeakers }, () => '')
  )
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  
  // 각 화자별 말투 스타일 (키워드 기반)
  const [styleLabels, setStyleLabels] = useState<string[]>(
    Array.from({ length: totalSpeakers }, () => '')
  )

  useEffect(() => {
    const analyzeAll = async () => {
      // transcription이 없거나 짧으면 키워드 기반 분석만 수행
      if (!transcription || transcription.trim().length < 20) {
        const defaultSummaries = Array.from({ length: totalSpeakers }, (_, i) => {
          const speaker = detectedSpeakers[i]
          if (!speaker) return `화자 ${i + 1} - 대화 내용 없음`
          const talkMin = Math.floor(speaker.talkTime / 60)
          const talkSec = Math.round(speaker.talkTime % 60)
          return `약 ${talkMin > 0 ? talkMin + '분 ' : ''}${talkSec}초 발언 · 피치 ${Math.round(speaker.pitch)}Hz`
        })
        setAiSummaries(defaultSummaries)
        const defaultStyles = Array.from({ length: totalSpeakers }, () => '✨ 개성 가득')
        setStyleLabels(defaultStyles)
        setIsAnalyzing(false)
        return
      }

      // transcription에서 각 화자의 발언 추출 (줄바꿈 기준)
      const lines = transcription.split('\n').filter(l => l.trim())
      
      // 각 화자별 키워드 기반 분석 (즉시, API 없이)
      const keywordResults = Array.from({ length: totalSpeakers }, (_, i) => {
        const speaker = detectedSpeakers[i]
        // 해당 화자의 발언 추출 (휴리스틱: 줄 번호 % 화자수)
        const speakerLines = lines.filter((_, idx) => idx % totalSpeakers === i)
        const speakerText = speakerLines.join(' ')
        
        if (speakerText.trim().length < 5) {
          return `${speaker ? Math.round(speaker.talkTime) + '초 발언' : '조용한 참여자'}`
        }
        
        // 키워드 기반 스일 분석
        const style = analyzeSpeakerStyle(speakerText)
        const talkMin = Math.floor((speaker?.talkTime || 0) / 60)
        const talkSec = Math.round((speaker?.talkTime || 0) % 60)
        const timeStr = talkMin > 0 ? `${talkMin}분 ${talkSec}초` : `${talkSec}초`
        
        // 주요 키워드 추출
        const keywords: string[] = []
        if (speakerText.includes('ㅋㅋ') || speakerText.includes('ㅎㅎ')) keywords.push('유머')
        if (speakerText.includes('그니까') || speakerText.includes('정확히')) keywords.push('분석적')
        if (speakerText.includes('맞아') || speakerText.includes('응')) keywords.push('공감')
        if (speakerText.includes('야') || speakerText.includes('내가')) keywords.push('주도적')
        if (speakerText.includes('음') || speakerText.includes('글쎄')) keywords.push('차분')
        
        const kwStr = keywords.length > 0 ? ` · ${keywords.join(', ')}` : ''
        return `${style}${kwStr} · ${timeStr} 발언`
      })
      
      setAiSummaries(keywordResults)
      
      // 스타일 라벨 설정
      const styleResults = keywordResults.map(r => {
        const match = r.match(/^[^\s·]+/)
        return match ? match[0] : '✨ 개성 가득'
      })
      setStyleLabels(styleResults)

      // Gemini API 호출 시도 (백그라운드, 패해도 결과 표시)
      try {
        const results = await Promise.all(
          Array.from({ length: totalSpeakers }, async (_, i) => {
            const speakerName = `화자 ${i + 1}`
            const speakerLines = lines.filter((_, idx) => idx % totalSpeakers === i)
            const speakerText = speakerLines.join('\n')
            
            if (speakerText.trim().length < 10) {
              return keywordResults[i]
            }
            
            try {
              const aiResult = await analyzeSpeakerCharacter(speakerName, speakerText, transcription)
              return aiResult || keywordResults[i]
            } catch {
              return keywordResults[i] // API 실패 시 키워드 결과 유지
            }
          })
        )
        setAiSummaries(results)
      } catch (error) {
        console.error('[NameSetting] 화자 분석 실패:', error)
        // 키워드 결과 유지
      } finally {
        setIsAnalyzing(false)
      }
    }

    analyzeAll()
  }, [totalSpeakers, transcription, detectedSpeakers])

  const handleNameChange = (index: number, value: string) => {
    const newNames = [...names]
    newNames[index] = value
    setNames(newNames)
  }

  // 이름 설정 완료
  const handleConfirm = () => {
    const filledNames = names.map((name, i) => name.trim() || `참여자${i + 1}`)
    navigate('/result', {
      state: {
        meetingName: state?.meetingName || '모임',
        participants: filledNames,
        detectedSpeakerCount: totalSpeakers,
        audioBlob: state?.audioBlob,
        speakers: detectedSpeakers,
        transcription: transcription,
        transcriptionDuration: transcriptionDuration,
      },
    })
  }

  // 스킵: 기본 이름으로 진행
  const handleSkip = () => {
    const defaultNames = Array.from({ length: totalSpeakers }, (_, i) => `참여자${i + 1}`)
    navigate('/result', {
      state: {
        meetingName: state?.meetingName || '모임',
        participants: defaultNames,
        detectedSpeakerCount: totalSpeakers,
        audioBlob: state?.audioBlob,
        speakers: detectedSpeakers,
        transcription: transcription,
        transcriptionDuration: transcriptionDuration,
      },
    })
  }

  // 색상 매칭
  const speakerColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
  ]

  return (
    <div className="app-container flex flex-col px-6 py-8 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">이들이 누구일까요?</h1>
            <p className="text-xs text-gray-400">
              AI가 화자 {totalSpeakers}명의 목소리를 분석했어요
            </p>
          </div>
        </div>
      </div>

      {/* AI 분석 상태 */}
      {isAnalyzing && (
        <div className="mb-6 px-4 py-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm font-semibold text-primary">AI가 분석 중...</p>
            <p className="text-[11px] text-gray-400">화자별 말투와 성향을 파악하고 있어요</p>
          </div>
        </div>
      )}

      {!isAnalyzing && (
        <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            <span className="text-sm font-semibold text-emerald-300">분석 완료!</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">아래 이름을 설정하고 결과를 확인하세요</p>
        </div>
      )}

      {/* 화자 목록 */}
      <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
        {Array.from({ length: totalSpeakers }, (_, i) => {
          const speaker = detectedSpeakers[i]
          const talkTimeSec = speaker ? Math.round(speaker.talkTime) : 0
          const talkTimeMin = Math.floor(talkTimeSec / 60)
          const talkTimeDisplay = talkTimeMin > 0 
            ? `${talkTimeMin}분 ${talkTimeSec % 60}초`
            : `${talkTimeSec}초`
          const color = speakerColors[i % speakerColors.length]
          const summary = aiSummaries[i] || isAnalyzing ? '분석 중...' : '분석 결과 없음'
          const style = styleLabels[i] || '✨ 개성 가득'
          
          return (
            <div
              key={i}
              className={`bg-zinc-900 border rounded-2xl p-4 transition-all ${
                !isAnalyzing ? 'border-primary/30' : 'border-zinc-800'
              }`}
            >
              {/* 화자 헤더 */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
                  <span className="text-xl">
                    {isAnalyzing ? '?' : '👤'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">화자 {i + 1}</h3>
                    {!isAnalyzing && (
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] text-gray-400">
                        {talkTimeDisplay} 발언
                      </span>
                    )}
                  </div>
                  {speaker && (
                    <p className="text-[10px] text-gray-500">
                      평균 음높이: {Math.round(speaker.pitch)}Hz
                    </p>
                  )}
                </div>
              </div>

              {/* AI 분석 결과 */}
              {!isAnalyzing && (
                <>
                  <div className="mb-3 px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">🔍</span>
                      <span className="text-[11px] font-medium text-gray-300">AI 분석</span>
                      <span className="px-1.5 py-0.5 bg-primary/20 border border-primary/30 rounded text-[9px] font-bold text-primary ml-auto">
                        {style.replace(/[^\s]+/, '')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {summary || '분석 결과 없음'}
                    </p>
                  </div>
                  
                  <div className="mb-1">
                    <label className="text-[11px] text-gray-400 mb-1 block pl-1">
                      이름 지어주기
                    </label>
                    <input
                      type="text"
                      value={names[i]}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                      placeholder={`화자 ${i + 1}의 이름 입력`}
                      className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </>
              )}

              {isAnalyzing && (
                <div className="h-20 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 버튼 */}
      <div className="space-y-2">
        {!isAnalyzing && (
          <button
            onClick={handleConfirm}
            className="w-full py-4 bg-primary text-black text-base font-bold rounded-2xl active:scale-95 transition-transform"
          >
            결과 보기
          </button>
        )}
        <button
          onClick={handleSkip}
          className="w-full py-3 bg-zinc-800 text-gray-300 text-sm font-medium rounded-2xl active:scale-95 transition-transform"
        >
          건너뛰고 기본 이름으로
        </button>
      </div>
    </div>
  )
}