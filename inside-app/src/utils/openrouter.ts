// OpenRouter API 유리티 - Gemini 3.1 Flash Image + Veo 3.1 + Gemini 분석

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface ImageGenerationResult {
  imageUrl: string
  text: string
}

export interface VideoGenerationResult {
  videoUrl: string
  text: string
}

export interface MeetingData {
  meetingName: string
  participants: string[]
  episodeTitle: string
  quote: string
  quoteAuthor: string
  quoteContext: string
  mvp: string
  mvpReason: string
}

// Inside 결과 JSON 구조
export interface InsideResult {
  episodeTitle: string
  quote: string
  mvp: { name: string; reason: string }
  meme: string
  plotTwist: string
  ending: string
  funFact: string
  chemistry: string
}

// Gemini로 transcription 분석 → InsideResult JSON 생성
export async function analyzeTranscription(
  participants: string[],
  transcription: string,
  totalDuration: number
): Promise<InsideResult | null> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다.')
  }

  // transcription이 너무 짧으면 분석하지 않음
  if (transcription.trim().length < 20) return null

  const durationMinutes = Math.max(Math.round(totalDuration / 60), 1)

  const response = await fetch(OPENROUTER_API_URL, {
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
          role: 'system',
          content: `당신은 친구 모임 대화를 분석하는 AI입니다. 아래 규칙을 엄격히 따르세요:
1. 반드시 실제 대화 내용에서만 정보를 추출하세요. 상상하거나 지어내지 마세요.
2. 결과가 JSON 형식이어야 합니다.
3. 한국어로 작성하세요.
4. 재미있고 캐주얼한 톤으로 작성하세요.
5. 소개글, 설명문, 안내문 형태는 절대 금지입니다.`,
        },
        {
          role: 'user',
          content: `다음은 ${participants.length}명의 친구들이 ${durationMinutes}분간 나눈 실제 대화입니다.

참여자: ${participants.join(', ')}

대화 내용:
"""
${transcription}
"""

위 대화를 분석하여 아래 JSON 형식으로 결과를 만들어주세요. 반드시 JSON만 반환하고, 다른 설명은 추가하지 마세요.

{
  "episodeTitle": "X명의 Y분 대화" 형식 (예: "2명의 3분 대화")
  "quote": 대화에서 가장 인상적이거나 재미있는 한 문장 (명대사)
  "mvp": {
    "name": 가장 많이 말했거나 대화를 이끈 참여자 이름
    "reason": MVP 선정 이유 (재미있게, "~초 발언, 전체의 X%")
  }
  "meme": 대화에서 가장 웃기거나 밈이 될 수 있는 짧은 구절 (ㅋㅋ, !, ? 포함된 짧은 문장)
  "plotTwist": 대화에서 반전이나 의외의 순간 (없으면 "반전 없음")
  "ending": 대화의 마지막 느낌이나 마무리 문장
  "funFact": 대화에서 발견된 가장 재미있거나 놀라운 사실/에피소드 (한 문장, ! 포함)
  "chemistry": 참여자들 사이의 케미를 보여주는 가장 웃긴 순간 (한 문장)
}

주의:
- 절대 지어내지 말고 실제 대화 내용에서만 추출
- 소개글/설명문/안내문 형태 금지
- 재미있고 캐주얼한 톤
- JSON만 반환, 다른 텍스트 금지`,
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API 요청 실패: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // JSON 파싱
  try {
    // 마크다운 코드 블록 제거
    const jsonStr = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const result = JSON.parse(jsonStr) as InsideResult

    // 유효성 검증
    if (!result.episodeTitle || !result.quote || !result.mvp?.name) {
      console.warn('[analyze] JSON 구조 불완전, fallback 사용')
      return createFallbackResult(participants, transcription, totalDuration)
    }

    console.log('[analyze] Gemini 분석 결과:', JSON.stringify(result, null, 2))
    return result
  } catch (e) {
    console.warn('[analyze] JSON 파싱 실, fallback 사용:', e)
    return createFallbackResult(participants, transcription, totalDuration)
  }
}

// Gemini 분석 실패 시 fallback (키워드 기반)
function createFallbackResult(
  participants: string[],
  transcription: string,
  totalDuration: number
): InsideResult {
  const durationMinutes = Math.max(Math.round(totalDuration / 60), 1)
  const sentences = transcription
    .split(/[.!?。！？\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 2)

  const longestSentence = sentences.reduce(
    (longest, current) => current.length > longest.length ? current : longest, '')

  const funnySentences = sentences.filter(
    s => /[ㅋㅋㅎㅎ!？!?]/.test(s) && s.length > 3 && s.length < 50)
  const memeText = funnySentences.length > 0 ? funnySentences[0]
    : (transcription.length > 10 ? transcription.substring(0, 40) + '...' : '')

  const plotTwistKw = ['그런데', '사실은', '알고보니', '근데', '사실']
  const plotTwist = sentences.find(s => plotTwistKw.some(k => s.includes(k)))
    || (sentences.length > 2 ? sentences[Math.floor(sentences.length / 2)] : longestSentence)

  const ending = sentences.length > 0 ? sentences[sentences.length - 1] : ''

  const funFactKw = ['처음', '최초', '알고', '몰랐', '신기', '놀라', '진짜', '완전']
  const funFact = sentences.find(s => funFactKw.some(k => s.includes(k)))
    || (funnySentences.length > 1 ? funnySentences[1] : '특별한 사실 없음!')

  const chemistryKw = ['함께', '같이', '우리', '다 같이', '팀', '친구']
  const chemistry = sentences.find(s => chemistryKw.some(k => s.includes(k)))
    || (funnySentences.length > 2 ? funnySentences[2] : '좋은 케미!')

  return {
    episodeTitle: `${participants.length}명의\n${durationMinutes}분 대화`,
    quote: longestSentence || (transcription.substring(0, 50) || ''),
    mvp: { name: participants[0] || '참여자 1', reason: '대화 참여' },
    meme: memeText,
    plotTwist: plotTwist || '반전 없음',
    ending: ending || '',
    funFact: funFact,
    chemistry: chemistry,
  }
}

// Gemini로 각 화자의 특성을 분석 (NameSettingPage용)
export async function analyzeSpeakerCharacter(
  speakerName: string,
  speakerTranscription: string,
  allTranscription: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다.')
  }

  if (!speakerTranscription.trim()) {
    return '조용하지만 모든 걸 듣고 있는 참여자'
  }

  const response = await fetch(OPENROUTER_API_URL, {
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
          role: 'system',
          content: `당신은 친구 모임에서 각 참여자의 말투와 성격을 분석하는 AI입니다.
규칙:
1. 한 줄로 재미있게 설명하세요 (20자 내외)
2. 실제 대화 내용에서만 특징을 추출하세요
3. 캐주얼하고 친근한 톤
4. 이모지 하나 포함
5. 소개글/설명문 형태 금지`,
        },
        {
          role: 'user',
          content: `전체 대화:
"""
${allTranscription}
"""

위 대화에서 "${speakerName}"의 발언 내용:
"""
${speakerTranscription}
"""

${speakerName}의 말투와 성격을 한 줄로 재미있게 설명해주세요. 이모지 하나 포함. 20자 내외.`,
        },
      ],
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    return '개성 넘치는 참여자'
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || '개성 넘치는 참여자'
}

// Gemini 3.1 Flash Image로 이미지 생성
export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' = '1:1'
): Promise<ImageGenerationResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다.')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Inside App',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: aspectRatio,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API 요청 실패: ${response.status}`)
  }

  const data = await response.json()
  const message = data.choices?.[0]?.message

  let imageUrl = ''
  if (message?.images?.[0]?.image_url?.url) {
    imageUrl = message.images[0].image_url.url
  }

  return {
    imageUrl,
    text: message?.content || '',
  }
}

// Veo 3.1로 영상 생성 (AI Shorts용)
export async function generateVideo(
  prompt: string,
  duration: '4' | '8' = '8'
): Promise<VideoGenerationResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API 키가 설정되지 않았습니다.')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Inside App',
    },
    body: JSON.stringify({
      model: 'google/veo-3.1-fast',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      modalities: ['video', 'text'],
      video_config: {
        duration_seconds: parseInt(duration),
        resolution: '720p',
        aspect_ratio: '9:16',
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `영상 생성 실패: ${response.status}`)
  }

  const data = await response.json()
  const message = data.choices?.[0]?.message

  let videoUrl = ''
  if (message?.videos?.[0]?.video_url?.url) {
    videoUrl = message.videos[0].video_url.url
  }

  return {
    videoUrl,
    text: message?.content || '',
  }
}

// AI Poster - 영화 포스터 스타일
export async function generatePoster(meeting: MeetingData): Promise<ImageGenerationResult> {
  const prompt = `Design a dark cinematic Korean movie poster. Title: "${meeting.episodeTitle}". 
