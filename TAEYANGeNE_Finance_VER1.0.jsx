import { useState, useEffect, useCallback } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상수 (App 외부)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CUR_PERIOD = { label:"5월 (4/21~5/20)", cfKey:"2026-05" };

// ━━━ 노션 실시간 데이터 (최종 업데이트: 2026-05-02) ━━━
const NOTION_ENTRIES = [
  { 내용:"4월 급여",                       유형:"수입", 카테고리:"근한", 금액:6_090_240, 결제수단:"현금", 주차:"1주차", 날짜:"2026-04-21" },
  { 내용:"4월 급여",                       유형:"수입", 카테고리:"예진", 금액:4_063_620, 결제수단:"현금", 주차:"1주차", 날짜:"2026-04-21" },
  { 내용:"1주차 생활비 정산",               유형:"지출", 카테고리:"근한", 금액:85_900,   결제수단:"현금", 주차:"1주차", 날짜:"2026-04-26" },
  { 내용:"1주차 생활비 정산",               유형:"지출", 카테고리:"예진", 금액:342_170,  결제수단:"현금", 주차:"1주차", 날짜:"2026-04-26" },
  { 내용:"3월 관리비",                      유형:"지출", 카테고리:"공동", 금액:219_410,  결제수단:"현금", 주차:"1주차", 날짜:"2026-04-25" },
  { 내용:"어버이날용돈(할머니할아부지)",     유형:"지출", 카테고리:"공동", 금액:400_000,  결제수단:"현금", 주차:"2주차", 날짜:"2026-05-02" },
];

// 집계 자동 계산
const NOTION_집계 = (() => {
  const 카별 = {공동:{수입:0,현금:0,현금외:0},근한:{수입:0,현금:0,현금외:0},예진:{수입:0,현금:0,현금외:0},태양:{수입:0,현금:0,현금외:0}};
  let 총수입=0, 현금지출=0, 현금외지출=0;
  NOTION_ENTRIES.forEach(e=>{
    if(e.유형==="수입") { 총수입+=e.금액; 카별[e.카테고리].수입+=e.금액; }
    else if(e.결제수단==="현금") { 현금지출+=e.금액; 카별[e.카테고리].현금+=e.금액; }
    else { 현금외지출+=e.금액; 카별[e.카테고리].현금외+=e.금액; }
  });
  return { 총수입, 현금지출, 현금외지출, 순저축:총수입-현금지출, 카테고리별:카별 };
})();

const PERIOD_DAYS = 30;
const WEEKS_IN_PERIOD = 5;

const BS = {
  근한투자:1_134_390_469, 예진투자:729_228_560,
  근한현금:119_900_378,   예진현금:217_718_460,
  근한퇴직:110_496_306,   예진퇴직:93_908_995,
};
const 총투자 = BS.근한투자 + BS.예진투자;
const 총현금 = BS.근한현금 + BS.예진현금;
const 총퇴직 = BS.근한퇴직 + BS.예진퇴직;
const 투현합 = 총투자 + 총현금;
const 투현퇴 = 투현합 + 총퇴직;

const DEAL = {
  신용대출:198_000_000, 주담대:200_000_000, 은행대출:150_000_000,
  중도금1:600_000_000, 중도금2:600_000_000, 중도금3:600_000_000,
  이율:0.045,
};
const 대출합 = DEAL.신용대출 + DEAL.주담대 + DEAL.은행대출;
const 월이자1 = DEAL.중도금1 * DEAL.이율 / 12;
const 월이자2 = DEAL.중도금2 * DEAL.이율 / 12;
const 총이자A = 월이자1 * 12 + 월이자2 * 8;

const CF_PLAN = {
  "2026-05":{ 수입:11_463_959, 지출:5_600_000 },
  "2026-06":{ 수입:17_290_121, 지출:4_750_000 },
  "2026-07":{ 수입:10_367_619, 지출:4_000_000 },
  "2026-08":{ 수입: 9_403_959, 지출:4_000_000 },
  "2026-09":{ 수입:11_743_113, 지출:5_600_000 },
  "2026-10":{ 수입:10_087_113, 지출:4_000_000 },
  "2026-11":{ 수입: 8_703_113, 지출:4_000_000 },
  "2026-12":{ 수입: 7_484_778, 지출:4_000_000 },
  "2027-01":{ 수입: 9_699_701, 지출:4_000_000 },
  "2027-02":{ 수입: 9_305_201, 지출:5_600_000 },
  "2027-03":{ 수입: 8_002_081, 지출:4_000_000 },
  "2027-04":{ 수입: 7_883_181, 지출:4_000_000 },
  "2027-05":{ 수입:10_087_797, 지출:5_600_000 },
  "2027-06":{ 수입: 6_965_528, 지출:4_000_000 },
  "2027-07":{ 수입: 6_865_676, 지출:4_000_000 },
  "2027-08":{ 수입: 8_282_197, 지출:5_600_000 },
  "2027-09":{ 수입: 8_737_700, 지출:4_000_000 },
  "2027-10":{ 수입: 6_982_340, 지출:4_000_000 },
  "2027-11":{ 수입: 5_515_300, 지출:4_000_000 },
  "2027-12":{ 수입: 4_753_865, 지출:4_000_000 },
};

const 이자CF = (k) => {
  if (k==="2026-12") return 월이자1;
  if (["2027-01","2027-02","2027-03"].includes(k)) return 월이자1;
  if (["2027-04","2027-05","2027-06","2027-07","2027-08","2027-09","2027-10","2027-11"].includes(k)) return 월이자1+월이자2;
  return 0;
};

// 반디클 추가비용
const 취득세 = 3_000_000_000 * 0.033;  // 30억 × 3.3% = 9,900만
const 발코니 = 120_000_000;             // 1.2억

// 잔금 자납액 계산
const 잔금자납A = 600_000_000 + 취득세 + 발코니 + 1_200_000_000 - DEAL.주담대 - DEAL.은행대출;
const 잔금자납B = 600_000_000 + 취득세 + 발코니 - DEAL.주담대 - DEAL.은행대출;

// ━━━ 반디클 총 필요현금 목표 (대출 실행 후 기준) ━━━
// Case B: 계약금자납 + 중도금1~3 + 잔금+취득세+발코니 - 잔금대출
const 목표B총 = (600_000_000 - DEAL.신용대출) + 600_000_000*3 + 잔금자납B; // 26.71억
// Case A: 계약금자납 + 중도금3자납 + 이자 + 잔금+취득세+발코니+중도금상환 - 잔금대출
const 목표A총 = (600_000_000 - DEAL.신용대출) + 600_000_000 + 총이자A + 잔금자납A; // 27.16억

