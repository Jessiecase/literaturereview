/* Browser-only OOXML export. Student answers stay on the current device. */
(function () {
  'use strict';
  const encoder = new TextEncoder();
  const escapeXml = value => String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const crcTable = Array.from({ length: 256 }, (_, i) => { for (let n = 0; n < 8; n++) i = (i & 1) ? (0xedb88320 ^ (i >>> 1)) : (i >>> 1); return i >>> 0; });
  function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
  function header(size, fields) { const bytes = new Uint8Array(size), view = new DataView(bytes.buffer); fields.forEach(([offset, value, width]) => width === 2 ? view.setUint16(offset, value, true) : view.setUint32(offset, value, true)); return bytes; }
  function zip(files, mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const entries = [], directory = []; let offset = 0, centralSize = 0;
    for (const [name, content] of Object.entries(files)) {
      const filename = encoder.encode(name), bytes = encoder.encode(content), crc = crc32(bytes);
      const local = header(30, [[0,0x04034b50,4],[4,20,2],[6,0x800,2],[12,33,2],[14,crc,4],[18,bytes.length,4],[22,bytes.length,4],[26,filename.length,2]]);
      entries.push(local, filename, bytes);
      const central = header(46, [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[14,33,2],[16,crc,4],[20,bytes.length,4],[24,bytes.length,4],[28,filename.length,2],[42,offset,4]]);
      directory.push(central, filename); centralSize += central.length + filename.length; offset += local.length + filename.length + bytes.length;
    }
    const end = header(22, [[0,0x06054b50,4],[8,Object.keys(files).length,2],[10,Object.keys(files).length,2],[12,centralSize,4],[16,offset,4]]);
    return new Blob([...entries, ...directory, end], { type: mime });
  }
  function paragraph(text, style = 'Normal') {
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
  }
  function table(headers, rows, widths = [2600, 7038]) {
    const cell = (text, i, heading) => '<w:tc><w:tcPr><w:tcW w:w="'+widths[i]+'" w:type="dxa"/>'+(heading?'<w:shd w:val="clear" w:fill="E8EFEA"/>':'')+'<w:vAlign w:val="top"/></w:tcPr>'+String(text || '（尚未填寫）').split(/\r?\n/).map(line=>paragraph(line,heading?'TableHeader':'TableText')).join('')+'</w:tc>';
    const row = (values, heading) => { const longRow = values.some(value => String(value || '').length > 800 || String(value || '').split(/\r?\n/).length > 20); return '<w:tr><w:trPr>'+(!longRow?'<w:cantSplit/>':'')+(heading?'<w:tblHeader/>':'')+'</w:trPr>'+values.map((value,i)=>cell(value,i,heading)).join('')+'</w:tr>'; }; 
    const borders = ['top','left','bottom','right','insideH','insideV'].map(side=>'<w:'+side+' w:val="single" w:sz="4" w:color="B7C5BD"/>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+borders+'</w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="130" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="130" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+row(headers,true)+rows.map(values=>row(values,false)).join('')+'</w:tbl>'+paragraph('','TableText');
  }
  function createWordAnswers({ title, data, studentId = '', studentName = '', submitted = false }) {
    if (!data || typeof data !== 'object') throw new Error('找不到文獻整理答案。');
    let body = paragraph(title, 'Title');
    body += paragraph('學號：'+(studentId || '（未登記）')+'    姓名：'+(studentName || '（未登記）'));
    body += paragraph('狀態：'+(submitted ? '已繳交' : '整理草稿')+'    匯出時間：'+new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));
      body += table(['整理項目','填寫答案'],[
        ['一 文章名稱',data.title],['二 作者姓名與年代','作者：'+(data.authors||'（尚未填寫）')+'\n年代：'+(data.year||'（尚未填寫）')],['三 研究目的',data.purpose],['四 研究設計',data.design],
        ['五 研究對象','研究對象特性：'+(data.population||'（尚未填寫）')+'\n研究場域：'+(data.setting||'（尚未填寫）')+'\n個案數：'+(data.sample||'（尚未填寫）')+'\n收案條件：'+(data.inclusion||'（尚未填寫）')+'\n排除條件：'+(data.exclusion||'（尚未填寫）')]
      ]);
      body += paragraph('六 研究變項','Heading1')+table(['研究變項','使用的研究工具','信度','效度'],data.variables.length?data.variables.map(v=>[v.name,v.tool,v.reliability,v.validity]):[['（尚未填寫）','','','']],[1700,2900,2500,2538]);
      body += paragraph('七 研究結果','Heading1');
      ['單變項','雙變項','其他'].forEach(type=>{const rows=data.results.filter(r=>r.type===type);body+=paragraph(type,'Heading2')+table(['變項或變項關係','統計或分析方法','結果數值與說明'],rows.length?rows.map(r=>[r.variables,r.method,r.findings]):[['（尚未填寫）','','']],[2500,2400,4738]);});
    const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const styles = `${xml}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft JhengHei"/><w:sz w:val="22"/><w:lang w:val="zh-TW" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40" w:line="270" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="TableText"/><w:pPr><w:keepLines/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="AnalysisHeading"><w:name w:val="Analysis Heading"/><w:basedOn w:val="Heading1"/><w:pPr><w:pageBreakBefore/></w:pPr></w:style></w:styles>`;
    return zip({
      '[Content_Types].xml': `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
      '_rels/.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      'word/document.xml': `${xml}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`,
      'word/styles.xml': styles,
      'word/_rels/document.xml.rels': `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    });
  }
  window.ReviewOffice = { zip, escapeXml };
  window.createWordAnswers = createWordAnswers;
  window.exportWordAnswers = function (options) {
    const blob = createWordAnswers(options), url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = `${options.studentId || '文獻整理'}_${options.articleTitle || '答案'}`.replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 100) + '.docx';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
})();
