import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="app-container flex flex-col items-center justify-center px-6">
      {/* 로고 */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
          <span className="text-4xl font-bold text-white">I</span>
        </div>
      </div>

      {/* 앱 이름 */}
      <h1 className="text-5xl font-bold tracking-tight mb-4">
        Inside
      </h1>

      {/* 슬로건 */}
      <p className="text-lg text-gray-400 text-center mb-12">
        Inside jokes deserve to last.
      </p>

      {/* 히스토리 버튼 */}
      <button
        onClick={() => navigate('/history')}
        className="w-full py-3 bg-zinc-900 text-gray-300 text-base font-medium rounded-2xl active:scale-95 transition-transform border border-zinc-800 mb-3"
      >
        지난 모임 기록 보기
      </button>

      {/* 모임 시작하기 버튼 */}
      <button
        onClick={() => navigate('/recording')}
        className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-2xl active:scale-95 transition-transform"
      >
        새 모임 시작하기
      </button>

      {/* 데모 결과 보기 */}
      <button
        onClick={() => navigate('/result', {
          state: {
            meetingName: '금요일 저녁 회식',
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
          }
        })}
        className="w-full py-3 bg-zinc-800 text-gray-400 text-sm font-medium rounded-2xl active:scale-95 transition-transform border border-zinc-700 mt-3"
      >
        ✨ 샘플 결과 미리보기 (4명 회식)
      </button>
    </div>
  )
}
