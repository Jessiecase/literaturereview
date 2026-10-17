import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const flag=process.argv.indexOf('--output-dir');
const output=flag>=0?path.resolve(process.argv[flag+1]):fs.mkdtempSync(path.join(os.tmpdir(),'literature-exports-'));
fs.mkdirSync(output,{recursive:true});
const context=vm.createContext({window:{},TextEncoder,Uint8Array,DataView,Blob,URL,Date,setTimeout,clearTimeout});
for(const file of ['word-export.js','excel-export.js','systematic-schema.js'])vm.runInContext(fs.readFileSync(path.join(root,'public',file),'utf8'),context,{filename:file});
const fields=vm.runInContext('fieldKeys',context),sections=vm.runInContext('reviewSections',context);
const general={title:'測試研究 <中文 & special>',authors:'測試作者',year:'2026',purpose:'=literal text\n'+'研究目的與數值說明。'.repeat(160),design:'橫斷式研究',population:'成年參與者',setting:'研究場域',sample:'120 人',inclusion:'年滿二十歲',exclusion:'未報告',variables:[{name:'睡眠品質',tool:'PSQI',reliability:'α = 0.85',validity:'未報告'}],results:[{type:'單變項',variables:'睡眠品質',method:'描述統計',findings:'7.2 ± 2.1'},{type:'雙變項',variables:'壓力與睡眠',method:'相關分析',findings:'r = 0.42, p < 0.001'},{type:'其他',variables:'睡眠',method:'多變項',findings:'未報告'}]};
const systematic=Object.fromEntries(fields.map(k=>[k,'未報告']));systematic.title='系統性文獻測試';
function unzip(bytes){const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),entries={};let offset=0;while(offset+30<bytes.length&&view.getUint32(offset,true)===0x04034b50){assert.equal(view.getUint16(offset+8,true),0,'Expected stored OOXML entries');const size=view.getUint32(offset+18,true),nameLen=view.getUint16(offset+26,true),extraLen=view.getUint16(offset+28,true);const name=new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameLen)),start=offset+30+nameLen+extraLen;entries[name]=new TextDecoder().decode(bytes.subarray(start,start+size));offset=start+size;}assert(view.getUint32(offset,true)===0x02014b50);return entries;}
for(const [kind,data] of [['general',general],['systematic',systematic]]){
 const options={title:kind==='general'?'一般文獻整理答案':'系統性文獻整理答案',kind,data,sections,studentId:'TEST0001',studentName:'測試學生',submitted:true};
 for(const [type,create,mime,entry] of [['docx',context.window.createWordAnswers,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','word/document.xml'],['xlsx',context.window.createExcelAnswers,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xl/worksheets/sheet1.xml']]){
  const blob=create(options);assert.equal(blob.type,mime);const bytes=new Uint8Array(await blob.arrayBuffer()),entries=unzip(bytes);assert(entries['[Content_Types].xml']);assert(entries[entry].includes('TEST0001'));assert(entries[entry].includes('測試學生'));assert(entries[entry].includes('已繳交'));
  if(type==='docx')assert(entries[entry].includes('<w:tbl>'));
  else {assert(entries[entry].includes('t="inlineStr"'));assert(!entries[entry].includes('<f>'));assert(entries[entry].includes('state="frozen"'));if(kind==='general')assert(entries[entry].includes('（續）'));}
  fs.writeFileSync(path.join(output,`${kind}.${type}`),bytes);
 }
}
console.log(`PASS: both document types, real OOXML packages, student metadata, submitted exports, literal Excel text, long answers. Test files: ${output}`);
