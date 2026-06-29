import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SetupPage() {
  const navigate = useNavigate()
  const [meetingName, setMeetingName] = useState('')
  const [participants, setParticipants] = useState<string[]>([''])
  const [newParticipant, setNewParticipant] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const addParticipant = () => {
    if (newParticipant.trim()) {
      setParticipants([...participants, newParticipant.trim()])
      setNewParticipant('')
    }
  }

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index))
    }
  }

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditValue(participants[index])
  }

  const saveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      const newParticipants = [...participants]
      newParticipants[editingIndex] = editValue.trim()
      setParticipants(newParticipants)
      setEditingIndex(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  const handleStartRecording = () => {
    if (meetingName.trim() && participants.some(p => p.trim())) {
      navigate('/recording', {
        state: {
          meetingName: meetingName.trim(),
          participants: participants.filter(p => p.trim())
        }
      })
    }
  }

  return (
    <div className="app-container flex flex-col px-6 py-12">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">모임 설정</h1>
        <p className="text-gray-400">오늘 모임을 준비해주세요</p>
      </div>

      {/* 모임 이름 입력 */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          모임 이름
        </label>
        <input
          type="text"
          value={meetingName}
          onChange={(e) => setMeetingName(e.target.value)}
          placeholder="예: 금요일 저녁 회식"
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* 참여자 추가 */}
      <div className="mb-8 flex-1">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          참여자
        </label>
        
        {/* 참여자 리스트 */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {participants.map((participant, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-4 py-3 bg-zinc-900 rounded-xl"
            >
              {editingIndex === index ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1 bg-transparent text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={saveEdit}
                    className="text-primary text-sm font-medium"
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-gray-500 text-sm"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span 
                    className="flex-1 text-white cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEditing(index)}
                  >
                    {participant || `참여자 ${index + 1}`}
                  </span>
                  <button
                    onClick={() => startEditing(index)}
                    className="text-gray-500 hover:text-primary transition-colors"
                    title="수정"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  {participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(index)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* 새 참여자 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
            placeholder="이름 입력"
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={addParticipant}
            className="px-4 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* 녹음 시작 버튼 */}
      <button
        onClick={handleStartRecording}
        disabled={!meetingName.trim() || !participants.some(p => p.trim())}
        className="w-full py-4 bg-primary text-white text-lg font-semibold rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      >
        녹음 시작
      </button>
    </div>
  )
}