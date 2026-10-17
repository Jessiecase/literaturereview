/* Export student answers as a native XLSX workbook in the browser. */
(function () {
  'use strict';
  const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function answerRecords(data, kind, sections) {
    const records = [];
    const add = (category, label, value) => records.push([category, label, value || '（尚未填寫）']);
    if (kind === 'systematic') {
      sections.forEach(([name, fields], i) => fields.forEach(([key, label]) => add((i + 1) + ' ' + name, label, data[key])));
    } else {
      [['一 文章名稱',[['title','文章名稱']]],['二 作者姓名與年代',[['authors','作者姓名'],['year','發表年代／年份']]],['三 研究目的',[['purpose','研究目的']]],['四 研究設計',[['design','研究設計']]],['五 研究對象',[['population','研究對象特性'],['setting','研究場域'],['sample','個案數'],['inclusion','收案條件'],['exclusion','排除條件']]]].forEach(([name,fields])=>fields.forEach(([key,label])=>add(name,label,data[key])));
      data.variables.forEach((v,i)=>[['name','變項名稱'],['tool','使用的研究工具'],['reliability','信度'],['validity','效度']].forEach(([key,label])=>add('六 研究變項 '+(i+1),label,v[key])));
      if (!data.variables.length) add('六 研究變項','研究變項','');
      ['單變項','雙變項','其他'].forEach(type=>{
        const entries=data.results.filter(r=>r.type===type);
        entries.forEach((r,i)=>[['variables','變項或變項關係'],['method','統計或分析方法'],['findings','結果數值與說明']].forEach(([key,label])=>add('七 研究結果 '+type+' '+(i+1),label,r[key])));
        if(!entries.length)add('七 研究結果 '+type,'研究結果','');
      });
    }
    return records;
  }
  function wrapParts(value, width) {
    const parts=[];let text='',lineWidth=0,lines=1;
    for(const char of String(value)) {
      const weight=char.codePointAt(0)>255?2:1;
      const nextLine=char==='\n'||lineWidth+weight>width;
      if(nextLine&&lines>=12){parts.push({text,lines});text='';lineWidth=0;lines=1;}
      else if(nextLine){lines++;lineWidth=0;}
      text+=char;if(char!=='\n')lineWidth+=weight;
    }
    if(text||!parts.length)parts.push({text,lines});return parts;
  }
  window.createExcelAnswers = function({title,data,kind='general',sections=[],studentId='',studentName='',submitted=false}) {
    if(!data||typeof data!=='object')throw Error('找不到文獻整理答案。');
    const {zip,escapeXml}=window.ReviewOffice;
    const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const cell=(column,row,value,style=0)=>`<c r="${column}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    const rows=[];let number=0;
    function row(values,height=24,styles=[]) {height=Math.max(height,...values.map((value,i)=>wrapParts(value,[22,34,70][i])[0].lines*16+10));number++;rows.push(`<row r="${number}" ht="${height}" customHeight="1">${values.map((value,i)=>cell(String.fromCharCode(65+i),number,value,styles[i]||0)).join('')}</row>`);}
    row([],12);row([title],32,[2]);row(['學號',studentId||'（未登記）']);row(['姓名',studentName||'（未登記）']);row(['紀錄狀態',submitted?'已繳交':'整理草稿']);row(['匯出時間',new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})]);row(['整理類別','整理項目','填寫答案'],28,[1,1,1]);
    for(const [category,label,value] of answerRecords(data,kind,sections)) {
      const parts=wrapParts(value,70);
      parts.forEach((part,i)=>{const categoryLines=wrapParts(category,20)[0].lines,labelLines=wrapParts(label+(i?'（續）':''),32)[0].lines;row([category,label+(i?'（續）':''),part.text],Math.max(28,Math.max(part.lines,categoryLines,labelLines)*16+10),[3,0,0]);});
    }
    const sheetName=kind==='systematic'?'系統性文獻整理':'一般文獻整理';
    const styles=`${xml}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><color rgb="FF233D3B"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="16"/><color rgb="FF233D3B"/><name val="Microsoft JhengHei"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF245846"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F5F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="hair"><color rgb="FFDCE5DE"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1" applyNumberFormat="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="49" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return zip({
      '[Content_Types].xml':`${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels':`${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml':`${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName}'!$7:$7</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">'${sheetName}'!$A$1:$C$${number}</definedName></definedNames></workbook>`,
      'xl/_rels/workbook.xml.rels':`${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml':styles,
      'xl/worksheets/sheet1.xml':`${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:C${number}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A8" sqref="A8"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="2" width="36" customWidth="1"/><col min="3" max="3" width="76" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`
    },MIME);
  };
  window.exportExcelAnswers = function(options) {
    const blob=window.createExcelAnswers(options),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${options.studentId||'文獻整理'}_${options.articleTitle||'答案'}`.replace(/[\\/:*?"<>|\u0000-\u001F]/g,'_').slice(0,100)+'.xlsx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  };
})();
