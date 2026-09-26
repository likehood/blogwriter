// API 키 없이도 동작하는 템플릿 기반 작성기. AI 작성기와 같은 형태의 글 JSON을 만든다.
import { RATING_ITEMS } from '../public/shared.js';

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

function area(address = '') {
  // "서울 마포구 연남동 123-4" → "연남동" 처럼 동/읍/면/로/길 단위를 우선 추출
  const parts = address.split(/\s+/).filter(Boolean);
  const dong = parts.find((p) => /(동|읍|면|가)$/.test(p) && !/시$|도$/.test(p));
  const gu = parts.find((p) => /(구|군)$/.test(p));
  return dong || gu || parts[1] || parts[0] || '';
}

const SCORE_WORDS = {
  5: ['정말 최고였어요', '흠잡을 데가 없었어요', '완벽 그 자체였어요'],
  4: ['꽤 만족스러웠어요', '기대 이상이었어요', '좋았어요'],
  3: ['무난했어요', '보통 수준이었어요', '나쁘지 않았어요'],
  2: ['조금 아쉬웠어요', '살짝 기대에 못 미쳤어요'],
  1: ['많이 아쉬웠어요', '개선이 필요해 보였어요'],
};

const TONE = {
  friendly: { end: '요', wow: '', emoji: (e) => ` ${e}` },
  info: { end: '다', wow: '', emoji: () => '' },
  bubbly: { end: '요!!', wow: 'ㅎㅎ ', emoji: (e) => ` ${e}${e}` },
};

export function writeWithTemplate(a, photoCount) {
  const t = TONE[a.tone] || TONE.friendly;
  const name = a.name?.trim() || '이곳';
  const where = area(a.address);
  const firstMenu = (a.menus || '').split(/[\n,·]/)[0].replace(/[\d,]+\s*원?/g, '').replace(/[-:()]/g, ' ').trim();
  const seed = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);

  const title = [where, name, firstMenu && `${firstMenu} 맛집`, '솔직 후기'].filter(Boolean).join(' ');
  const titleCandidates = [
    `${where ? `${where} ` : ''}${a.category || '맛집'} 추천, ${name} 다녀왔어요`,
    `${name} 내돈내산 방문 후기${firstMenu ? ` (${firstMenu})` : ''}`,
    `${where ? `${where}에서 ` : ''}${a.revisit?.includes('무조건') ? '또 가고 싶은' : '가볼 만한'} ${name}`,
  ];

  const intro = [
    `안녕하세요!${t.emoji('😊')} 오늘은 ${where ? `${where}에 있는 ` : ''}${a.category ? `${a.category} ` : ''}**${name}**에 다녀온 후기를 들고 왔어요.`,
    a.visit?.trim() ? `${a.visit.trim()} 방문했는데, 어땠는지 사진과 함께 자세히 보여드릴게요.` : '어땠는지 사진과 함께 자세히 보여드릴게요.',
  ].join('\n\n');

  const memos = a.photoMemos || [];
  const photoSections = Array.from({ length: photoCount }, (_, i) => {
    const memo = memos[i]?.trim();
    const text = memo
      ? `${memo}${/[.!?]$/.test(memo) ? '' : '.'}`
      : i === 0
        ? `${name}의 모습이에요.`
        : pick(['비주얼부터 합격이었어요.', '한 장 더 보여드릴게요.', '가까이서 찍어봤어요.', '이 부분도 놓칠 수 없죠.'], seed + i);
    return { photoIndex: i, caption: memo ? memo.slice(0, 20) : '', text };
  });

  const scored = RATING_ITEMS.map((r) => ({ ...r, ...(a.ratings?.[r.key] || {}) })).filter((r) => r.score);
  const best = [...scored].sort((x, y) => y.score - x.score)[0];
  const worst = [...scored].sort((x, y) => x.score - y.score)[0];
  const rc = [];
  if (best) rc.push(`특히 **${best.label}**${best.comment ? `(${best.comment})` : ''}은(는) ${pick(SCORE_WORDS[best.score], seed)}.`);
  if (worst && worst !== best && worst.score <= 3) rc.push(`다만 ${worst.label}${worst.comment ? `(${worst.comment})` : ''}은(는) ${pick(SCORE_WORDS[worst.score], seed)}.`);
  const ratingComment = rc.join(' ');

  const outroParts = [];
  if (a.overallComment?.trim()) outroParts.push(a.overallComment.trim());
  if (a.revisit) outroParts.push(`재방문 의사는 **${a.revisit}**!${t.emoji('👍')}`);
  outroParts.push(`${where ? `${where} ` : ''}근처에서 ${a.category || '식사'}할 곳 찾으신다면 참고해 보세요. 오늘도 읽어주셔서 감사합니다${t.emoji('🙏')}`);

  const hashtags = [
    name, where && `${where}맛집`, where && `${where}${a.category || '맛집'}`, a.category && `${a.category}맛집`,
    firstMenu && firstMenu.replace(/\s+/g, ''), '맛집추천', '내돈내산', '맛집리뷰', '먹스타그램', '맛집탐방',
  ].filter(Boolean).map((s) => s.replace(/\s+/g, ''));

  return { title, titleCandidates, intro, photoSections, ratingComment, outro: outroParts.join('\n\n'), hashtags: [...new Set(hashtags)] };
}
