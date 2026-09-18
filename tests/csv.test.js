import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv} from '../scripts/parse-csv.mjs';
const header='イベント名,開始日,終了日,緯度,経度,場所名称\r\n';
test('CSV supports BOM, quoted commas, escaped quotes and multiline fields',()=>{
 const rows=parseCsv('\uFEFF'+header+'"催し,展覧会",2026-09-18,2026-09-19,34.5,135.5,"会場\n""本館"""\r\n');
 assert.equal(rows[0]['イベント名'],'催し,展覧会');assert.equal(rows[0]['場所名称'],'会場\n"本館"');
});
test('CSV rejects broken schema and truncated records; header-only is valid',()=>{
 assert.throws(()=>parseCsv('error page'));
 assert.throws(()=>parseCsv(header+'"unfinished'));
 assert.throws(()=>parseCsv(header+'a,b'));
 assert.deepEqual(parseCsv(header),[]);
});
