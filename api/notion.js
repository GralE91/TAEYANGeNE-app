// api/notion.js
// Vercel 서버리스 함수 - 노션 API를 안전하게 호출
// 보안키는 Vercel 환경변수에 저장 (코드에 노출 안됨!)

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Anthropic API로 노션 데이터 읽기
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Vercel 환경변수에서 안전하게!
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `노션 수입/지출 DB(collection://2b8580b7-e1e4-4fc8-a1cb-e2489b33d50b)에서 모든 데이터를 읽어 아래 JSON 형식으로만 반환하세요. 다른 텍스트 절대 포함 금지.

{
  "entries": [
    {
      "내용": "string",
      "유형": "수입" | "지출",
      "카테고리": "공동" | "근한" | "예진" | "태양",
      "금액": number,
      "결제수단": "현금" | "현금외(상품권등)",
      "주차": "1주차" | "2주차" | "3주차" | "4주차" | "5주차",
      "날짜": "YYYY-MM-DD",
      "메모": "string"
    }
  ],
  "집계": {
    "총수입": number,
    "현금지출": number,
    "현금외지출": number,
    "순저축": number,
    "카테고리별": {
      "공동": {"수입": number, "현금": number, "현금외": number},
      "근한": {"수입": number, "현금": number, "현금외": number},
      "예진": {"수입": number, "현금": number, "현금외": number},
      "태양": {"수입": number, "현금": number, "현금외": number}
    }
  },
  "마지막업데이트": "YYYY-MM-DD HH:mm"
}`,
        messages: [{
          role: 'user',
          content: '노션 수입/지출 내역 DB 전체 데이터를 JSON으로 반환해주세요.'
        }],
        mcp_servers: [{
          type: 'url',
          url: 'https://mcp.notion.com/mcp',
          name: 'notion-mcp',
          authorization_token: process.env.NOTION_MCP_TOKEN // Vercel 환경변수!
        }]
      })
    });

    const data = await response.json();
    const textBlock = data.content?.find(b => b.type === 'text');
    if (!textBlock) throw new Error('응답 없음');

    const jsonStr = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
