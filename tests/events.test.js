import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/data/station_events.geojson',import.meta.url)));
test('published events have source-backed dates, unique IDs and mapped venues',()=>{
 assert.equal(data.source.url,'https://data.bodik.jp/ja/dataset/270008_event');
 assert.ok(Number.isFinite(Date.parse(data.source.fetched_at)));
 assert.ok(Array.isArray(data.features));
 assert.equal(new Set(data.features.map(e=>e.properties.id)).size,data.features.length);
 for(const event of data.features){
  const p=event.properties,[lon,lat]=event.geometry.coordinates;
  assert.equal(event.geometry.type,'Point');assert.ok(lon>=134.15&&lon<=136.9&&lat>=33.35&&lat<=35.85);
  assert.equal(p.fictional,false);assert.ok(p.name&&p.venue);
  const url=new URL(p.url);assert.ok(['http:','https:'].includes(url.protocol));
  assert.equal(p.coordinate_source,data.source.url);assert.equal(p.fetched_at,data.source.fetched_at);
  assert.match(p.date,/^\d{4}-\d{2}-\d{2}$/);assert.match(p.end_date,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(p.end_date>=p.date&&p.end_date>=data.source.as_of);
  
 }
});
