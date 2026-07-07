/* ============================================================================
 * WFO 절삭량 계산기 — 전체 테이블 정합성 검증 (수술 데이터: 무관용)
 *
 * 핵심 아이디어:
 *   "테스트용 재구현"이 아니라, 실제 배포될 index.html 안의 엔진 코드(파서·
 *   룩업·계산)를 그대로 떼어내 Node에서 실행한다. (DOMParser는 jsdom, 압축해제는
 *   Node 네이티브 DecompressionStream.) 그 결과를 독립 라이브러리 SheetJS(xlsx)가
 *   읽은 동일 xlsx의 모든 셀과 cent(1/100) 정수 단위로 대조한다.
 *   sph/cyl 헤더 + 전 데이터 셀 + 결측치 + 잔여 계산식까지 한 셀이라도 어긋나면 FAIL.
 * ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import xlsx from 'xlsx';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'index.html');
const XLSX = path.join(ROOT, 'data_2026_06_23.xlsx');

const i100 = x => Math.round(x * 100);
const fails = [];
const fail = m => fails.push(m);
function isMissing(raw){
  if (raw === undefined || raw === null) return true;
  const s = String(raw).trim();
  return s === '' || s === '-';
}

/* ---- 1) 배포 HTML에서 엔진 블록 추출 후 그대로 실행 ---- */
function loadEngineFromHtml(){
  const html = fs.readFileSync(HTML, 'utf8');
  const m = html.match(/\/\* ==WFO-ENGINE:START==[\s\S]*?==WFO-ENGINE:END== \*\//);
  if (!m) throw new Error('index.html에서 ==WFO-ENGINE== 블록을 찾지 못했습니다.');
  const engineSrc = m[0];
  const DOMParser = new JSDOM('').window.DOMParser;       // 브라우저 DOM 동등
  const win = {};
  // Node 전역(Blob/Response/TextDecoder/DataView/DecompressionStream)은 그대로 사용
  const factory = new Function('window', 'DOMParser', engineSrc + '\nreturn window.__WFO__;');
  const engine = factory(win, DOMParser);
  if (!engine || typeof engine.parseXlsx !== 'function')
    throw new Error('엔진 추출 실패: window.__WFO__ 없음');
  return engine;
}

/* ---- 2) 독립 기준값: SheetJS로 같은 xlsx를 읽어 (sph|cyl)→값 맵 구성 ---- */
function buildReference(sheetName){
  const wb = xlsx.readFile(XLSX);
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`기준 시트 없음: ${sheetName}`);
  const cell = addr => { const c = ws[addr]; return c === undefined ? undefined : c.v; };
  const colName = n => { let s=''; while(n>0){const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26);} return s; };

  // sph: A3 아래로 숫자인 동안
  const sphRows = [];
  for (let r = 3; r <= 5000; r++){
    const v = cell('A' + r);
    const n = Number(String(v).trim());
    if (v === undefined || v === '' || !Number.isFinite(n)) break;
    sphRows.push({ r, sph: n });
  }
  // cyl: B2..Z2
  const cylCols = [];
  for (let c = 2; c <= 26; c++){
    const v = cell(colName(c) + '2');
    const n = Number(String(v).trim());
    if (!Number.isFinite(n)) throw new Error(`기준 cyl 파싱 실패 ${colName(c)}2 = ${JSON.stringify(v)}`);
    cylCols.push({ c, cyl: n });
  }
  // 값 맵: key=`i100(sph)|i100(cyl)` → number | null(결측)
  // 중복 sph는 "첫 등장 우선"으로 처리 — 앱의 extractTableFromCellMap(!has→set)과 동일 의미.
  // (사용자 확정: 6.5mm의 중복 sph=0 은 위(블록1) 값이 정답)
  const map = new Map();
  for (const { r, sph } of sphRows){
    for (const { c, cyl } of cylCols){
      const raw = cell(colName(c) + r);
      const val = isMissing(raw) ? null : Number(String(raw).trim());
      if (!isMissing(raw) && !Number.isFinite(val))
        throw new Error(`기준 데이터 비숫자 ${colName(c)}${r} = ${JSON.stringify(raw)}`);
      const k = i100(sph) + '|' + i100(cyl);
      if (!map.has(k)) map.set(k, val);
    }
  }

  // 데이터 품질 경고 수집 (실패 아님 · 정보용)
  const seen = new Map(), dups = [];
  for (const { r, sph } of sphRows){
    if (seen.has(i100(sph))) dups.push({ sph, rowFirst: seen.get(i100(sph)), rowDup: r });
    else seen.set(i100(sph), r);
  }
  return {
    sph: sphRows.map(x => x.sph),
    cyl: cylCols.map(x => x.cyl),
    map, dups,
  };
}

