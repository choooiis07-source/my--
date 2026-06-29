// 음성 인식 (STT) - OpenRouter를 통한 OpenAI GPT-4o Mini Transcribe
// 오디오를 base64로 인코딩하여 audio/transcriptions 엔드포인트로 전송

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_AUDIO_API_URL = 'https://openrouter.ai/api/v1/audio/transcriptions'

// 사용 모델: OpenAI GPT-4o Mini Transcribe (저비용 고효율 음성 인식)
const MODEL_ID = 'openai/gpt-4o-mini-transcribe'

export interface TranscriptionResult {
  text: string
  language?: string
  duration?: number
}

// OpenRouter + GPT-4o Mini Transcribe로 음성 → 텍스트 변환
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENROUTER_API_KEY를 추가해주세요.')
  }

  // 빈 오디오(1KB 미만)는 처리하지 않음
  if (audioBlob.size < 1000) {
    return {
      text: '',
      language: 'ko',
      duration: 0,
    }
  }

  // 오디오 파일을 base64로 인코딩 (data URL prefix 제거)
  const base64Audio = await blobToBase64(audioBlob)
  const base64Data = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '')

  // 오디오 포맷 감지
  const audioFormat = detectAudioFormat(audioBlob.type)

  // 디버깅: base64 길이를 콘솔에 출력
  console.log('[whisper] 오디오 Blob 크기:', audioBlob.size, 'bytes')
  console.log('[whisper] base64 길이:', base64Data.length, '문자')
  console.log('[whisper] audio MIME 타입:', audioBlob.type)
  console.log('[whisper] 감지된 포맷:', audioFormat)

  const response = await fetch(OPENROUTER_AUDIO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Inside App',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      input_audio: {
        data: base64Data,
        format: audioFormat,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = errorData.error?.message || `OpenRouter API 요청 실패: ${response.status}`
    console.error('[whisper] API 오류:', errorMsg)
    throw new Error(errorMsg)
  }

  const data = await response.json()
  let text = data.text || ''

  // 결과 후처리: 불필요한 공백 제거
  text = text.trim()

  // 디버깅: 전사 결과 출력
  console.log('=== GPT-4o Mini Transcribe 전사 결과 ===')
  console.log('길이:', text.length, '문자')
  console.log('내용:', text.substring(0, 500))
  console.log('==========================================')

  // 환각 의심 감지: 전사 결과가 오디오에 비해 지나치게 길거나, 완벽한 소개글/설명문 형태이면 경고
  if (text.length > 500) {
    const hasExplanationPattern =
      text.includes('시설이') ||
      text.includes('방문했는데') ||
      text.includes('이용할 수 있습니다') ||
      text.includes('권장합니다') ||
      text.includes('무료로') ||
      text.includes('회원 가입')
    if (hasExplanationPattern) {
      console.warn('[whisper] ⚠️ 환각 의심: 전사 결과가 소개글/설명문 형태입니다. 오디오를 다시 확인하세요.')
    }
  }

  return {
    text,
    language: 'ko',
    duration: 0,
  }
}

// 오디오 MIME 타입을 GPT-4o Mini Transcribe 포맷으로 변환
function detectAudioFormat(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  if (mimeType.includes('flac')) return 'flac'
  if (mimeType.includes('ogg')) return 'ogg'
  // 기본값: webm (MediaRecorder 기본 포맷)
  return 'webm'
}

// 음성 인식 결과를 Gemini로 정리/요약 (핵심 내용 추출용)
export async function summarizeTranscription(transcription: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENROUTER_API_KEY를 추가해주세요.')
  }

  const CHAT_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Inside App',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.5-flash',
      messages: [
        {
          role: 'user',
          content: `다음은 음성 인식으로 변환된 실제 대화 내용입니다. 이 대화의 핵심 내용, 재미있는 부분, 주요 에피소드를 한국어로 깔끔하게 정리해주세요. 단, 대화 내용에서 유추할 수 없는 내용을 지어내지 마세요.\n\n대화 내용:\n${transcription}`
        }
      ],
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `OpenRouter API 요청 실패: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// transcription 텍스트에서 키워드 기반 장르 추출
export function detectGenre(transcription: string): string {
  if (!transcription || transcription.length < 5) return '대담'

  const keywords: Record<string, string[]> = {
    '수다': ['ㅋㅋ', 'ㅎㅎ', '웃', '재미', '하하', '우와', '미쳤', '개'],
    '논의': ['생각', '의견', '왜냐', '그래서', '때문에', '정리', '결론', '계획'],
    '리뷰': ['맛', '좋', '별로', '추천', '가봤', '봤는데', '후기', '평점'],
    '회상': ['옛날', '기억', '그때', '추억', '예전', '지난번', '전'],
    '고민': ['어떡', '어떻게', '고민', '걱정', '스트레스', '힘들', '어렵'],
    '정보 공유': ['방법', '하는 법', '어떻게 해', '몰랐', '알려줘', '팁'],
  }

  const counts: Record<string, number> = {}
  for (const [genre, kws] of Object.entries(keywords)) {
    counts[genre] = kws.filter(kw => transcription.includes(kw)).length
  }

  const topGenre = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (topGenre && topGenre[1] >= 1) return topGenre[0]
  return '대화'
}

// transcription 텍스트에서 주제 키워드 추출
export function extractTopics(transcription: string): string[] {
  if (!transcription || transcription.length < 5) return ['대화']

  const keywordMap: Record<string, string[]> = {
    '음식': ['밥', '먹', '맛', '요리', '치킨', '피자', '카페', '술', '소주', '맥주', '라면', '고기'],
    '여행': ['여행', '제주', '부산', '해외', '휴가', '관광', '호텔', '비행기', '펜션'],
    '연애': ['연애', '사랑', '데이트', '소개팅', '헤어', '결혼', '남친', '여친', '남자친구', '여자친구', ' crush'],
    '직장': ['회사', '직장', '상사', '동료', '퇴사', '출근', '야근', '연봉', '이직', '인턴'],
    '취미': ['게임', '운동', '독서', '영화', '드라마', '노래', '음악', '그림', '사진', '헬스', '러닝'],
    '일상': ['오늘', '어제', '내일', '주말', '월요일', '피곤', '바빠', '힘들', '기상', '취침'],
    '미래': ['미래', '계획', '꿈', '목표', '준비', '시작', '변화', '도전', '진로'],
    '추억': ['기억', '예전', '옛날', '그때', '추억', '그리워', '중학교', '고등학교', '초등학교'],
    '가족': ['엄마', '아빠', '언니', '오빠', '형', '동생', '누나', '여동생', '남동생', '부모님'],
    '친구': ['친구', '동기', '선배', '후배', '인생친구', '단짝', '베프'],
    '연예': ['아이돌', '배우', '가수', '셀럽', '예능', '콘서트', '팬'],
  }

  const found: string[] = []
  for (const [tag, kws] of Object.entries(keywordMap)) {
    if (kws.some(kw => transcription.includes(kw))) {
      found.push(tag)
    }
  }
  return found.length > 0 ? found : ['대화']
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}