Genre: Comedy-Drama. Rating: 19+. Duration: 2 hours.
Show silhouettes of ${meeting.participants.length} friends at a late-night pocha (Korean bar).
Neon signs, soju bottles, BBQ grill smoke. Moody blue and orange lighting.
Large bold Korean title text at top. Tagline at bottom: "${meeting.mvp} - MVP of the night".
Professional film poster composition, dramatic shadows.`

  return generateImage(prompt, '9:16')
}

// AI Shorts - 실제 10초 9:16 영상 생성 (Veo 3.1)
export async function generateShortsVideo(
  scenario: string,
): Promise<VideoGenerationResult> {
  const prompt = `Korean variety show style vertical short video (9:16). 
Scene: A group of young Korean friends at a late-night pocha (Korean BBQ bar), laughing and joking.
${scenario}
Bright lighting, energetic atmosphere, comic-style zoom effects on reactions.
10 seconds duration, high quality, vibrant colors.`

  return generateVideo(prompt, '8')
}

// AI Comic - 한국 웹툰 표지
export async function generateComicCover(meeting: MeetingData): Promise<ImageGenerationResult> {
  const prompt = `Design a Korean webtoon (manhwa) cover page. Title: "${meeting.episodeTitle}".
Art style: Modern Korean webtoon with clean line art and vibrant colors.
Show ${meeting.participants.length} friends in a dramatic scene - one person telling an epic story while others react with shock and laughter.
Speech bubbles with Korean text. Dynamic panel layout.
Title in bold webtoon-style font at top. Episode number badge.
Color palette: Purple, blue, and gold accents. Professional webtoon cover composition.`

  return generateImage(prompt, '9:16')
}

// 공유 카드 이미지 생성 (인스타 스리, 블로그 등) - Netflix/Apple Music/Spotify 감성
export async function generateShareCard(
  meeting: MeetingData,
  aspectRatio: '9:16' | '1:1' | '16:9' = '1:1'
): Promise<ImageGenerationResult> {
  const prompt = `Design a premium social media share card for a Korean friend group app called "Inside". Inspired by Netflix, Apple Music, and Spotify design language.

