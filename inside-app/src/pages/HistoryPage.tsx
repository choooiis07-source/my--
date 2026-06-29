import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface HistoryItem {
  id: string
  date: string
  meetingName: string
  participants: string[]
  episodeTitle: string
  quote: string
  mvp: { name: string; reason: string }
  meme: string
  plotTwist: string
  ending: string
  funFact: string
  chemistry: string
}

// localStorage에서 히스토리 가져오기
function getHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem('inside-history')
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

// localStorage에 히스토리 저장
function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem('inside-history', JSON.stringify(items))
  } catch (e) {
    console.error('[History] 저장 실패:', e)
  }
}

// 히스토리 추가 (중복 방지)
function addHistory(item: Omit<HistoryItem, 'id' | 'date'>) {
  const items = getHistory()
  // 같은 meetingName과 participants가 이미 있으면 추가하지 않음
  const exists = items.some(
    (existing) =>
      existing.meetingName === item.meetingName &&
      JSON.stringify(existing.participants) === JSON.stringify(item.participants)
  )
  if (exists) return null

  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    date: new Date().toISOString(),
  }
  items.unshift(newItem)
  if (items.length > 50) items.length = 50
  saveHistory(items)
  return newItem
}

// 히스토리 삭제
function deleteHistory(id: string) {
  const items = getHistory().filter(item => item.id !== id)
  saveHistory(items)
}

// 페이지 간 데이터 공유용 이벤트
function dispatchHistoryUpdate() {
  window.dispatchEvent(new Event('history-update'))
}

export { addHistory, getHistory, deleteHistory, dispatchHistoryUpdate }

// 샘플 결과 데이터
const sampleResult: Omit<HistoryItem, 'id' | 'date'> = {
  meetingName: '금요일 저녁 회식',
  participants: ['민수', '지현', '영호', '수진'],
  episodeTitle: '4명의 3분 대화',
  quote: '야, 그거 알아? 김치찌개에 라면 사리를 넣으면 천국이야',
  mvp: { 
    name: '민수', 
    reason: '전체의 45% 발언\n음식 열정 200%' 
  },
  meme: 'ㅋㅋㅋㅋ 라면 사리 논쟁 터졌다',
  plotTwist: '영호가 사실 김치 싫어한다고 고백',
  ending: '다음엔 다 함께 김치찌개 먹기!',
  funFact: '영호가 김치를 싫어하는 이유는 엄마 때문!',
  chemistry: '모두가 영호를 놀리는 케미',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDemoBanner, setShowDemoBanner] = useState(true)

  useEffect(() => {
    setItems(getHistory())

    const handleUpdate = () => setItems(getHistory())
    window.addEventListener('history-update', handleUpdate)
    return () => window.removeEventListener('history-update', handleUpdate)
  }, [])

  const handleDelete = (id: string) => {
    deleteHistory(id)
    setItems(getHistory())
    setDeleteConfirm(null)
  }

  // 카드 클릭 시 전체 결과 보기
  const handleViewResult = (item: HistoryItem) => {
    navigate('/result', {
      state: {
        meetingName: item.meetingName,
        participants: item.participants,
        detectedSpeakerCount: item.participants.length,
        transcription: '저장된 대화 데이터',
        transcriptionDuration: 180,
        // 기존 분석 결과 전달
        _savedResult: item,
      },
    })
  }

  // 샘플 결과 보기
  const handleViewDemo = () => {
    const newItem = addHistory(sampleResult)
    if (newItem) {
      dispatchHistoryUpdate()
      setItems(getHistory())
    }
    // 첫 번째 항목의 결과 보기
    const first = getHistory()[0]
    if (first) handleViewResult(first)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return '방금 전'
    if (diffMin < 60) return `${diffMin}분 전`
    if (diffHour < 24) return `${diffHour}시간 전`
    if (diffDay < 7) return `${diffDay}일 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="app-container flex flex-col px-6 py-8 min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">모임 기록</h1>
          <p className="text-xs text-gray-500">{items.length}개의 기록</p>
        </div>
      </div>

      {/* 데모 결과 배너 */}
      {showDemoBanner && (
        <div className="mb-6 px-4 py-4 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <h3 className="text-sm font-bold text-primary">샘플 결과 미리보기</h3>
          </div>
          <p className="text-xs text-gray-300 mb-3">
            녹음하지 않고도 AI 분석 결과를 확인할 수 있어요
          </p>
          <button
            onClick={handleViewDemo}
            className="w-full py-2.5 bg-primary text-black text-sm font-bold rounded-xl active:scale-95 transition-transform"
          >
            🎉 4명 회식 결과 보기
          </button>
          <button
            onClick={() => setShowDemoBanner(false)}
            className="w-full mt-2 py-2 text-gray-400 text-xs"
          >
            닫기
          </button>
        </div>
      )}

      {/* 컨텐츠 */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">아직 기록이 없어요</h2>
          <p className="text-sm text-gray-400 mb-6">
            첫 번째 모임을 시작해보세요!
          </p>
          <button
            onClick={() => navigate('/recording')}
            className="w-full max-w-[200px] py-3 bg-primary text-black font-semibold rounded-2xl active:scale-95 transition-transform"
          >
            모임 시작하기
          </button>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative cursor-pointer hover:border-zinc-700 transition-colors"
              onClick={() => handleViewResult(item)}
            >
              {/* 삭제 확인 모달 */}
              {deleteConfirm === item.id && (
                <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center z-10" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-gray-300 mb-4">정말 삭제하시겠어요?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-6 py-2 bg-zinc-800 text-gray-300 rounded-xl text-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-6 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}

              {/* 카드 내용 - 간결하게 */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-primary font-medium">
                      {item.meetingName}
                    </span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs text-gray-500">{formatTime(item.date)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white whitespace-pre-line leading-snug">
                    {item.episodeTitle}
                  </h3>
                  <div className="flex items-center gap-1 mt-2">
                    {item.participants.slice(0, 4).map((name, i) => (
                      <div key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-gray-400">
                        {name}
                      </div>
                    ))}
                    {item.participants.length > 4 && (
                      <div className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-gray-500">
                        +{item.participants.length - 4}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteConfirm(item.id)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* 클릭 유도 아이콘 */}
              <div className="absolute right-4 bottom-4 text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 하단 새 모임 버튼 */}
      {items.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => navigate('/recording')}
            className="w-full py-4 bg-primary text-black text-base font-bold rounded-2xl active:scale-95 transition-transform"
          >
            새 모임 시작하기
          </button>
        </div>
      )}
    </div>
  )
}