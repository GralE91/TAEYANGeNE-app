// api/notion.js - TAEYANGene 자동화 서버 v2
// 노션 DB에서 데이터 읽어서 실시간 반환

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 5분 캐시
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    if (!NOTION_TOKEN) {
      return res.status(500).json({ error: 'NOTION_TOKEN 환경변수 없음' });
    }

    const DB_ID = 'a690c47841a948eb9920307ea905db88';

    const response = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ property: '날짜', direction: 'ascending' }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `노션 API 오류: ${response.status}`, detail: errText });
    }

    const data = await response.json();
    const entries = [];

    for (const page of data.results) {
      const props = page.properties;

      // 스키마에 맞게 정확히 파싱
      const 내용 = props['내용']?.title?.[0]?.plain_text || '';
      const 유형 = props['유형']?.select?.name || '지출';
      const 카테고리 = props['카테고리']?.select?.name || '공동';
      const 금액 = props['금액']?.number || 0;
      const 결제수단 = props['결제수단']?.select?.name || '현금';
      const 주차 = props['주차']?.select?.name || '1주차';
      // 날짜: date 타입 - start 필드
      const 날짜 = props['날짜']?.date?.start || '';
      const 메모 = props['메모']?.rich_text?.[0]?.plain_text || '';
      // 스샷: file 타입
      const ssFiles = props['스샷']?.files || [];
      const ss = ssFiles.length > 0 ? ['notionfile'] : [];
      const url = page.url || '';

      if (!내용) continue;

      entries.push({ 내용, 유형, 카테고리, 금액, 결제수단, 주차, 날짜, 메모, ss, url });
    }

    // 집계
    let 총수입 = 0, 현금지출 = 0, 현금외지출 = 0;
    const 카테고리별 = {
      공동: { 수입: 0, 현금: 0, 현금외: 0 },
      근한: { 수입: 0, 현금: 0, 현금외: 0 },
      예진: { 수입: 0, 현금: 0, 현금외: 0 },
      태양: { 수입: 0, 현금: 0, 현금외: 0 }
    };

    for (const e of entries) {
      const cat = 카테고리별[e.카테고리] || 카테고리별['공동'];
      if (e.유형 === '수입') {
        총수입 += e.금액;
        cat.수입 += e.금액;
      } else if (e.결제수단 === '현금') {
        현금지출 += e.금액;
        cat.현금 += e.금액;
      } else {
        현금외지출 += e.금액;
        cat.현금외 += e.금액;
      }
    }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const 마지막업데이트 = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    return res.status(200).json({
      entries,
      집계: { 총수입, 현금지출, 현금외지출, 순저축: 총수입 - 현금지출, 카테고리별 },
      마지막업데이트,
      count: entries.length
    });

  } catch (error) {
    console.error('notion.js 오류:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
