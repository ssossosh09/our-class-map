import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const STORAGE_KEY = 'class_issues_data';

  try {
    // 1. 데이터 불러오기 (GET)
    if (req.method === 'GET') {
      const data = await kv.get(STORAGE_KEY);
      return res.status(200).json(data || []);
    }

    // 2. 새 핀 추가 (POST)
    if (req.method === 'POST') {
      const newIssue = req.body;
      const currentList = (await kv.get(STORAGE_KEY)) || [];
      const updatedList = [newIssue, ...currentList];
      await kv.set(STORAGE_KEY, updatedList);
      return res.status(200).json({ success: true, item: newIssue });
    }

    // 3. 핀 삭제 (DELETE)
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const currentList = (await kv.get(STORAGE_KEY)) || [];
      const updatedList = currentList.filter(item => String(item.id) !== String(id));
      await kv.set(STORAGE_KEY, updatedList);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
}