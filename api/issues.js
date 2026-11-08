import { Redis } from '@upstash/redis';

// KV 또는 UPSTASH 환경 변수를 둘 다 자동 감지하도록 설정
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const STORAGE_KEY = 'class_world_issues_data';

  try {
    // 1. 데이터 조회 (GET)
    if (req.method === 'GET') {
      const data = await redis.get(STORAGE_KEY);
      return res.status(200).json(data || []);
    }

    // 2. 새 핀 추가 (POST)
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
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ error: error.message || 'Server DB Error' });
  }
}