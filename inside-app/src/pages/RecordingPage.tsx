import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { transcribeAudio } from '../utils/whisper'

// 피치 감지 (autocorrelation 기반)
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i]
    rms += val * val
  }
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.01) return -1

  const buf = buffer.slice(0, SIZE - 1)
  const newBuf = new Float32Array(buf.length)
  for (let i = 0; i < buf.length; i++) {
    newBuf[i] = buf[i]
  }

  const c = new Array(newBuf.length).fill(0)
  for (let i = 0; i < newBuf.length; i++) {
    for (let j = 0; j < newBuf.length - i; j++) {
      c[i] += newBuf[j] * newBuf[j + i]
    }
  }

  let d = 0
  while (c[d] > c[d + 1]) d++
  let maxval = -1, maxpos = -1
  for (let i = d; i < newBuf.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i]
      maxpos = i
    }
  }
  let T0 = maxpos

  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

// VAD - 말소리만 엄격하게 감지 (배경음 제외)
function isVoiceActivity(rms: number, pitch: number): boolean {
  const RMS_THRESHOLD = 0.015  // 배경음 제외 위해 높임
  const PITCH_MIN = 70   // 인간 음성 최소 피치
  const PITCH_MAX = 400  // 인간 음성 최대 피치
  return rms >= RMS_THRESHOLD && pitch >= PITCH_MIN && pitch <= PITCH_MAX
}

// 피치 클러스터 할당 - 같은 화자는 기 (임계값 확대)
function assignToCluster(pitch: number, clusters: number[]): number {
  const THRESHOLD = 40  // 25→40으로 확대하여 같은 화자 더 잘 묶음
  for (let i = 0; i < clusters.length; i++) {
    if (Math.abs(pitch - clusters[i]) < THRESHOLD) {
      clusters[i] = clusters[i] * 0.95 + pitch * 0.05
      return i
    }
  }
  return -1
}

interface DetectedSpeaker {
  id: number
  pitch: number
  color: string
  lastSeen: number
  talkTime: number
  voiceSamples: number[]
}

const SPEAKER_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
]
const SPEAKER_NAMES = ['참여자 A', '참여자 B', '참여자 C', '참여자 D', '참여자 E', '참여자 F', '참여자 G', '참여자 H']

