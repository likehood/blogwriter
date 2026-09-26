import express from 'express';
import { hasApiKey, writeWithClaude } from './lib/ai.js';
import { writeWithTemplate } from './lib/template.js';
import { MAX_PHOTOS } from './public/shared.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '80mb' }));
app.use(express.static('public'));

app.get('/api/status', (_req, res) => {
  res.json({ ai: hasApiKey() });
});

app.post('/api/generate', async (req, res) => {
  const { answers, photos = [], mode } = req.body || {};
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: '답변 데이터가 없습니다.' });
  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) {
    return res.status(400).json({ error: `사진은 최대 ${MAX_PHOTOS}장까지 가능합니다.` });
  }

  // data URL → { mediaType, data }
  const parsed = [];
  for (const p of photos) {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(p || '');
    if (!m) return res.status(400).json({ error: '사진 형식이 올바르지 않습니다.' });
    parsed.push({ mediaType: m[1], data: m[2] });
  }

  const useAi = mode !== 'template' && hasApiKey();
  try {
    const post = useAi ? await writeWithClaude(answers, parsed) : writeWithTemplate(answers, parsed.length);
    res.json({ post, engine: useAi ? 'ai' : 'template' });
  } catch (err) {
    console.error('[generate]', err);
    // AI 실패 시 템플릿으로라도 글을 돌려준다
    res.json({
      post: writeWithTemplate(answers, parsed.length),
      engine: 'template',
      warning: `AI 작성에 실패해 기본 템플릿으로 작성했어요. (${err.message})`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`맛집 블로그 라이터: http://localhost:${PORT}  (AI: ${hasApiKey() ? 'ON' : 'OFF — 템플릿 모드'})`);
});