const PAYMENTS = {
  A:[
    {date:"2026-10", label:"계약금 자납", amt:600_000_000-DEAL.신용대출, color:"#4f9cf9", note:"신용대출 1.98억 차감"},
    {date:"2026-12", label:"중도금1 집단대출", amt:0, color:"#5eead4", note:"현금 무소요"},
    {date:"2027-04", label:"중도금2 집단대출", amt:0, color:"#5eead4", note:"현금 무소요"},
    {date:"2027-08", label:"중도금3 자납", amt:600_000_000, color:"#fb923c"},
    {date:"2027-12", label:"잔금+중도금상환", amt:잔금자납A, color:"#34d399",
     note:`잔금6억+취득세${Math.round(취득세/1e6)}백만+발코니1.2억+중도금상환12억-주담대-은행대출`},
  ],
  B:[
    {date:"2026-10", label:"계약금 자납", amt:600_000_000-DEAL.신용대출, color:"#4f9cf9", note:"신용대출 1.98억 차감"},
    {date:"2026-12", label:"중도금1 자납", amt:600_000_000, color:"#5eead4"},
    {date:"2027-04", label:"중도금2 자납", amt:600_000_000, color:"#5eead4"},
    {date:"2027-08", label:"중도금3 자납", amt:600_000_000, color:"#fb923c"},
    {date:"2027-12", label:"잔금", amt:잔금자납B, color:"#34d399",
     note:`잔금6억+취득세${Math.round(취득세/1e6)}백만+발코니1.2억-주담대-은행대출`},
  ],
};

const WEEKLY_RAW = [
  {d:"1/11",v:1_652_883_707},{d:"1/18",v:1_735_581_674},{d:"1/25",v:1_822_694_341},
  {d:"2/1", v:1_917_614_490},{d:"2/8", v:1_846_384_970},{d:"2/15",v:1_932_990_044},
  {d:"2/22",v:2_013_131_738},{d:"3/1", v:2_198_077_082},{d:"3/8", v:1_968_913_657},
  {d:"3/15",v:1_948_838_716},{d:"3/22",v:2_013_109_990},{d:"3/29",v:1_928_895_013},
  {d:"4/5", v:1_868_519_053},{d:"4/12",v:1_982_616_448},{d:"4/19",v:2_099_760_327},
  {d:"4/26",v:2_149_811_032},{d:"5/3", v:2_201_237_867},
];
const WEEKLY = WEEKLY_RAW.map(d=>({
  d:d.d, 투현:d.v/1e8, 투현퇴:(d.v+총퇴직)/1e8, 최대:(d.v+총퇴직+대출합)/1e8,
}));

const CATS = ["공동","근한","예진","태양"];
const CAT_COLOR = {공동:"#4f9cf9", 근한:"#34d399", 예진:"#c084fc", 태양:"#fbbf24"};
const CAT_EMOJI = {공동:"🏠", 근한:"👨", 예진:"👩", 태양:"☀️"};
const PAY_TYPES = ["현금","현금외(상품권등)"];
const WEEKS = [
  {label:"1주차", start:"04/21", end:"04/27"},
  {label:"2주차", start:"04/28", end:"05/04"},
  {label:"3주차", start:"05/05", end:"05/11"},
  {label:"4주차", start:"05/12", end:"05/18"},
  {label:"5주차", start:"05/19", end:"05/20"},
];

const C = {
  bg:"#060c18", card:"#0d1929", border:"#1a3050",
  blue:"#4f9cf9", green:"#34d399", yellow:"#fbbf24",
  red:"#f87171", purple:"#c084fc", teal:"#5eead4",
  orange:"#fb923c", gray:"#64748b", text:"#f1f5f9", dim:"#4a6080",
  blue2:"#1e3a5f",
};

const fmt = (n,d=2) => {
  if (n==null||isNaN(n)) return "-";
  const s=n<0, a=Math.abs(n);
  if(a>=1e8) return `${s?"-":""}${(a/1e8).toFixed(d)}억`;
  if(a>=1e4) return `${s?"-":""}${Math.round(a/1e4).toLocaleString()}만`;
  return `${s?"-":""}${Math.round(a).toLocaleString()}원`;
};
const fmtW = n => `${Number(Math.round(Math.abs(n))).toLocaleString("ko-KR")}원`;
const pct = n => `${(n*100).toFixed(1)}%`;
const addComma = str => {
  const raw=String(str).replace(/[^0-9]/g,"");
  return raw ? Number(raw).toLocaleString("ko-KR") : "";
};
const parseComma = str => parseFloat(String(str).replace(/,/g,""))||0;

// ━━━ 시뮬 ━━━
// 대출(신용+주담+은행)은 잔금 시점(2027-12)에만 실행
// 그 전까지는 투자자산 매도 + 현금으로 충당
function simCashflow(rate, caseType) {
  const mr=rate/12;
  let 투자=총투자, 현금=총현금;
  const log=[];
  for (const key of Object.keys(CF_PLAN).sort()) {
    const {수입,지출}=CF_PLAN[key];
    const 이자=caseType==="A"?이자CF(key):0;
    투자=투자*(1+mr);
    현금+=수입-지출-이자;
    const payment=PAYMENTS[caseType].find(p=>p.date===key);
    let 투자매도=0;
    if(payment&&payment.amt>0) {
      if(key==="2027-12") {
        현금+=DEAL.신용대출+DEAL.주담대+DEAL.은행대출;
      }
      현금-=payment.amt;
      if(현금<0) {
        투자매도=Math.abs(현금);
        투자=Math.max(0,투자-투자매도);
        현금=0;
      }
    }
    log.push({key,투자,현금,총:투자+현금,payment,수입,지출,이자,투자매도});
  }
  return log;
}

