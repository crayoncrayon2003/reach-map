import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {radialMinutes} from '../src/travel.js';
import {parseCsv} from './parse-csv.mjs';
const LIST='https://data.bodik.jp/ja/dataset/270008_event';
const API='https://data.bodik.jp/api/3/action/package_show?id=270008_event';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
const fetchedAt=new Date().toISOString();
async function get(url){await new Promise(r=>setTimeout(r,3000));const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);return r;}
const metadata=await (await get(API)).json();
if(!metadata.success)throw Error('Invalid BODIK metadata');
const resource=metadata.result.resources.find(r=>r.format?.toUpperCase()==='CSV');
if(!resource||new URL(resource.url).hostname!=='data.bodik.jp')throw Error('Missing BODIK CSV');
const bytes=await (await get(resource.url)).arrayBuffer();
let csv;try{csv=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{csv=new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}
const rows=parseCsv(csv);
const railway=JSON.parse(await readFile('public/data/railway.json','utf8'));
const report={source:LIST,feed:resource.url,fetched_at:fetchedAt,as_of:today,listed:rows.length,excluded:[]};
const features=[],seen=new Set();
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
for(const row of rows){
 const name=row['イベント名'],start=row['開始日'],end=row['終了日'];
 const skip=reason=>report.excluded.push({name,reason});
 if(!validDate(start)||!validDate(end)||end<start){skip('開催日不明・不正');continue;}
 if(end<today){skip('開催終了');continue;}
 if(/中止|取消/.test(row['状態']||'')){skip('開催中止');continue;}
 const lat=Number(row['緯度']),lon=Number(row['経度']),venue=row['場所名称'];
 if(!name||!venue||!row['緯度']||!row['経度']||!(lon>=134.15&&lon<=136.9&&lat>=33.35&&lat<=35.85)){skip('会場名・座標不明、または対象範囲外');continue;}
 const url=safeUrl(row['コンテンツURL'])||safeUrl(row['URL'])||LIST;
 const id='bodik-osaka-'+createHash('sha256').update(JSON.stringify([row.ID,name,start,end,venue,lon,lat,url])).digest('hex').slice(0,20);
 if(seen.has(id)){skip('重複');continue;}seen.add(id);
 const access={},point={lon,lat};
 for(const station of railway.stations){const bike=radialMinutes(station,point,'bike'),walk=radialMinutes(station,point,'walk');if(Math.min(bike,walk)<=30)access[station.id]={out:bike,back:bike,walk_out:walk,walk_back:walk};}
 const time=s=>/^\d{1,2}:\d{2}(:\d{2})?$/.test(s||'')?s.slice(0,5):null;
 features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{id,name,venue,address:row['所在地_連結表記']||'',category:'その他',source_category:row['イベント種類']||'',date:start,end_date:end,start:time(row['開始時間']),end:time(row['終了時間']),schedule:row['開始日時特記事項']||'',url,source:'大阪府 イベント一覧（BODIK）',source_updated:resource.last_modified||metadata.result.metadata_modified,fetched_at:fetchedAt,coordinate_source:LIST,fictional:false,access}});
}
report.imported=features.length;
const output={type:'FeatureCollection',source:{name:'大阪府 イベント一覧（BODIK）',url:LIST,feed_url:resource.url,license:'CC BY 4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',fetched_at:fetchedAt,as_of:today,coordinate_method:'大阪府CSVの緯度・経度',limitations:'公開CSVを抽出・加工。休催日・申込条件などは掲載元を確認してください。'},features};
await mkdir('docs',{recursive:true});
await writeFile('public/data/station_events.geojson.tmp',JSON.stringify(output)+'\n');
await rename('public/data/station_events.geojson.tmp','public/data/station_events.geojson');
await writeFile('docs/events-import-report.json',JSON.stringify(report,null,2)+'\n');
console.log(`Imported ${features.length}/${rows.length}; excluded ${report.excluded.length}`);
