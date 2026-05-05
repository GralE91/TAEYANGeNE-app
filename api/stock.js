// api/stock.js - 한국투자증권 OpenAPI 실시간 주가 조회
// 종목 중복 제거 + 합산 최적화

// 보유 종목 (5/10 기준) - 같은 종목코드는 자동 합산
const HOLDINGS = {
  근한: [
    { code: "000660", name: "SK하이닉스", shares: 35 },
    { code: "000660", name: "SK하이닉스(2)", shares: 254 },
    { code: "005380", name: "현대차", shares: 142 },
    { code: "005380", name: "현대차(2)", shares: 214 },
    { code: "005385", name: "현대차우", shares: 77 },
    { code: "013700", name: "까뮤이앤씨", shares: 5189 },
    { code: "013700", name: "까뮤이앤씨(2)", shares: 3952 },
    { code: "069500", name: "KODEX200", shares: 211 },
    { code: "267250", name: "HD현대", shares: 281 },
    { code: "457480", name: "ACE테슬라밸류체인액티브", shares: 3078 },
    { code: "457480", name: "ACE테슬라(2)", shares: 922 },
    { code: "475960", name: "토모큐브", shares: 498 },
    { code: "005935", name: "삼성전자우", shares: 1000 },
    { code: "396500", name: "TIGER반도체TOP10", shares: 1062 },
    { code: "196170", name: "알테오젠", shares: 100 },
    { code: "483340", name: "ACE구글밸류체인액티브", shares: 1500 },
    { code: "0180V0", name: "ACE미국우주테크", shares: 1000 },
    { code: "237350", name: "KODEX코스피100", shares: 32 }
  ],
  예진: [
    { code: "267250", name: "HD현대", shares: 130 },
    { code: "005380", name: "현대차", shares: 196 },
    { code: "005380", name: "현대차(2)", shares: 163 },
    { code: "005935", name: "삼성전자우", shares: 570 },
    { code: "0126Z0", name: "삼성에피스홀딩스", shares: 15 },
    { code: "091160", name: "KODEX반도체", shares: 570 },
    { code: "207940", name: "삼성바이오로직스", shares: 94 },
    { code: "237350", name: "KODEX코스피100", shares: 700 },
    { code: "237350", name: "KODEX코스피100(2)", shares: 120 },
    { code: "455890", name: "RISE머니마켓엑티브", shares: 1117 },
    { code: "483340", name: "ACE구글밸류체인액티브", shares: 100 },
    { code: "483340", name: "ACE구글(2)", shares: 500 },
    { code: "457480", name: "ACE테슬라밸류체인액티브", shares: 1280 },
    { code: "457480", name: "ACE테슬라(2)", shares: 1000 },
    { code: "0015B0", name: "Koact미국나스닥성장기업액티브", shares: 300 },
    { code: "035420", name: "NAVER", shares: 10 },
    { code: "005490", name: "POSCO홀딩스", shares: 10 },
    { code: "475050", name: "ACEKPOP포커스", shares: 650 },
    { code: "015760", name: "한국전력", shares: 300 },
    { code: "005930", name: "삼성전자", shares: 60 },
    { code: "102970", name: "KODEX증권", shares: 160 },
    { code: "279570", name: "케이뱅크", shares: 103 },
    { code: "442580", name: "PLUS글로벌HBM반도체", shares: 65 },
    { code: "0180V0", name: "ACE미국우주테크액티브", shares: 60 },
    { code: "068270", name: "셀트리온", shares: 4 }
  ]
};

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(appKey, appSecret, isVirtual) {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const baseUrl = isVirtual
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

  const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`토큰 발급 실패: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
  return cachedToken;
}

async function getStockPrice(code, token, appKey, appSecret, isVirtual) {
  const baseUrl = isVirtual
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443';

  const url = `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${code}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'appkey': appKey,
      'appsecret': appSecret,
      'tr_id': 'FHKST01010100',
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (data.rt_cd !== '0') return null;
  return parseInt(data.output?.stck_prpr || 0);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  try {
    const APP_KEY = process.env.KIS_APP_KEY;
    const APP_SECRET = process.env.KIS_APP_SECRET;
    const IS_VIRTUAL = true;

    if (!APP_KEY || !APP_SECRET) {
      return res.status(500).json({ error: 'KIS_APP_KEY/SECRET 환경변수 없음' });
    }

    const token = await getAccessToken(APP_KEY, APP_SECRET, IS_VIRTUAL);

    // 1단계: 모든 고유 종목코드 추출 → 한번만 조회
    const allStocks = [...HOLDINGS.근한, ...HOLDINGS.예진];
    const uniqueCodes = [...new Set(allStocks.map(s => s.code))];

    // 2단계: 종목별 가격 캐싱 객체
    const priceCache = {};
    const failedCodes = [];

    for (const code of uniqueCodes) {
      try {
        const price = await getStockPrice(code, token, APP_KEY, APP_SECRET, IS_VIRTUAL);
        if (price === null || price === 0) {
          failedCodes.push(code);
          priceCache[code] = 0;
        } else {
          priceCache[code] = price;
        }
        await new Promise(r => setTimeout(r, 60)); // Rate limit
      } catch (e) {
        failedCodes.push(code);
        priceCache[code] = 0;
      }
    }

    // 3단계: 캐싱된 가격으로 합산
    const results = {
      근한: { 종목: [], 합계: 0, 실패: 0 },
      예진: { 종목: [], 합계: 0, 실패: 0 }
    };

    for (const owner of ['근한', '예진']) {
      for (const stock of HOLDINGS[owner]) {
        const price = priceCache[stock.code];
        if (price === 0) {
          results[owner].실패++;
          results[owner].종목.push({ ...stock, price: 0, value: 0, error: '조회실패' });
        } else {
          const value = price * stock.shares;
          results[owner].합계 += value;
          results[owner].종목.push({ ...stock, price, value });
        }
      }
    }

    const 총합 = results.근한.합계 + results.예진.합계;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const 시간 = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    return res.status(200).json({
      근한: results.근한,
      예진: results.예진,
      총합,
      시간,
      isVirtual: IS_VIRTUAL,
      조회종목수: uniqueCodes.length,
      실패종목: failedCodes
    });

  } catch (error) {
    console.error('stock.js 오류:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
