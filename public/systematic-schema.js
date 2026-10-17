const reviewSections=[
['文章名稱',[['title','文章完整名稱'],['doi','DOI／來源連結（選填）',true]]],
['作者姓名與年代',[['authors','作者姓名'],['year','發表年代／年份']]],
['研究目的',[['purpose','研究目的與研究問題']]],
['研究設計',[['design','回顧類型與納入研究設計'],['registration','計畫註冊／編號（未報告請註明）']]],
['資料庫',[['databases','使用的資料庫'],['period','搜尋涵蓋期間'],['lastSearch','最後搜尋日期']]],
['搜尋策略（PICO）',[['p','P：研究對象／問題'],['i','I：介入措施／暴露因素'],['c','C：比較組'],['o','O：結果指標'],['keywords','關鍵字與主題詞（如 MeSH）'],['query','完整搜尋式（AND、OR、NOT）'],['limits','語言、年代與其他限制']]],
['文獻篩選',[['initial','初始文獻篇數'],['deduplicated','去除重複後篇數'],['fulltext','全文評估篇數'],['included','最終納入回顧篇數'],['metaCount','納入統合分析篇數'],['participants','總個案數／參與者數'],['inclusion','納入條件'],['exclusion','排除條件'],['excludedReasons','全文排除原因與各原因篇數']]],
['文獻評讀工具與結果',[['appraisal','評讀工具與版本（JBI、RoB 2 等）'],['reviewers','評讀者人數與歧見處理'],['appraisalResults','評讀結果／偏誤風險'],['qualityIssues','主要方法學問題']]],
['分析結果',[['variables','主要與次要結果變項、工具及追蹤時間'],['effects','各結果變項：研究篇數、個案數、效果量類型、合併值、95% CI、p 值及模型'],['forest','森林圖圖號／頁碼、效果方向、是否跨無效值及解讀'],['heterogeneity','I²、Q／χ²、自由度、p 值、τ² 及可能原因'],['additional','次群組／敏感度分析及結果（未進行請註明）']]]
];
const fieldKeys=reviewSections.flatMap(s=>s[1].map(f=>f[0]));
const requiredKeys=reviewSections.flatMap(s=>s[1].filter(f=>!f[2]).map(f=>f[0]));
const blankReview=()=>Object.fromEntries(fieldKeys.map(k=>[k,'']));
const validReview=d=>d&&typeof d==='object'&&fieldKeys.every(k=>typeof d[k]==='string'&&d[k].length<=12000);
const sectionDone=(d,s)=>s[1].filter(f=>!f[2]).every(f=>d[f[0]]?.trim());
function reviewSummary(d){return reviewSections.map((s,i)=>(i+1)+'、'+s[0]+'\n'+s[1].map(f=>f[1]+'：\n'+(d[f[0]]||'（尚未填寫）')).join('\n\n')).join('\n\n');}