function calcLimit(실제현금지출, rate, caseType) {
  const {지출:계획지출,수입:계획수입}=CF_PLAN["2026-05"];
  const 계획저축=계획수입-계획지출;
  const logPlan=simCashflow(rate,caseType);
  const 현금_계약금후=logPlan.find(l=>l.key==="2026-10")?.현금||0;
  const 계획초과=실제현금지출-계획지출; // 현금외 제외한 실제 현금 지출만 비교
  const 예상_10월현금=현금_계약금후-계획초과;
  return {
    계획지출,계획수입,계획저축,
    계획초과,현금_계약금후,예상_10월현금,
    ok:예상_10월현금>=0,
    주간계획지출:계획지출/WEEKS_IN_PERIOD,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI 컴포넌트 — App 완전 외부
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Card = ({children,style={}}) => (
  <div style={{background:C.card,borderRadius:18,padding:"16px",border:`1px solid ${C.border}`,marginBottom:12,...style}}>
    {children}
  </div>
);
const Lbl = ({c=C.gray,children}) => (
  <div style={{fontSize:11,color:c,fontWeight:600,letterSpacing:"0.3px",marginBottom:8}}>{children}</div>
);

// 주간 차트
const WeeklyChart = () => {
  const W=340,H=230,PL=30,PR=34,PT=16,PB=24;
  const IW=W-PL-PR,IH=H-PT-PB,n=WEEKLY.length;
  const 목표A억=1_949_000_000/1e8,목표B억=3_149_000_000/1e8;
  const allV=WEEKLY.flatMap(d=>[d.투현,d.투현퇴,d.최대]);
  const minV=Math.floor(Math.min(...allV)-1);
  const maxV=Math.ceil(Math.max(...allV,목표A억,목표B억)+1);
  const X=i=>PL+(i/(n-1))*IW;
  const Y=v=>PT+IH-((v-minV)/(maxV-minV))*IH;
  const path=key=>WEEKLY.map((d,i)=>`${i===0?"M":"L"}${X(i).toFixed(1)},${Y(d[key]).toFixed(1)}`).join(" ");
  const ticks=[];
  const step=Math.ceil((maxV-minV)/6);
  for(let v=Math.ceil(minV);v<=maxV;v+=step) ticks.push(v);
  const last=WEEKLY[n-1];
  return (
    <svg width={W} height={H} style={{overflow:"visible",display:"block",margin:"0 auto"}}>
      {ticks.map(v=>(
        <g key={v}>
          <line x1={PL} y1={Y(v)} x2={PL+IW} y2={Y(v)} stroke={C.border} strokeWidth={0.5} strokeDasharray="3,5"/>
          <text x={PL-5} y={Y(v)+4} fill={C.dim} fontSize={8} textAnchor="end">{v}억</text>
        </g>
      ))}
      <line x1={PL} y1={Y(목표A억)} x2={PL+IW} y2={Y(목표A억)} stroke={C.green} strokeWidth={1.5} strokeDasharray="7,4" opacity={0.9}/>
      <text x={PL+IW+4} y={Y(목표A억)+4} fill={C.green} fontSize={9} fontWeight={700}>A</text>
      <line x1={PL} y1={Y(목표B억)} x2={PL+IW} y2={Y(목표B억)} stroke={C.orange} strokeWidth={1.5} strokeDasharray="7,4" opacity={0.9}/>
      <text x={PL+IW+4} y={Y(목표B억)+4} fill={C.orange} fontSize={9} fontWeight={700}>B</text>
      <path d={`${path("투현")} L${X(n-1)},${PT+IH} L${X(0)},${PT+IH} Z`} fill={C.blue} opacity={0.06}/>
      <path d={path("최대")} fill="none" stroke={C.purple} strokeWidth={1.8} strokeDasharray="5,4" opacity={0.8}/>
      <path d={path("투현퇴")} fill="none" stroke={C.teal} strokeWidth={2.2}/>
      <path d={path("투현")} fill="none" stroke={C.blue} strokeWidth={3}/>
      <circle cx={X(n-1)} cy={Y(last.투현)} r={5} fill={C.blue} stroke={C.card} strokeWidth={2}/>
      <circle cx={X(n-1)} cy={Y(last.투현퇴)} r={4} fill={C.teal} stroke={C.card} strokeWidth={2}/>
      <circle cx={X(n-1)} cy={Y(last.최대)} r={4} fill={C.purple} stroke={C.card} strokeWidth={2}/>
      <text x={X(n-1)-6} y={Y(last.투현)-10} fill={C.blue} fontSize={10} fontWeight={800} textAnchor="end">{last.투현.toFixed(2)}억</text>
      <text x={X(n-1)-6} y={Y(last.투현퇴)-10} fill={C.teal} fontSize={9} textAnchor="end">{last.투현퇴.toFixed(2)}억</text>
      <text x={X(n-1)-6} y={Y(last.최대)+18} fill={C.purple} fontSize={9} textAnchor="end">{last.최대.toFixed(2)}억</text>
      {WEEKLY.filter((_,i)=>i%4===0||i===n-1).map(d=>{
        const i=WEEKLY.indexOf(d);
        return <text key={d.d} x={X(i)} y={H} fill={C.dim} fontSize={8} textAnchor="middle">{d.d}</text>;
      })}
    </svg>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 앱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [tab, setTab] = useState("home");
  const [rate, setRate] = useState(0.12);
  const [caseType, setCaseType] = useState("A");
  const [entries, setEntries] = useState({});
  const [loaded, setLoaded] = useState(false);

  // 수입/지출 입력 폼
  const [형태, set형태] = useState("지출");
  const [입력주차, set입력주차] = useState("2주차");
  const [입력카테고리, set입력카테고리] = useState("공동");
  const [입력금액, set입력금액] = useState("");
  const [입력결제, set입력결제] = useState("현금");
  const [입력메모, set입력메모] = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        // 구버전 데이터 자동 삭제 (노션으로 이전)
        await window.storage.delete("v9_entries");
        await window.storage.delete("v10_entries");
        await window.storage.delete("v9_cfactual");
      } catch(_){}
      setLoaded(true);
    })();
  },[]);

  const save=useCallback(async(k,d)=>{
    try{ await window.storage.set(k,JSON.stringify(d)); }catch(_){}
  },[]);

  const addEntry=useCallback(()=>{
    const amt=parseComma(입력금액);
    if(!amt||amt<=0) return;
    const item={type:형태,cat:입력카테고리,amt,payType:입력결제,memo:입력메모,ts:Date.now()};
    setEntries(prev=>{
      const next={...prev,[입력주차]:[...(prev[입력주차]||[]),item]};
      save("v10_entries",next);
      return next;
    });
    set입력금액(""); set입력메모("");
  },[입력금액,형태,입력카테고리,입력결제,입력메모,입력주차,save]);

  const delEntry=useCallback((week,idx)=>{
    setEntries(prev=>{
      const next={...prev,[week]:prev[week].filter((_,i)=>i!==idx)};
      save("v10_entries",next);
      return next;
    });
  },[save]);

  // ━━━ 노션 실시간 데이터로 집계 ━━━
  const 이달수입합 = NOTION_집계.총수입;
  const 이달현금지출합 = NOTION_집계.현금지출;
  const 이달현금외합 = NOTION_집계.현금외지출;
  const 이달지출합 = 이달현금지출합;
  const 카별지출 = Object.fromEntries(
    Object.entries(NOTION_집계.카테고리별).map(([k,v])=>[k,{현금:v.현금,현금외:v.현금외}])
  );
  const 카별수입 = Object.fromEntries(
    Object.entries(NOTION_집계.카테고리별).map(([k,v])=>[k,v.수입])
  );
  const 실제수입 = NOTION_집계.총수입;
  const 실제지출 = NOTION_집계.현금지출 + NOTION_집계.현금외지출;
  const 실제저축 = NOTION_집계.순저축;
  const {계획수입,계획지출,계획저축,계획초과,현금_계약금후,예상_10월현금,ok,주간계획지출} = calcLimit(이달현금지출합,rate,caseType);

  const simLog=simCashflow(rate,caseType);

  const inputStyle={
    width:"100%",background:C.bg,border:`1px solid ${C.border}`,
    borderRadius:10,color:C.text,padding:"12px",fontSize:16,
    fontWeight:700,marginBottom:8,boxSizing:"border-box",outline:"none",
  };

  const TABS=[
    {id:"home",    icon:"🏠", label:"홈"},
    {id:"limit",   icon:"🎯", label:"한계소비"},
    {id:"cf",      icon:"💸", label:"CF분석"},
    {id:"timeline",icon:"📅", label:"납부일정"},
    {id:"guide",   icon:"📱", label:"입력안내"},
  ];

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.text,fontSize:16}}>
      ☀️ 로딩 중...
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Noto Sans KR',sans-serif",color:C.text,paddingBottom:74}}>

      {/* 헤더 */}
      <div style={{background:"linear-gradient(135deg,#090f1e,#0f1e38)",borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontSize:17,fontWeight:900,letterSpacing:"-0.5px"}}>☀️ 태양이네 보금자리</div>
          <div style={{fontSize:10,color:C.dim}}>5/3 · {CUR_PERIOD.label}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:C.dim}}>투자+현금</div>
          <div style={{fontSize:20,fontWeight:900,color:C.blue,letterSpacing:"-1px"}}>{fmt(투현합)}</div>
        </div>
      </div>

      <div style={{padding:"14px",maxWidth:460,margin:"0 auto"}}>

        {/* ━━━ 홈 ━━━ */}
        {tab==="home" && <>
          <Card>
            <Lbl>📊 자산 현황 · 5/3</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {l:"투자+현금",v:투현합,c:C.blue,s:`투자 ${fmt(총투자,1)}\n현금 ${fmt(총현금,1)}`},
                {l:"+퇴직연금",v:투현퇴,c:C.teal,s:`근한 ${fmt(BS.근한퇴직,1)}\n예진 ${fmt(BS.예진퇴직,1)}`},
                {l:"+가능대출",v:투현퇴+대출합,c:C.purple,s:`신용+주담\n+은행`},
              ].map(x=>(
                <div key={x.l} style={{background:C.bg,borderRadius:12,padding:"11px 10px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.dim,marginBottom:5,fontWeight:600}}>{x.l}</div>
                  <div style={{fontSize:15,fontWeight:900,color:x.c}}>{fmt(x.v,1)}</div>
                  <div style={{fontSize:9,color:C.dim,marginTop:4,lineHeight:1.7,whiteSpace:"pre-line"}}>{x.s}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Lbl>🎯 목표 달성률</Lbl>
            <div style={{fontSize:10,color:C.dim,marginBottom:8}}>
              총 필요현금 기준 · A={fmt(목표A총,1)} / B={fmt(목표B총,1)}
            </div>
            {[
              {l:"계약금 자납 4.02억",t:600_000_000-DEAL.신용대출,c:C.green,done:true},
              {l:`Case A 총 ${fmt(목표A총,1)}`,t:목표A총,c:C.blue,done:투현합>=목표A총},
              {l:`Case B 총 ${fmt(목표B총,1)}`,t:목표B총,c:C.orange,done:투현합>=목표B총},
            ].map(g=>{
              const p=Math.min(1,투현합/g.t);
              return (
                <div key={g.l} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                    <span style={{fontSize:12,color:C.dim}}>
                      {g.l}
                      {g.done&&<span style={{marginLeft:6,fontSize:10,background:"#064e3b",color:C.green,padding:"1px 7px",borderRadius:20}}>✅</span>}
                    </span>
                    <span style={{fontSize:12,fontWeight:700,color:g.c}}>{pct(p)}</span>
                  </div>
                  <div style={{height:8,borderRadius:6,background:C.bg,overflow:"hidden",border:`1px solid ${C.border}`}}>
                    <div style={{height:"100%",width:`${p*100}%`,background:g.c,borderRadius:6,transition:"width 0.8s"}}/>
                  </div>
                  <div style={{fontSize:10,color:C.dim,marginTop:3,textAlign:"right"}}>
                    현재 {fmt(투현합,1)} / 목표 {fmt(g.t,1)}
                  </div>
                </div>
              );
            })}
          </Card>

          <Card style={{padding:"18px 10px 14px"}}>
            <Lbl>📈 주간 자산 추이</Lbl>
            <WeeklyChart/>
            <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap",justifyContent:"center"}}>
              {[{c:C.blue,l:"투자+현금",thick:true},{c:C.teal,l:"+퇴직"},{c:C.purple,l:"+대출",dash:true},{c:C.green,l:"목표A",dash:true},{c:C.orange,l:"목표B",dash:true}].map(x=>(
                <div key={x.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.dim}}>
                  <svg width={18} height={8}><line x1={0} y1={4} x2={18} y2={4} stroke={x.c} strokeWidth={x.thick?3:2} strokeDasharray={x.dash?"6,3":"none"}/></svg>
                  {x.l}
                </div>
              ))}
            </div>
          </Card>

          {/* 이번달 수입/지출 요약 */}
          <Card>
            <Lbl>💸 {CUR_PERIOD.label} 수입/지출</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"수입",v:실제수입,plan:계획수입,c:C.green},
                {l:"현금지출",v:이달현금지출합,plan:계획지출,c:C.red},
                {l:"저축",v:실제수입-이달현금지출합,plan:계획저축,c:C.blue},
              ].map(x=>{
                const diff=x.l==="현금지출"?x.v-x.plan:x.v-x.plan;
                const dc=x.l==="현금지출"?(diff>0?C.red:C.green):(diff>=0?C.green:C.red);
                return (
                  <div key={x.l} style={{background:C.bg,borderRadius:12,padding:"11px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,color:C.dim,marginBottom:4}}>{x.l}</div>
                    <div style={{fontSize:15,fontWeight:900,color:x.c}}>{fmt(x.v,0)}</div>
                    <div style={{fontSize:9,color:C.dim,marginTop:2}}>계획 {fmt(x.plan,0)}</div>
                    <div style={{fontSize:9,color:dc,marginTop:1,fontWeight:700}}>
                      {diff===0?"±0":(diff>0?"+":"")+fmt(diff,0)}
                    </div>
                  </div>
                );
              })}
            </div>
            {이달현금외합>0&&(
              <div style={{background:"#0f1a0a",borderRadius:8,padding:"8px 12px",fontSize:11,color:C.teal,marginBottom:10}}>
                🎁 현금외(상품권 등) 사용: <strong>{fmtW(이달현금외합)}</strong> — 지출 집계 제외
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {CATS.map(c=>{
                const 현금=카별지출[c].현금, 현금외=카별지출[c].현금외, 수입=카별수입[c];
                return (
                  <div key={c} style={{background:C.bg,borderRadius:10,padding:"10px",border:`1px solid ${CAT_COLOR[c]}33`}}>
                    <div style={{fontSize:12,fontWeight:700,color:CAT_COLOR[c],marginBottom:4}}>{CAT_EMOJI[c]} {c}</div>
                    {수입>0&&<div style={{fontSize:11,color:C.green}}>+{fmt(수입,0)} 수입</div>}
                    {현금>0&&<div style={{fontSize:11,color:C.red}}>-{fmt(현금,0)} 현금</div>}
                    {현금외>0&&<div style={{fontSize:11,color:C.teal}}>-{fmt(현금외,0)} 상품권</div>}
                    {!수입&&!현금&&!현금외&&<div style={{fontSize:11,color:C.dim}}>미입력</div>}
                  </div>
                );
              })}
            </div>

            {/* 노션 전체 내역 */}
            <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <div style={{fontSize:11,color:C.dim,marginBottom:8,fontWeight:600}}>
                📋 전체 내역 ({NOTION_ENTRIES.length}건) · 최종 업데이트: 2026-05-02
              </div>
              {NOTION_ENTRIES.map((e,i)=>{
                const CAT_COLOR = {공동:C.blue,근한:C.green,예진:C.purple,태양:C.yellow};
                const CAT_EMOJI = {공동:"🏠",근한:"👨",예진:"👩",태양:"☀️"};
                return (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}33`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16}}>{CAT_EMOJI[e.카테고리]}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:CAT_COLOR[e.카테고리]}}>{e.내용}</div>
                        <div style={{fontSize:10,color:C.dim}}>{e.주차} · {e.날짜}</div>
                      </div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:e.유형==="수입"?C.green:e.결제수단==="현금"?C.red:C.teal}}>
                      {e.유형==="수입"?"+":"-"}{fmt(e.금액,0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>}

        {/* ━━━ 수입/지출 ━━━ */}
        {tab==="guide" && <>
          <Card style={{border:`1px solid ${C.blue}44`,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>📱</div>
            <div style={{fontSize:16,fontWeight:900,color:C.blue,marginBottom:8}}>노션에서 입력하세요!</div>
            <div style={{fontSize:13,color:C.dim,lineHeight:1.9,marginBottom:16}}>
              수입/지출 입력은 <strong style={{color:C.text}}>노션</strong>에서<br/>
              핸폰·노트북 어디서나 바로 기록할 수 있어요 😊<br/>
              입력한 데이터는 주간결산 시 Claude가<br/>
              읽어서 여기 대시보드에 반영해드려요!
            </div>

            {/* 노션 바로가기 버튼 */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {/* 입력 버튼 2개 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <a href="https://app.notion.com/p/a690c47841a948eb9920307ea905db88"
                  target="_blank" rel="noopener noreferrer"
                  style={{display:"block",background:C.green,borderRadius:12,padding:"14px 8px",
                    color:"#fff",fontWeight:800,fontSize:15,textDecoration:"none",textAlign:"center"}}>
                  💰<br/><span style={{fontSize:12}}>수입 입력</span>
                </a>
                <a href="https://app.notion.com/p/a690c47841a948eb9920307ea905db88"
                  target="_blank" rel="noopener noreferrer"
                  style={{display:"block",background:C.red,borderRadius:12,padding:"14px 8px",
                    color:"#fff",fontWeight:800,fontSize:15,textDecoration:"none",textAlign:"center"}}>
                  💸<br/><span style={{fontSize:12}}>지출 입력</span>
                </a>
              </div>
              {/* 내역 보기 버튼 */}
              <a href="https://app.notion.com/p/a690c47841a948eb9920307ea905db88"
                target="_blank" rel="noopener noreferrer"
                style={{display:"block",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",
                  color:C.dim,fontWeight:600,fontSize:12,textDecoration:"none",textAlign:"center"}}>
                📋 전체 내역 보기
              </a>
              <div style={{fontSize:10,color:C.dim,textAlign:"center",marginTop:2}}>
                💡 수입 폼: 카테고리+금액+메모 / 지출 폼: +결제수단 추가
              </div>
            </div>
            <div style={{background:C.bg,borderRadius:12,padding:"14px",textAlign:"left",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.dim,marginBottom:10}}>📲 노션 앱 접속 방법</div>
              {[
                {step:"1", desc:"노션 앱 열기"},
                {step:"2", desc:"☀️ 태양이네 보금자리 재무관리 페이지 찾기"},
                {step:"3", desc:"💸 수입/지출 내역 DB 클릭"},
                {step:"4", desc:"✏️ 수입/지출 입력 탭 선택"},
                {step:"5", desc:"폼 작성 후 제출!"},
              ].map(x=>(
                <div key={x.step} style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.blue2,color:C.blue,fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{x.step}</div>
                  <div style={{fontSize:12,color:C.text}}>{x.desc}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.bg,borderRadius:12,padding:"14px",textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.dim,marginBottom:10}}>📋 노션 뷰 안내</div>
              {[
                {icon:"✏️", name:"수입/지출 입력", desc:"새 항목 입력 폼"},
                {icon:"👨👩☀️🏠", name:"카테고리별", desc:"공동/근한/예진/태양 보드뷰"},
                {icon:"📅", name:"주차별 내역", desc:"1~5주차 보드뷰"},
                {icon:"💰", name:"수입만", desc:"수입 내역 리스트"},
                {icon:"💸", name:"지출만", desc:"지출 내역 리스트"},
              ].map(x=>(
                <div key={x.name} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}33`}}>
                  <span style={{fontSize:12,color:C.text}}>{x.icon} {x.name}</span>
                  <span style={{fontSize:11,color:C.dim}}>{x.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{background:"#0a1020",border:`1px solid ${C.purple}33`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:10}}>💬 주간결산 방법</div>
            <div style={{fontSize:12,color:C.dim,lineHeight:2}}>
              매주 Claude 대화창에서<br/>
              <strong style={{color:C.text}}>"이번주 노션 결산 반영해줘"</strong> 라고 하면<br/>
              노션 데이터 읽어서 CF분석에 자동 반영!
            </div>
          </Card>


        </>}
        {tab==="limit" && <>
          {/* Case / 수익률 */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["A","B"].map(c=>(
              <button key={c} onClick={()=>setCaseType(c)} style={{
                flex:1,padding:"9px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:caseType===c?700:400,
                background:caseType===c?(c==="A"?C.blue2:"#2a1200"):C.card,
                border:`1px solid ${caseType===c?(c==="A"?C.blue:C.orange):C.border}`,
                color:caseType===c?(c==="A"?C.blue:C.orange):C.dim,
              }}>Case {c} {c==="A"?"(중도금대출)":"(전액자납)"}</button>
            ))}
          </div>

          {/* 수익률 선택 */}
          <Card>
            <Lbl>📈 투자 기대 수익률 (연)</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
              {[0.05,0.08,0.12,0.15].map(r=>(
                <button key={r} onClick={()=>setRate(r)} style={{
                  background:Math.abs(r-rate)<0.001?C.blue2:C.bg,
                  border:`1px solid ${Math.abs(r-rate)<0.001?C.blue:C.border}`,
                  borderRadius:10,padding:"9px 4px",cursor:"pointer",
                  color:Math.abs(r-rate)<0.001?C.blue:C.dim,
                  fontWeight:Math.abs(r-rate)<0.001?800:400,fontSize:12,
                }}>{pct(r)}</button>
              ))}
            </div>
          </Card>

          {/* 스토리라인 카드 */}
          <Card style={{border:`1px solid ${ok?C.green:C.red}33`}}>

            {/* STEP 1: 이번달 계획 */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.dim,marginBottom:10}}>
                📋 STEP 1. 이번달 계획 ({CUR_PERIOD.label})
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                  {[
                    {l:"계획 수입",v:fmt(계획수입,0),c:C.green},
                    {l:"계획 지출",v:fmt(계획지출,0),c:C.red},
                    {l:"계획 저축",v:fmt(계획저축,0),c:C.blue},
                  ].map(x=>(
                    <div key={x.l} style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.dim,marginBottom:3}}>{x.l}</div>
                      <div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:11,color:C.dim,textAlign:"center",marginTop:4}}>
                  계획대로라면 이번달 저축 목표: <strong style={{color:C.blue}}>{fmt(계획저축,0)}원</strong>
                </div>
              </div>
            </div>

            {/* STEP 2: 실제 현황 */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.dim,marginBottom:10}}>
                📊 STEP 2. 현재까지 실제 현황
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:"12px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {[
                    {l:"실제 수입",v:fmt(실제수입,0),c:C.green,sub:`계획 ${fmt(계획수입,0)}`},
                    {l:"실제 현금지출",v:fmt(이달현금지출합,0),c:계획초과>0?C.red:C.green,
                     sub:계획초과>0?`계획보다 ${fmt(계획초과,0)} 초과`:`계획보다 ${fmt(-계획초과,0)} 절약`},
                  ].map(x=>(
                    <div key={x.l} style={{background:C.card,borderRadius:8,padding:"10px",textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.dim,marginBottom:3}}>{x.l}</div>
                      <div style={{fontSize:15,fontWeight:900,color:x.c}}>{x.v}</div>
                      <div style={{fontSize:9,color:C.dim,marginTop:2}}>{x.sub}</div>
                    </div>
                  ))}
                </div>
                {이달현금외합>0&&(
                  <div style={{fontSize:10,color:C.teal,textAlign:"center"}}>
                    🎁 상품권 사용 {fmt(이달현금외합,0)} 별도 (현금 지출 아님)
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: CF 계획대로 가면 잔금 시뮬 */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.dim,marginBottom:10}}>
                🏠 STEP 3. 계획대로 저축하면 잔금 치를 수 있나?
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:"12px"}}>
                {simLog.filter(l=>l.payment&&l.payment.amt>0).map(l=>{
                  const ok2=l.현금>=0;
                  return (
                    <div key={l.key} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}33`,alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700}}>{l.key}</div>
                        <div style={{fontSize:10,color:C.dim}}>{l.payment.label} {l.payment.amt>0?`${fmt(l.payment.amt,0)}`:""}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:900,color:ok2?C.green:C.red}}>
                          {ok2?"+":""}{fmt(l.현금,0)}
                        </div>
                        <div style={{fontSize:9,color:C.dim}}>{ok2?"✅ 여유":"❌ 부족"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 4: 이번달 한계소비 결론 */}
            <div>
              <div style={{fontSize:12,fontWeight:800,color:C.dim,marginBottom:10}}>
                🎯 STEP 4. 이번달 한계소비 결론
              </div>
              <div style={{background:ok?"#060f0a":"#120606",borderRadius:12,padding:"16px",border:`1px solid ${ok?C.green:C.red}44`}}>
                <div style={{fontSize:15,fontWeight:900,color:ok?C.green:C.red,marginBottom:10}}>
                  {ok?"✅ 계획 페이스 유지 중":"⚠️ 지출 조정이 필요해요"}
                </div>

                {/* 이번달 한계소비 */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:C.bg,borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.dim,marginBottom:4}}>이번달 계획 지출</div>
                    <div style={{fontSize:20,fontWeight:900,color:C.text}}>{fmt(계획지출,0)}</div>
                    <div style={{fontSize:10,color:C.dim,marginTop:3}}>이 안에서 쓰면 OK</div>
                  </div>
                  <div style={{background:C.bg,borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.dim,marginBottom:4}}>주간 가이드</div>
                    <div style={{fontSize:20,fontWeight:900,color:C.blue}}>{fmt(주간계획지출,0)}</div>
                    <div style={{fontSize:10,color:C.dim,marginTop:3}}>주당 이 정도면 돼요</div>
                  </div>
                </div>

                {/* 현재 초과 여부에 따른 메시지 */}
                {계획초과>0?(
                  <div style={{background:"#1a0808",borderRadius:8,padding:"10px 12px",fontSize:12,color:C.red,lineHeight:1.8}}>
                    현재 계획보다 <strong>{fmt(계획초과,0)}원</strong> 더 썼어요<br/>
                    → 10월 계약금 납부 시 <strong>{fmt(-예상_10월현금,0)}원</strong> 부족 예상<br/>
                    → 남은 기간 주당 <strong>{fmt(계획초과/4,0)}원</strong>씩 줄여야 해요
                  </div>
                ):(
                  <div style={{background:"#061208",borderRadius:8,padding:"10px 12px",fontSize:12,color:C.green,lineHeight:1.8}}>
                    {계획초과<0?(
                      <>현재 계획보다 <strong>{fmt(-계획초과,0)}원</strong> 절약 중이에요 👍<br/>
                      → 10월 계약금 납부 시 <strong>{fmt(예상_10월현금,0)}원</strong> 여유 예상</>
                    ):"계획 딱 맞게 쓰고 있어요 👍"}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>}

        {/* ━━━ CF 분석 [수정3: 자동 결산] ━━━ */}
        {tab==="cf" && <>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["A","B"].map(c=>(
              <button key={c} onClick={()=>setCaseType(c)} style={{
                flex:1,padding:"8px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:caseType===c?700:400,
                background:caseType===c?(c==="A"?C.blue2:"#2a1200"):C.card,
                border:`1px solid ${caseType===c?(c==="A"?C.blue:C.orange):C.border}`,
                color:caseType===c?(c==="A"?C.blue:C.orange):C.dim,
              }}>Case {c}</button>
            ))}
          </div>

          {/* 이번달 실제 결산 (자동) */}
          <Card style={{border:`1px solid ${C.green}33`}}>
            <Lbl c={C.green}>✅ {CUR_PERIOD.label} 결산 (수입/지출 탭 자동 반영)</Lbl>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                {l:"실제 수입",v:실제수입,c:C.green},
                {l:"실제 지출",v:실제지출,c:C.red},
                {l:"실제 저축",v:실제저축,c:실제저축>=0?C.blue:C.red},
              ].map(x=>(
                <div key={x.l} style={{background:C.bg,borderRadius:10,padding:"10px",textAlign:"center",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.dim,marginBottom:3}}>{x.l}</div>
                  <div style={{fontSize:14,fontWeight:900,color:x.c}}>{fmt(x.v,0)}</div>
                </div>
              ))}
            </div>
            {이달현금외합>0&&(
              <div style={{fontSize:11,color:C.teal,background:"#0a1a12",borderRadius:6,padding:"6px 10px",marginBottom:8}}>
                🎁 상품권 사용 {fmt(이달현금외합,0)} 포함 (지출 집계엔 제외)
              </div>
            )}
            <div style={{fontSize:11,color:C.dim}}>
              💡 수입/지출 탭에서 입력하면 여기 자동 반영돼요
            </div>
          </Card>

          {/* CF 계획 vs 실제 테이블 */}
          <Card>
            <Lbl>📊 CF 전체 계획 (Case {caseType})</Lbl>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",whiteSpace:"nowrap"}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {["월","계획수입","계획지출","계획저축","실적수입","실적지출","실적저축","차이"].map(h=>(
                      <th key={h} style={{padding:"6px 4px",color:C.dim,fontWeight:600,fontSize:9,textAlign:"right",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(CF_PLAN).map(([k,{수입,지출}])=>{
                    const 이자=caseType==="A"?이자CF(k):0;
                    const 계획지출실질=지출+이자;
                    const 계획저축실질=수입-계획지출실질;
                    // 이번달만 실적 자동 반영
                    const isCur=k===CUR_PERIOD.cfKey;
                    const 실수입=isCur?실제수입:null;
                    const 실지출=isCur?실제지출:null;
                    const 실저축=isCur?실제저축:null;
                    const 차이=실저축!==null?실저축-계획저축실질:null;
                    return (
                      <tr key={k} style={{background:isCur?"#1a305044":"transparent",borderBottom:`1px solid ${C.border}22`}}>
                        <td style={{padding:"6px 4px",color:isCur?C.blue:C.dim,fontWeight:isCur?700:400}}>{k.slice(2)}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:C.green,fontSize:10}}>{fmt(수입,0)}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:C.red,fontSize:10}}>
                          {fmt(계획지출실질,0)}{이자>0&&<span style={{color:C.orange,fontSize:8}}>*</span>}
                        </td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:C.blue,fontWeight:700,fontSize:10}}>{fmt(계획저축실질,0)}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:C.green,fontSize:10}}>{실수입!==null?fmt(실수입,0):<span style={{color:C.dim}}>-</span>}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:C.red,fontSize:10}}>{실지출!==null?fmt(실지출,0):<span style={{color:C.dim}}>-</span>}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",color:실저축>=0?C.blue:C.red,fontWeight:700,fontSize:10}}>{실저축!==null?fmt(실저축,0):<span style={{color:C.dim}}>-</span>}</td>
                        <td style={{padding:"6px 4px",textAlign:"right",fontWeight:700,fontSize:10,color:차이===null?C.dim:차이>=0?C.green:C.red}}>
                          {차이===null?"-":(차이>=0?"+":"")+fmt(Math.abs(차이,0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {caseType==="A"&&<div style={{marginTop:6,fontSize:10,color:C.orange}}>* 중도금 이자 포함 (26.12~27.11)</div>}
            </div>
          </Card>
        </>}

        {/* ━━━ 납부 타임라인 ━━━ */}
        {tab==="timeline" && (()=>{
          // A/B 동시 시뮬
          const simA = simCashflow(rate, "A");
          const simB = simCashflow(rate, "B");
          // 납부 시점 키 목록
          const payKeys = ["2026-10","2026-12","2027-04","2027-08","2027-12"];

          // 투자수익 계산: A가 B보다 유지한 투자자산에서 나오는 추가 수익
          // 중도금1(26.12): 6억 × 복리 12개월
          // 중도금2(27.04): 6억 × 복리 8개월
          const mr = rate/12;
          const 수익1 = 6e8*((1+mr)**12-1);
          const 수익2 = 6e8*((1+mr)**8-1);
          const 총투자수익 = 수익1+수익2;
          const 순이익 = 총투자수익-총이자A;

          return <>
            {/* D-Day */}
            <Card>
              <Lbl>📅 주요 D-Day</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {l:"☀️ 태양이 탄생",date:"2026-06-03",c:C.yellow},
                  {l:"🏠 계약금 납부",date:"2026-10-01",c:C.blue},
                  {l:"💳 중도금1",date:"2026-12-01",c:C.teal},
                  {l:"🎉 잔금 & 입주",date:"2027-12-01",c:C.green},
                ].map(x=>{
                  const today=new Date(2026,4,3);
                  const days=Math.ceil((new Date(x.date)-today)/(864e5));
                  return (
                    <div key={x.l} style={{background:C.bg,borderRadius:12,padding:"12px",border:`1px solid ${x.c}33`,textAlign:"center"}}>
                      <div style={{fontSize:11,color:C.dim,marginBottom:4}}>{x.l}</div>
                      <div style={{fontSize:20,fontWeight:900,color:x.c}}>{days>0?`D-${days}`:"D-Day"}</div>
                      <div style={{fontSize:10,color:C.dim,marginTop:2}}>{x.date}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 핵심: 투자수익 vs 이자 */}
            <Card style={{background:"linear-gradient(135deg,#061508,#081020)",border:`1px solid ${순이익>0?C.green:C.red}44`}}>
              <Lbl c={순이익>0?C.green:C.red}>
                ⚖️ Case A의 핵심 질문: 투자수익 &gt; 이자?
              </Lbl>
              <div style={{fontSize:11,color:C.dim,marginBottom:12}}>
                A는 중도금 12억을 대출로 버티며 투자 유지 → 수익률 {pct(rate)} 가정
              </div>

              {/* 수익률 선택 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5,marginBottom:14}}>
                {[0.05,0.08,0.12,0.15].map(r=>(
                  <button key={r} onClick={()=>setRate(r)} style={{
                    background:Math.abs(r-rate)<0.001?C.blue2:C.bg,
                    border:`1px solid ${Math.abs(r-rate)<0.001?C.blue:C.border}`,
                    borderRadius:8,padding:"7px 4px",cursor:"pointer",
                    color:Math.abs(r-rate)<0.001?C.blue:C.dim,
                    fontWeight:Math.abs(r-rate)<0.001?800:400,fontSize:11,
                  }}>{pct(r)}</button>
                ))}
              </div>

              <div style={{background:C.bg,borderRadius:12,padding:"14px"}}>
                {[
                  {l:"중도금1 (6억×12개월) 투자수익", v:수익1, c:C.green},
                  {l:"중도금2 (6억×8개월) 투자수익",  v:수익2, c:C.green},
                  {l:"중도금 이자 (4.5%)",            v:-총이자A, c:C.red},
                ].map(x=>(
                  <div key={x.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}33`}}>
                    <span style={{fontSize:11,color:C.dim}}>{x.l}</span>
                    <span style={{fontSize:12,fontWeight:700,color:x.c}}>{x.v>=0?"+":""}{fmt(x.v,0)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:800}}>A가 B보다 버는 돈</span>
                  <span style={{fontSize:20,fontWeight:900,color:순이익>0?C.green:C.red}}>
                    {순이익>0?"+":""}{fmt(순이익,0)}
                  </span>
                </div>
                <div style={{marginTop:6,fontSize:11,color:순이익>0?C.green:C.red}}>
                  {순이익>0
                    ?`✅ 수익률 ${pct(rate)}이면 이자보다 ${fmt(순이익,0)} 더 벌어요 → A가 유리!`
                    :`❌ 수익률 ${pct(rate)}이면 이자가 더 커요 → B가 유리`
                  }
                </div>
              </div>
            </Card>

            {/* A vs B 납부 시점별 비교 */}
            <Card>
              <Lbl>📊 납부 시점별 A vs B 투자자산 비교</Lbl>
              <div style={{fontSize:11,color:C.dim,marginBottom:10}}>
                같은 시점 · A(파란선)는 투자 유지, B(주황선)는 매도로 납부
              </div>

              {/* 헤더 */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:8}}>
                {["시점/납부","Case A 투자잔고","Case B 투자잔고"].map(h=>(
                  <div key={h} style={{fontSize:9,color:C.dim,fontWeight:600,textAlign:"center"}}>{h}</div>
                ))}
              </div>

              {payKeys.map((key,i)=>{
                const lA=simA.find(l=>l.key===key);
                const lB=simB.find(l=>l.key===key);
                if(!lA||!lB) return null;
                const pA=PAYMENTS.A.find(p=>p.date===key);
                const diff=lA.투자-lB.투자; // A가 얼마나 더 많이 들고 있나
                const isLast=key==="2027-12";
                return (
                  <div key={key} style={{
                    background:isLast?"#0a1a08":C.bg,
                    borderRadius:10,padding:"10px 12px",marginBottom:8,
                    border:`1px solid ${isLast?C.green+"44":C.border}`,
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:700}}>{key}</div>
                        <div style={{fontSize:10,color:C.dim}}>{pA?.label}</div>
                        {pA?.amt>0&&<div style={{fontSize:10,color:C.red}}>납부 {fmt(pA.amt,0)}</div>}
                        {pA?.amt===0&&<div style={{fontSize:10,color:C.teal}}>집단대출 (현금무소요)</div>}
                      </div>
                      <div style={{
                        fontSize:10,fontWeight:700,
                        color:diff>0?C.blue:C.dim,
                        background:diff>0?"#0a1020":"transparent",
                        borderRadius:6,padding:"2px 8px",
                      }}>
                        {diff>0?`A가 ${fmt(diff,0)} 더 유지`:"-"}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {[
                        {label:"Case A", sim:lA, color:C.blue, 매도:lA.투자매도},
                        {label:"Case B", sim:lB, color:C.orange, 매도:lB.투자매도},
                      ].map(s=>(
                        <div key={s.label} style={{background:C.card,borderRadius:8,padding:"8px 10px",border:`1px solid ${s.color}33`}}>
                          <div style={{fontSize:10,color:s.color,fontWeight:700,marginBottom:4}}>{s.label}</div>
                          <div style={{fontSize:9,color:C.dim}}>투자잔고</div>
                          <div style={{fontSize:13,fontWeight:900,color:s.color}}>{fmt(s.sim.투자,1)}</div>
                          <div style={{fontSize:9,color:C.dim,marginTop:3}}>현금+투자 합계</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.text}}>{fmt(s.sim.총,1)}</div>
                          {s.매도>0&&(
                            <div style={{fontSize:9,color:C.yellow,marginTop:3}}>📈 매도 {fmt(s.매도,0)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {isLast&&(
                      <div style={{marginTop:8,padding:"8px 10px",background:"#061508",borderRadius:8,fontSize:11,color:C.green}}>
                        🎉 입주! A 투자잔고 {fmt(lA.투자,1)} vs B {fmt(lB.투자,1)}<br/>
                        <span style={{color:C.dim}}>A가 {fmt(lA.투자-lB.투자,0)} 더 많이 보유 (이자 {fmt(총이자A,0)} 감안)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            {/* 총 정리 */}
            <Card style={{background:"linear-gradient(135deg,#0a1628,#0a1020)",border:`1px solid ${C.purple}33`}}>
              <Lbl c={C.purple}>📋 총 직접 현금 필요액 비교</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                {[
                  {label:"Case A", v:목표A총, c:C.blue, sub:"중도금대출 이자 포함"},
                  {label:"Case B", v:목표B총, c:C.orange, sub:"전액자납, 이자 없음"},
                ].map(x=>(
                  <div key={x.label} style={{background:C.bg,borderRadius:12,padding:"14px",textAlign:"center",border:`1px solid ${x.c}33`}}>
                    <div style={{fontSize:11,color:x.c,fontWeight:700,marginBottom:4}}>{x.label}</div>
                    <div style={{fontSize:18,fontWeight:900,color:x.c}}>{fmt(x.v,1)}</div>
                    <div style={{fontSize:10,color:C.dim,marginTop:3}}>{x.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.bg,borderRadius:10,padding:"10px 12px",fontSize:12,color:C.dim,lineHeight:1.9}}>
                현금 차이: <span style={{color:C.yellow,fontWeight:700}}>{fmt(총이자A,0)}</span> (이자)<br/>
                투자수익 차이 ({pct(rate)}): <span style={{color:순이익>0?C.green:C.red,fontWeight:700}}>{fmt(총투자수익,0)}</span><br/>
                <span style={{fontWeight:700,color:순이익>0?C.green:C.red}}>
                  최종 순이익: {순이익>0?"+":""}{fmt(순이익,0)} → {순이익>0?"A가 유리 ✅":"B가 유리"}
                </span>
              </div>
            </Card>
          </>;
        })()}

      </div>

      {/* 하단 탭바 */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#090f1e",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:200}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"9px 2px 11px",background:"none",border:"none",
            borderTop:`2px solid ${tab===t.id?C.blue:"transparent"}`,
            color:tab===t.id?C.blue:C.dim,cursor:"pointer",
          }}>
            <div style={{fontSize:17}}>{t.icon}</div>
            <div style={{fontSize:8,fontWeight:tab===t.id?700:400,marginTop:1}}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
