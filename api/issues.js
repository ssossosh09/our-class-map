export default async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vercel 환경 변수 읽기
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      error: 'Environment variables missing',
      detail: 'KV_REST_API_URL 또는 KV_REST_API_TOKEN이 Vercel에 설정되지 않았습니다.'
    });
  }

  const STORAGE_KEY = 'class_world_issues_data';

  // Upstash REST API 호출 헬퍼 함수 (외부 모듈 없이 fetch 사용)
  async function redisCommand(command, ...args) {
    const url = `${redisUrl}/${command}/${args.map(encodeURIComponent).join('/')}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${redisToken}` }
    });
    const result = await response.json();
    return result.result;
  }

  try {
    // 1. 목록 조회 (GET)
    if (req.method === 'GET') {
      const rawData = await redisCommand('get', STORAGE_KEY);
      let data = [];
      if (rawData) {
        data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      }
      return res.status(200).json(data);
    }

    // 2. 새 핀 등록 (POST)
    if (req.method === 'POST') {
      const newIssue = req.body;
      const rawData = await redisCommand('get', STORAGE_KEY);
      let currentList = [];
      if (rawData) {
        currentList = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      }

      const updatedList = [newIssue, ...currentList.filter(item => item.id !== newIssue.id)];
      await redisCommand('set', STORAGE_KEY, JSON.stringify(updatedList));
      return res.status(200).json({ success: true, item: newIssue });
    }

    // 3. 핀 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const rawData = await redisCommand('get', STORAGE_KEY);
      let currentList = [];
      if (rawData) {
        currentList = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      }

      const updatedList = currentList.filter(item => String(item.id) !== String(id));
      await redisCommand('set', STORAGE_KEY, JSON.stringify(updatedList));
      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error', message: error.message });
  }
}
