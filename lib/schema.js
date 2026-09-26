// Claude 구조화 출력 스키마 — 글 뼈대 중 AI가 채우는 부분
export const POST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'titleCandidates', 'intro', 'photoSections', 'ratingComment', 'outro', 'hashtags'],
  properties: {
    title: { type: 'string', description: '대표 제목 (지역 + 가게명 + 핵심 메뉴 포함, 40자 이내)' },
    titleCandidates: { type: 'array', items: { type: 'string' }, description: '다른 제목 후보 3개' },
    intro: { type: 'string', description: '인트로 2~4문단. 문단은 빈 줄(\\n\\n)로 구분' },
    photoSections: {
      type: 'array',
      description: '사진 순서대로 사진당 정확히 1개',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['photoIndex', 'caption', 'text'],
        properties: {
          photoIndex: { type: 'integer', description: '0부터 시작하는 사진 번호' },
          caption: { type: 'string', description: '사진 아래 짧은 캡션 (20자 이내)' },
          text: { type: 'string', description: '사진에 대한 본문 1~3문단' },
        },
      },
    },
    ratingComment: { type: 'string', description: '항목별 평가표 아래 붙일 2~3문장 코멘트' },
    outro: { type: 'string', description: '사용자의 종합 평가를 바탕으로 한 총평 2~4문단' },
    hashtags: { type: 'array', items: { type: 'string' }, description: '# 없이 해시태그 10~15개' },
  },
};
