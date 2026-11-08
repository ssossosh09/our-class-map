const { Redis } = require('@upstash/redis');

// 환경변수 자동 감지
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Redis 환경변수가 없을 경우 에러 메시지 반환
  if (!redis) {
    return res.status(500).json({ 
      error: 'Environment variables missing',
      detail: 'KV_REST_API_URL or KV_REST_API_TOKEN is missing in Vercel Settings' 
    });
  }

  const STORAGE_KEY = 'class_world_issues_data';

  try {
    // 1. 목록 조회 (GET)
    if (req.method === 'GET') {
      const data = await redis.get(STORAGE_KEY);
      return res.status(200).json(data || []);
    }

    // 2. 핀 등록 (POST)
    if (req.method === 'POST') {
      const newIssue = req.body;
      const currentList = (await redis.get(STORAGE_KEY)) || [];
      const updatedList = [newIssue, ...currentList.filter(item => item.id !== newIssue.id)];
      await redis.set(STORAGE_KEY, updatedList);
      return res.status(200).json({ success: true, item: newIssue });
    }

    // 3. 핀 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const currentList = (await redis.get(STORAGE_KEY)) || [];
      const updatedList = currentList.filter(item => String(item.id) !== String(id));
      await redis.set(STORAGE_KEY, updatedList);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Database Error', message: err.message });
  }
};
