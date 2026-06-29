import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface SpeakerData {
  pitch: number
  talkTime: number
  voiceSamples: number[]
}

interface LocationState {
  meetingName: string
  participants: string[]
  detectedSpeakerCount?: number
  audioBlob?: Blob
  speakers?: SpeakerData[]
  transcription?: string
  transcriptionDuration?: number
}

export default function AnalyzingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState

  const [progress, setProgress] = useState(0)
  const [analysisStep, setAnalysisStep] = useState('')

  const analysisSteps = [
    '녹음 파일을 분석하고 있습니다...',
    '음성 패턴을 추출합니다...',
    '화자 분리를 수행합니다...',
    '대화 내용을 분석합니다...',
    '감정 톤을 분석합니다...',
    '핵심 순간을 추출합니다...',
    '결과를 생성하고 있습니다...',
  ]

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setAnalysisStep(analysisSteps[Math.floor(Math.random() * analysisSteps.length)])
    }, 800)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          clearInterval(stepInterval)
          return 100
        }
        return prev + Math.random() * 15
      })
    }, 400)

    const timer = setTimeout(() => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      navigate('/name-setting', {
        state: {
          meetingName: state?.meetingName || '모임',
          participants: state?.participants || ['참여자 1', '참여자 2'],
          detectedSpeakerCount: state?.detectedSpeakerCount || 2,
          audioBlob: state?.audioBlob,
          speakers: state?.speakers || [],
          transcription: state?.transcription || '',
          transcriptionDuration: state?.transcriptionDuration || 0,
        }
      })
    }, 4000)

    return () => {
      clearTimeout(timer)
      clearInterval(progressInterval)
      clearInterval(stepInterval)
    }
  }, [navigate, state])

  return (
    <div className="app-container flex flex-col items-center justify-center px-6">
      {/* 로딩 스피너 */}
      <div className="mb-8">
        <div className="w-16 h-16 border-4 border-zinc-800 border-t-primary rounded-full animate-spin" />
      </div>

      {/* 로딩 문구 */}
      <h1 className="text-2xl font-bold mb-3 text-center">
        녹음 파일 분석 중
      </h1>
      <p className="text-gray-400 text-center mb-8 min-h-[20px]">
        {analysisStep || 'AI가 모임을 분석하고 있어요'}
      </p>

      {/* 로딩 진행 표시 */}
      <div className="w-full max-w-[300px]">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 text-center">
          {Math.min(Math.round(progress), 100)}%
        </p>
      </div>
    </div>
  )
}