VISUAL STYLE (Premium streaming aesthetic):
- Ultra-clean dark mode with pure black (#000000) or near-black (#0a0a0a) background
- Subtle radial gradient overlay (deep charcoal to pure black)
- Minimalist layout with generous whitespace
- No decorative elements, no emojis, no neon, no glassmorphism
- Clean geometric shapes only
- Subtle grain/noise texture for premium feel
- Soft ambient light effect from top

LAYOUT:
- Top-left: "Inside" wordmark in clean sans-serif, small, white, 12px equivalent
- Upper section: Episode title "${meeting.episodeTitle}" in large, bold, white typography (48-64px equivalent), tight letter-spacing (-0.02em)
- Middle section: A thin horizontal divider line (1px, white 20% opacity)
- Quote section: "${meeting.quote}" in medium-weight white text (20-24px), with a subtle orange/amber accent bar (3px wide) on the left side
- MVP section: Small label "MVP" in uppercase tracking-wider gray text, followed by "${meeting.mvp}" in bold white, and "${meeting.mvpReason}" in smaller gray text below
- Bottom: Participant names "${meeting.participants.join('  ·  ')}" in small gray text, centered

COLOR PALETTE:
- Background: Pure black (#000000) or #0a0a0a
- Primary text: Pure white (#ffffff)
- Secondary text: Medium gray (#888888)
- Accent: Warm amber/orange (#f5a623) - used sparingly, only for the quote accent bar
- Divider: White at 15-20% opacity

TYPOGRAPHY:
- Clean, modern sans-serif (like SF Pro, Inter, or Pretendard)
- Strong hierarchy: huge title → medium quote → small metadata
- Tight letter-spacing on headings (-0.02em to -0.03em)
- Normal letter-spacing on body text
- No gradient text, no glow effects, no shadows on text

DESIGN PRINCIPLES:
- Less is more - every element must earn its place
- Typography IS the design
- Dark, moody, cinematic feel
- Premium and sophisticated
- Quiet confidence, not loud excitement

NO: Emojis, neon colors, holographic effects, glassmorphism, 3D elements, rounded blobs, bright colors, playful elements, TikTok aesthetic, Gen-Z aesthetic

Aspect ratio: ${aspectRatio}`

  return generateImage(prompt, aspectRatio)
}

// Memory Book - 감성 추억북 표지
export async function generateMemoryBookCover(meeting: MeetingData): Promise<ImageGenerationResult> {
  const prompt = `Create a warm, nostalgic memory book cover. Title: "${meeting.meetingName} - 오늘의 기록".
Style: Soft watercolor illustration with pastel colors.
Show a cozy scene of ${meeting.participants.length} friends sharing food and drinks, with polaroid photos scattered around.
Featured quote in elegant handwriting: "${meeting.quote}" - ${meeting.quoteAuthor}
Decorative elements: dried flowers, washi tape, stickers, heart doodles.
Warm cream and soft pink background. Scrapbook aesthetic with layered textures.`

  return generateImage(prompt, '1:1')
}