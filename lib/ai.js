import Anthropic from '@anthropic-ai/sdk';
import { POST_SCHEMA } from './schema.js';
import { RATING_ITEMS, TONES } from '../public/shared.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5';

const SYSTEM = `당신은 네이버 블로그에서 활동하는 인기 맛집 블로거입니다.
사용자가 올린 음식/매장 사진과 인터뷰 답변을 바탕으로 네이버 블로그 맛집 리뷰 글을 한국어로 씁니다.

규칙:
- 영업시간, 가격, 주소, 주차 같은 사실 정보는 사용자가 준 답변만 사용하고 절대 지어내지 마세요. 모르는 정보는 언급하지 않습니다.
- 사진에서 실제로 보이는 것(음식의 모양, 색, 양, 플레이팅, 매장 분위기)을 구체적으로 묘사하세요. 사용자의 사진 메모가 있으면 우선합니다.
- 맛 평가와 총평은 사용자의 별점·코멘트·종합 평가의 뉘앙스를 그대로 살리세요. 사용자가 아쉽다고 한 점을 칭찬으로 바꾸지 마세요.
- photoSections는 사진 순서대로 사진마다 정확히 하나씩, photoIndex는 0부터 씁니다.
- 매장 정보 표와 별점 표는 따로 들어가므로 본문에서 영업시간·주소를 길게 반복하지 마세요.
- 강조하고 싶은 짧은 구절은 **굵게** 표시할 수 있습니다(문단당 최대 1~2개).
- 광고 문구처럼 과장하지 말고, 실제 방문한 사람이 쓴 자연스러운 후기처럼 쓰세요.`;

function fmtAnswers(a, photoCount) {
  const lines = [];
  const add = (k, v) => v && String(v).trim() && lines.push(`- ${k}: ${String(v).trim()}`);
  add('가게 이름', a.name);
  add('음식 종류', a.category);
  add('위치', a.address);
  add('가는 법', a.directions);
  add('주중 영업시간', a.hoursWeekday);
  add('주말 영업시간', a.hoursWeekend);
  add('브레이크타임/라스트오더', a.breakTime);
  add('휴무일', a.closedDays);
  add('주차', a.parking);
  add('방문 정보', a.visit);
  add('주문 메뉴/가격', a.menus);
  for (const { key, label } of RATING_ITEMS) {
    const r = a.ratings?.[key];
    if (r?.score) add(`${label} 별점`, `${r.score}/5${r.comment ? ` (${r.comment})` : ''}`);
  }
  add('재방문 의사', a.revisit);
  if (a.overallScore) add('종합 별점', `${a.overallScore}/5`);
  add('종합 평가(사용자 원문)', a.overallComment);
  const memos = (a.photoMemos || []).slice(0, photoCount);
  const memoLines = memos.map((m, i) => (m ? `  - 사진 ${i + 1}: ${m}` : null)).filter(Boolean);
  if (memoLines.length) lines.push('- 사진 메모:', ...memoLines);
  return lines.join('\n');
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/**
 * @param {object} answers 인터뷰 답변
 * @param {{mediaType: string, data: string}[]} photos base64 JPEG (순서대로)
 */
export async function writeWithClaude(answers, photos) {
  const client = new Anthropic();
  const tone = TONES[answers.tone] || TONES.friendly;

  const content = [];
  photos.forEach((p, i) => {
    content.push({ type: 'text', text: `[사진 ${i + 1}] (photoIndex ${i})` });
    content.push({ type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.data } });
  });
  content.push({
    type: 'text',
    text: `위 사진 ${photos.length}장은 사용자가 올린 순서입니다.

인터뷰 답변:
${fmtAnswers(answers, photos.length)}

말투: ${tone.guide}

이 내용으로 네이버 블로그 맛집 리뷰 글을 작성해 주세요.`,
  });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // 안전 분류기가 요청을 거절하면 서버 측에서 다른 모델로 자동 재시도
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { format: { type: 'json_schema', schema: POST_SCHEMA } },
  });

  if (response.stop_reason === 'refusal') throw new Error('AI가 이 요청에 대한 작성을 거절했습니다.');
  if (response.stop_reason === 'max_tokens') throw new Error('글이 너무 길어 중간에 잘렸습니다.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const post = JSON.parse(text);
  return normalizePost(post, photos.length);
}

// 사진 섹션이 빠지거나 순서가 어긋나도 사진 수에 맞춰 정리
export function normalizePost(post, photoCount) {
  const byIndex = new Map();
  for (const s of post.photoSections || []) {
    if (Number.isInteger(s.photoIndex) && s.photoIndex >= 0 && s.photoIndex < photoCount && !byIndex.has(s.photoIndex)) {
      byIndex.set(s.photoIndex, s);
    }
  }
  const photoSections = Array.from({ length: photoCount }, (_, i) => byIndex.get(i) || { photoIndex: i, caption: '', text: '' });
  const hashtags = (post.hashtags || []).map((t) => String(t).replace(/^#+/, '').replace(/\s+/g, '')).filter(Boolean);
  return { ...post, photoSections, hashtags };
}
