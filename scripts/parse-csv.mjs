export function parseCsv(input){
 const table=[];let row=[],field='',quoted=false;
 const s=input.replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='"'){if(quoted&&s[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))table.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quote');
 if(field||row.length){row.push(field);table.push(row);}
 const headers=table.shift()||[];
 for(const h of ['イベント名','開始日','終了日','緯度','経度','場所名称'])if(!headers.includes(h))throw Error(`Missing CSV column: ${h}`);
 return table.map(r=>{if(r.length!==headers.length)throw Error('Invalid CSV row width');return Object.fromEntries(headers.map((h,i)=>[h,r[i].trim()]));});
}
