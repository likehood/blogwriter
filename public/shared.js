// 브라우저와 서버가 함께 쓰는 상수

export const RATING_ITEMS = [
  { key: 'kindness', label: '친절도' },
  { key: 'cleanliness', label: '청결도' },
  { key: 'taste', label: '맛' },
  { key: 'price', label: '가격' },
  { key: 'value', label: '가성비' },
];

export const TONES = {
  friendly: {
    label: '친근한 ~요체',
    guide: '친구에게 추천하듯 친근한 존댓말(~요, ~더라구요). 이모지는 문단당 0~1개 정도로 가볍게.',
  },
  info: {
    label: '담백한 정보형',
    guide: '군더더기 없이 정보 위주의 담백한 존댓말(~습니다/~요 혼용 가능). 이모지는 거의 쓰지 않음.',
  },
  bubbly: {
    label: '발랄 · 이모지 많이',
    guide: '신나고 발랄한 말투(~했어요!! ㅎㅎ), 이모지를 적극적으로 사용. 감탄사와 리액션 풍부하게.',
  },
};

export const MAX_PHOTOS = 30;