export default function RecordingPage() {
  const navigate = useNavigate()
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [speakers, setSpeakers] = useState<DetectedSpeaker[]>([])
  const [currentPitch, setCurrentPitch] = useState<number | null>(null)
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const clustersRef = useRef<number[]>([])
  const speakersRef = useRef<DetectedSpeaker[]>([])
  const nextIdRef = useRef(0)
  const silenceTimerRef = useRef(0)
  const pitchHistoryRef = useRef<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const recordingEndRef = useRef<number>(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!isRecording) return
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isRecording])

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return
    const analyser = analyserRef.current
    const bufLen = analyser.fftSize
    const buf = new Float32Array(bufLen)
    analyser.getFloatTimeDomainData(buf)
    const sr = audioContextRef.current.sampleRate

    let rms = 0
    for (let i = 0; i < bufLen; i++) rms += buf[i] * buf[i]
    rms = Math.sqrt(rms / bufLen)
    setAudioLevel(Math.min(rms * 10, 1))

    const pitch = autoCorrelate(buf, sr)
    const voice = isVoiceActivity(rms, pitch)

    if (!voice) {
      silenceTimerRef.current++
      if (silenceTimerRef.current > 30) {
        setActiveSpeakerId(null)
        setCurrentPitch(null)
      }
    } else {
      silenceTimerRef.current = 0
      setCurrentPitch(Math.round(pitch))

      pitchHistoryRef.current.push(pitch)
      if (pitchHistoryRef.current.length > 3) pitchHistoryRef.current.shift()

      const avgPitch = pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length
      const ci = assignToCluster(avgPitch, clustersRef.current)

      // 새 화자 추가 시 더 엄격한 조건 (배경음으로 새 화자 생성 방지)
      if (ci === -1 && clustersRef.current.length < 8 && rms > 0.03) {
        const newId = nextIdRef.current++
        clustersRef.current.push(avgPitch)
        const sp: DetectedSpeaker = {
          id: newId, pitch: avgPitch,
          color: SPEAKER_COLORS[clustersRef.current.length - 1],
          lastSeen: Date.now(), talkTime: 0, voiceSamples: [avgPitch],
        }
        speakersRef.current = [...speakersRef.current, sp]
        setSpeakers([...speakersRef.current])
        setActiveSpeakerId(newId)
      } else if (ci !== -1) {
        const sp = speakersRef.current.find(s => s.id === ci)
        if (sp) {
          sp.pitch = clustersRef.current[ci]
          sp.lastSeen = Date.now()
          sp.talkTime += 1 / 60
          sp.voiceSamples.push(avgPitch)
          if (sp.voiceSamples.length > 30) sp.voiceSamples.shift()
          speakersRef.current = [...speakersRef.current]
          setSpeakers([...speakersRef.current])
          setActiveSpeakerId(ci)
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [])

  // Wake Lock 요청 (화면 꺼짐 방지)
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        console.log('[WakeLock] 화면 꺼짐 방지 활성화')
        
        // Wake Lock이 해제되면 다시 요청
        wakeLockRef.current?.addEventListener('release', () => {
          console.log('[WakeLock] 해제됨')
        })
      }
    } catch (err) {
      console.warn('[WakeLock] 활성화 실패:', err)
    }
  }

  // Wake Lock 해제
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        console.log('[WakeLock] 해제 완료')
      } catch (err) {
        console.warn('[WakeLock] 해제 실패:', err)
      }
    }
  }

  const startRecording = async () => {
    setIsInitializing(true)
    setPermissionError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      })
      streamRef.current = stream
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyserRef.current = analyser
      const src = ctx.createMediaStreamSource(stream)
      src.connect(analyser)
      const gain = ctx.createGain()
      gain.gain.value = 2.0
      src.connect(gain)
      gain.connect(analyser)

      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
        audioBitsPerSecond: 64000, // 64kbps - 음성 녹음에 충분, 1시간 약 28MB
      })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(100)

      recordingStartRef.current = Date.now()
      recordingEndRef.current = 0

      // Wake Lock 활성화 (화면 꺼짐 방지)
      await requestWakeLock()

      setIsRecording(true)
      setIsInitializing(false)
      animFrameRef.current = requestAnimationFrame(analyzeAudio)
    } catch {
      setPermissionError(true)
      setIsInitializing(false)
    }
  }

  const stopRecording = (): Promise<Blob> =>
    new Promise(resolve => {
      // Wake Lock 해제
      releaseWakeLock()
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          recordingEndRef.current = Date.now()
          resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
        }
        mediaRecorderRef.current.stop()
      } else resolve(new Blob([]))
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioContextRef.current) audioContextRef.current.close()
    })

  const handleEndMeeting = async () => {
    setIsRecording(false)
    setIsProcessing(true)
    setProcessingStatus('녹음 파일 생성 중...')
    try {
      const blob = await stopRecording()
      const recordingDurationSec = Math.round((recordingEndRef.current - recordingStartRef.current) / 1000)

      setProcessingStatus('음성 인식 처리 중 (Gemini 3.5 Flash)...')
      console.log('[녹음 시간] 실제:', recordingDurationSec, '초 / state:', elapsedTime, '초')

      let transcriptionText = ''
      try {
        const transcription = await transcribeAudio(blob)
        transcriptionText = transcription.text
        console.log('=== 전사 ===')
        console.log('길이:', transcriptionText.length)
        console.log('내용:', transcriptionText.substring(0, 600))
        console.log('=================')
      } catch (sttErr: any) {
        console.error('[STT 실패] 음성 인식 패:', sttErr.message)
        console.log('[STT 패] 화자 데이터만으로 결과를 생성합니다')
      }

      setProcessingStatus('분석 완료! 결과 페이지로 이동합니다...')

      // 화자 필터링: 최소 1초 이상 발언한 화자만 (배경음 제외)
      const validSpeakers = speakersRef.current.filter(s => s.talkTime >= 1.0)
      const detectedCount = Math.max(validSpeakers.length, 1)
      const names = validSpeakers.length > 0
        ? validSpeakers.map((_, i) => SPEAKER_NAMES[i] || `참여자 ${i + 1}`)
        : ['참여자 1', '참여자 2']

      console.log('[화자] 감지:', detectedCount, '명')
      validSpeakers.forEach((s, i) => console.log(`  화자${i+1}: ${Math.round(s.pitch)}Hz ${Math.round(s.talkTime*10)/10}초`))

      setTimeout(() => {
        navigate('/analyzing', {
          state: {
            meetingName: '모임',
            participants: names,
            detectedSpeakerCount: detectedCount,
            audioBlob: blob,
            transcription: transcriptionText,
            transcriptionDuration: recordingDurationSec,
            speakers: validSpeakers.map(s => ({ pitch: s.pitch, talkTime: s.talkTime, voiceSamples: s.voiceSamples })),
          }
        })
      }, 1000)
    } catch (err: any) {
      console.error('오류:', err)
      setProcessingStatus(`오류: ${err.message}`)
      setIsProcessing(false)
    }
  }

  const cleanup = useCallback(() => {
    releaseWakeLock()
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (audioContextRef.current) audioContextRef.current.close()
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  return (
    <div className="app-container flex flex-col px-6 py-12 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-1">모임 녹음</h1>
        <p className="text-gray-400 text-sm">
          {isProcessing ? processingStatus : isRecording ? '대화를 녹음하고 분석 중입니다...' : '마이크 권한이 필요합니다'}
        </p>
      </div>
      <div className="flex justify-center mb-6">
        <div className="text-5xl font-mono font-bold text-primary">{formatTime(elapsedTime)}</div>
      </div>
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-gray-400">{isProcessing ? '처리 중' : isRecording ? '녹음 중' : '대기'}</span>
        </div>
      </div>
      {isRecording && (
        <div className="flex justify-center mb-6">
          <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-100 ${audioLevel > 0.3 ? 'bg-primary' : audioLevel > 0.1 ? 'bg-yellow-500' : 'bg-zinc-600'}`}
              style={{ width: `${audioLevel * 100}%` }} />
          </div>
        </div>
      )}
      {isRecording && currentPitch && (
        <div className="flex justify-center mb-6">
          <div className="px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
            <span className="text-xs text-gray-400">음성 피치: </span>
            <span className="text-sm font-bold text-primary">{currentPitch} Hz</span>
          </div>
        </div>
      )}
      {isRecording && speakers.length > 0 && (
        <div className="flex-1 mb-8">
          <h2 className="text-sm font-medium text-gray-400 mb-4">감지된 화자 ({speakers.length}명)</h2>
          <div className="space-y-2">
            {speakers.map((sp, i) => (
              <div key={sp.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeSpeakerId === sp.id ? 'bg-zinc-800 border border-primary/50 scale-[1.02]' : 'bg-zinc-900 border border-transparent'
                }`}>
                <div className={`w-8 h-8 ${sp.color} rounded-full flex items-center justify-center`}>
                  <span className="text-sm font-bold text-white">{String(i + 1)}</span>
                </div>
                <div className="flex-1">
                  <span className="text-white text-sm font-medium">{SPEAKER_NAMES[i] || `참여자 ${i + 1}`}</span>
                  <span className="text-xs text-gray-500 ml-2">~{Math.round(sp.pitch)}Hz · {Math.round(sp.talkTime)}초 발언</span>
                </div>
                {activeSpeakerId === sp.id && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <span className="text-[10px] text-primary">발언 중</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {!isRecording && !permissionError && !isInitializing && !isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-gray-400 text-center text-sm mb-2">대화하는 음성을 녹음하여<br />참여자 수를 자동 감지합니다</p>
          <p className="text-gray-500 text-center text-xs">말소리만 탐지하여 최대 8명까지 구분합니다</p>
        </div>
      )}
      {permissionError && (
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <p className="text-red-400 text-sm mb-2">마이크 접근이 거부되었습니다</p>
          <p className="text-gray-500 text-xs">브라우저 설정에서 마이크 권한을 허용해주세요</p>
        </div>
      )}
      {isInitializing && (
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">마이크 연결 중...</p>
        </div>
      )}
      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">{processingStatus}</p>
        </div>
      )}
      <div className="space-y-3">
        {!isRecording && !isInitializing && !isProcessing && (
          <button onClick={startRecording} className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-2xl active:scale-95 transition-transform">
            녹음 시작
          </button>
        )}
        {isRecording && (
          <button onClick={handleEndMeeting} className="w-full py-4 bg-red-500 text-white text-lg font-semibold rounded-2xl active:scale-95 transition-transform">
            녹음 종료 및 분석
          </button>
        )}
      </div>
    </div>
  )
}