/* ---- 3) 한 시트 대조 ---- */
function checkSheet(label, appTable, appGrid, engine, ref){
  const tag = `[${label}]`;
  let cells = 0, missing = 0;

  // 3-1) sph 리스트
  if (appTable.sphList.length !== ref.sph.length)
    fail(`${tag} sph 개수 불일치: 앱 ${appTable.sphList.length} vs 기준 ${ref.sph.length}`);
  const nSph = Math.min(appTable.sphList.length, ref.sph.length);
  for (let i = 0; i < nSph; i++)
    if (i100(appTable.sphList[i]) !== i100(ref.sph[i]))
      fail(`${tag} sph[${i}] 불일치: 앱 ${appTable.sphList[i]} vs 기준 ${ref.sph[i]}`);

  // 3-2) cyl 리스트
  if (appTable.cylList.length !== ref.cyl.length)
    fail(`${tag} cyl 개수 불일치: 앱 ${appTable.cylList.length} vs 기준 ${ref.cyl.length}`);
  const nCyl = Math.min(appTable.cylList.length, ref.cyl.length);
  for (let j = 0; j < nCyl; j++)
    if (i100(appTable.cylList[j]) !== i100(ref.cyl[j]))
      fail(`${tag} cyl[${j}] 불일치: 앱 ${appTable.cylList[j]} vs 기준 ${ref.cyl[j]}`);

  // 3-3) 모든 셀: 앱 valueMap + 실제 UI 룩업(lookupGrid) + 기준값 3중 대조
  for (const sph of appTable.sphList){
    for (const cyl of appTable.cylList){
      cells++;
      const key = i100(sph) + '|' + i100(cyl);
      const appVal = appTable.valueMap.get(engine.toKey(sph, cyl)); // number|null
      const refVal = ref.map.has(key) ? ref.map.get(key) : Symbol('absent');

      if (refVal === undefined || typeof refVal === 'symbol'){
        fail(`${tag} 기준에 없음 sph=${sph} cyl=${cyl}`); continue;
      }

      // (a) 파서 추출값 vs 기준
      if (appVal === null || refVal === null){
        if (appVal !== refVal)
          fail(`${tag} 결측 불일치 sph=${sph} cyl=${cyl}: 앱 ${appVal} vs 기준 ${refVal}`);
      } else if (i100(appVal) !== i100(refVal)){
        fail(`${tag} 값 불일치 sph=${sph} cyl=${cyl}: 앱 ${appVal} vs 기준 ${refVal}`);
      }
      if (refVal === null) missing++;

      // (b) 실제 UI 경로(lookupGrid) 결과가 파서 추출값과 일치하는지
      const res = engine.lookupGrid(appGrid, sph, cyl);
      if (appVal === null){
        if (res.state !== 'na')
          fail(`${tag} lookup 상태오류 sph=${sph} cyl=${cyl}: 결측인데 state=${res.state}`);
      } else {
        if (res.state !== 'ok')
          fail(`${tag} lookup 상태오류 sph=${sph} cyl=${cyl}: state=${res.state}`);
        else if (i100(res.value) !== i100(appVal))
          fail(`${tag} lookup 값오류 sph=${sph} cyl=${cyl}: ${res.value} vs ${appVal}`);
      }

      // (c) 잔여 계산식 검증 (정상 셀): residual == thk - val - 100 (cent 정수)
      if (appVal !== null){
        for (const thk of [550, 500.5, 0, 612.25]){
          const got = engine.residual(thk, refVal);
          const want = (i100(thk) - i100(refVal) - i100(100)) / 100;
          if (i100(got) !== i100(want))
            fail(`${tag} 잔여계산 오류 sph=${sph} cyl=${cyl} thk=${thk}: ${got} vs ${want}`);
        }
      }
    }
  }
  return { cells, missing };
}

/* ---- main ---- */
const engine = loadEngineFromHtml();
const buf = fs.readFileSync(XLSX);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const parsed = await engine.parseXlsx(ab);

console.log('환경: index.html 엔진 직접 실행 (jsdom DOMParser + Node DecompressionStream) vs SheetJS 기준\n');

let totalCells = 0, totalMissing = 0;
const warns = [];
for (const [mode, sheetName] of [['6.0', engine.SHEET_60], ['6.5', engine.SHEET_65]]){
  const ref = buildReference(sheetName);
  const r = checkSheet(`${sheetName}`, parsed.tables[mode], parsed.sheets[mode], engine, ref);
  totalCells += r.cells; totalMissing += r.missing;
  console.log(`  ${sheetName.padEnd(11)} : sph ${ref.sph.length} × cyl ${ref.cyl.length} = ${r.cells} 셀 (결측 ${r.missing})`);
  for (const d of ref.dups)
    warns.push(`${sheetName}: sph=${d.sph} 중복 (행 ${d.rowFirst}·${d.rowDup}) → 앱은 첫 등장(행 ${d.rowFirst}) 값 사용`);
}

if (warns.length){
  console.log('\n⚠ 데이터 품질 경고 (정합성 실패 아님 · 원본 xlsx 검토 권장):');
  for (const w of warns) console.log('   • ' + w);
  console.log('   • 참고: 6.5mm 행62 sph 값 "-2.5"는 오타로 보이며(2.5 누락), 앱은 sph=2.5 조회 시 "표에 없음" 처리합니다.');
}

console.log(`\n총 ${totalCells} 셀 검증 (결측 ${totalMissing}).`);
if (fails.length){
  console.log(`\n❌ FAIL — 불일치 ${fails.length}건:`);
  for (const m of fails.slice(0, 40)) console.log('   • ' + m);
  if (fails.length > 40) console.log(`   …외 ${fails.length - 40}건`);
  process.exit(1);
} else {
  console.log('\n✅ PASS — 모든 셀·헤더·결측·잔여계산이 기준과 정확히 일치합니다.');
}
