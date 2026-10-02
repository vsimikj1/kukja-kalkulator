(() => {
  const CLIENT_ID = '316731084731-3es77hp4mhi0dv6je2u883n0gbdu4g77.apps.googleusercontent.com';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const FOLDER_NAME = 'Калкулатор за градба';
  const JSON_NAME = 'Kukja_Gradba_Data.json';
  const XLSX_NAME = 'Kukja_Gradba.xlsx';
  const LS = 'kukja-drive-v3';
  let tokenClient = null, accessToken = null, pendingAuth = null, busy = false;
  let gapiReady = false, gisReady = false;
  const $ = id => document.getElementById(id);
  const driveState = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
  const setDriveState = s => localStorage.setItem(LS, JSON.stringify(s));
  function setStatus(text, kind='warn'){ if($('driveStatus')){$('driveStatus').textContent=text;$('driveStatus').dataset.kind=kind;} }
  function setButtons(enabled){ if($('syncDrive'))$('syncDrive').disabled=!enabled||busy; if($('restoreDrive'))$('restoreDrive').disabled=!enabled||busy; if($('downloadDriveXlsx'))$('downloadDriveXlsx').disabled=!enabled||busy; }
  function setLastSync(text){if($('driveLastSync'))$('driveLastSync').textContent=text;}

  async function initGapi(){
    if(!window.gapi || gapiReady) return;
    await new Promise(resolve=>gapi.load('client', resolve));
    await gapi.client.init({discoveryDocs:[DISCOVERY_DOC]});
    gapiReady=true;
  }
  function initGIS(){
    if(!window.google?.accounts?.oauth2 || tokenClient) return !!tokenClient;
    tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,callback:()=>{}});
    gisReady=true; return true;
  }
  async function initGoogle(){
    try{ await initGapi(); }catch(e){ console.error('gapi init',e); }
    return initGIS();
  }
  async function requestToken(prompt=''){
    if(!tokenClient) initGIS();
    if(!tokenClient) throw new Error('Google Login библиотеката сè уште не е вчитана. Освежи ја страницата и пробај повторно.');
    return new Promise((resolve,reject)=>{
      pendingAuth={resolve,reject};
      tokenClient.callback=(resp)=>{
        const p=pendingAuth; pendingAuth=null;
        if(resp.error){ accessToken=null; if(window.gapi?.client) gapi.client.setToken(null); setStatus('Грешка при најавување','error'); p?.reject(resp); return; }
        accessToken=resp.access_token;
        if(window.gapi?.client) gapi.client.setToken({access_token:accessToken});
        const s=driveState();s.connected=true;setDriveState(s);setStatus('Поврзан','ok');setButtons(true);p?.resolve();
      };
      tokenClient.requestAccessToken({prompt});
    });
  }
  async function validateToken(){
    if(!accessToken) return false;
    try{
      if(window.gapi?.client?.drive?.about){
        await gapi.client.drive.about.get({fields:'user(emailAddress,displayName)'});
      }else{
        const r=await fetch('https://www.googleapis.com/drive/v3/about?fields=user',{headers:{Authorization:`Bearer ${accessToken}`}});
        if(!r.ok) throw new Error('HTTP '+r.status);
      }
      return true;
    }catch(e){ console.warn('Drive token validation failed',e); accessToken=null; if(window.gapi?.client)gapi.client.setToken(null); return false; }
  }
  async function ensureAuth(forcePrompt=false){
    if(location.protocol!=='https:' && location.hostname!=='localhost') throw new Error('Google Drive бара HTTPS. Отвори ја апликацијата преку GitHub Pages.');
    await initGoogle();
    if(await validateToken()) return;
    await requestToken(forcePrompt?'consent':'');
    if(!(await validateToken())) throw new Error('Google access token е невалиден. Пробај Disconnect/Connect повторно.');
  }
  async function api(url,options={},retry=true){
    if(!accessToken) await ensureAuth(false);
    const headers={...(options.headers||{}),Authorization:`Bearer ${accessToken}`};
    const r=await fetch(url,{...options,headers});
    if(r.status===401 && retry){ accessToken=null; if(window.gapi?.client)gapi.client.setToken(null); await requestToken(''); return api(url,options,false); }
    if(!r.ok){let msg=r.statusText;try{const j=await r.json();msg=j.error?.message||msg;}catch{} throw new Error(msg);}
    return r;
  }
  async function findFolder(){
    const q=encodeURIComponent(`name='${FOLDER_NAME.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const r=await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`); const j=await r.json(); return j.files?.[0]||null;
  }
  async function ensureFolder(){
    const s=driveState(); if(s.folderId)return s.folderId;
    const existing=await findFolder(); if(existing){s.folderId=existing.id;setDriveState(s);return existing.id;}
    const r=await api('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FOLDER_NAME,mimeType:'application/vnd.google-apps.folder'})});
    const j=await r.json();s.folderId=j.id;setDriveState(s);return j.id;
  }
  async function findFile(name,folderId){
    const q=encodeURIComponent(`name='${name.replace(/'/g,"\\'")}' and '${folderId}' in parents and trashed=false`);
    const r=await api(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`); const j=await r.json(); return j.files?.[0]||null;
  }
  async function uploadFile(name,content,mime,folderId){
    const existing=await findFile(name,folderId); const metadata={name}; if(!existing)metadata.parents=[folderId];
    const boundary='-------kukja'+Math.random().toString(16).slice(2);
    const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),`\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,content,`\r\n--${boundary}--`]);
    const base=existing?`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const r=await api(base,{method:existing?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body}); return r.json();
  }
  function makeXlsxBytes(data){
    if(!window.XLSX)throw new Error('Excel библиотеката не е достапна.');
    const phases=Array.isArray(data?.settings?.phases)&&data.settings.phases.length?data.settings.phases:[];
    const details=data?.settings?.phaseDetails&&typeof data.settings.phaseDetails==='object'?data.settings.phaseDetails:{};
    const offers=Array.isArray(data?.offers)?data.offers:[];
    const moneyValue=v=>Number(v||0);
    const safeSheetName=(name,used)=>{
      let n=String(name||'Фаза').replace(/[\\\/?*\[\]:]/g,'-').trim().slice(0,31)||'Фаза';
      const base=n; let i=2;
      while(used.has(n)){const suffix=' '+i++;n=(base.slice(0,31-suffix.length)+suffix)}
      used.add(n);return n;
    };
    const styleSheet=ws=>{
      const range=ws['!ref']; if(!range)return;
      const ref=XLSX.utils.decode_range(range);
      for(let c=ref.s.c;c<=ref.e.c;c++){
        const cell=ws[XLSX.utils.encode_cell({r:0,c})];
        if(cell)cell.s={font:{bold:true},fill:{fgColor:{rgb:'F3E8D0'}},alignment:{vertical:'center'}};
      }
      ws['!autofilter']={ref:XLSX.utils.encode_range(ref)};
      ws['!cols']=Array.from({length:ref.e.c-ref.s.c+1},()=>({wch:20}));
    };
    const wb=XLSX.utils.book_new();
    const used=new Set();

    const summary=[['Фаза','Статус','Буџет (€)','Потрошено (€)','Број на понуди','Најниска понуда (€)']];
    phases.forEach(phase=>{
      const d=details[phase]||{};
      const phaseOffers=offers.filter(o=>String(o.phase||'').trim()===String(phase).trim());
      const amounts=phaseOffers.map(o=>moneyValue(o.amount)).filter(v=>v>0);
      summary.push([phase,d.status||'Планирано',moneyValue(d.budget),moneyValue(d.spent),phaseOffers.length,amounts.length?Math.min(...amounts):'']);
    });
    const wsSummary=XLSX.utils.aoa_to_sheet(summary);XLSX.utils.book_append_sheet(wb,wsSummary,'Резиме');styleSheet(wsSummary);

    phases.forEach(phase=>{
      const d=details[phase]||{};
      const phaseOffers=offers.filter(o=>String(o.phase||'').trim()===String(phase).trim());
      const rows=[
        ['Фаза',phase],
        ['Статус',d.status||'Планирано'],
        ['Почеток',d.start||''],
        ['Крај',d.end||''],
        ['Буџет (€)',moneyValue(d.budget)],
        ['Потрошено (€)',moneyValue(d.spent)],
        ['Забелешка',d.note||''],
        [],
        ['Понудувач','Износ (€)','Датум','Телефон','Статус','Забелешка']
      ];
      phaseOffers.forEach(o=>rows.push([o.supplier||'',moneyValue(o.amount),o.date||'',o.phone||'',o.status||'',o.note||'']));
      if(!phaseOffers.length)rows.push(['Нема внесени понуди.','','','','','']);
      const ws=XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb,ws,safeSheetName(phase,used));
      ws['!cols']=[{wch:28},{wch:18},{wch:16},{wch:18},{wch:18},{wch:35}];
      const headerRow=8;
      for(let c=0;c<6;c++){const cell=ws[XLSX.utils.encode_cell({r:headerRow,c})];if(cell)cell.s={font:{bold:true},fill:{fgColor:{rgb:'F3E8D0'}},alignment:{vertical:'center'}};}
      const ref=ws['!ref'];if(ref){const r=XLSX.utils.decode_range(ref);ws['!autofilter']={ref:`A${headerRow+1}:F${Math.max(headerRow+1,r.e.r+1)}`};}
    });

    // Keep a dedicated offers sheet so all suppliers and amounts are also visible together.
    const offerRows=[['Фаза','Понудувач','Износ (€)','Датум','Телефон','Статус','Забелешка']];
    phases.forEach(phase=>offers.filter(o=>String(o.phase||'').trim()===String(phase).trim()).forEach(o=>offerRows.push([phase,o.supplier||'',moneyValue(o.amount),o.date||'',o.phone||'',o.status||'',o.note||''])));
    const wsOffers=XLSX.utils.aoa_to_sheet(offerRows);XLSX.utils.book_append_sheet(wb,wsOffers,'Понуди');styleSheet(wsOffers);wsOffers['!cols']=[{wch:28},{wch:28},{wch:18},{wch:16},{wch:20},{wch:18},{wch:35}];

    return XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true});
  }
  async function sync(){
    if(busy)return;busy=true;setStatus('Синхронизација...','warn');setButtons(false);
    try{await ensureAuth();const folderId=await ensureFolder();const data=window.KK.getData();const json=JSON.stringify(data,null,2);const xlsx=makeXlsxBytes(data);await uploadFile(JSON_NAME,json,'application/json',folderId);await uploadFile(XLSX_NAME,new Blob([xlsx],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',folderId);const now=new Date().toLocaleString('mk-MK');const s=driveState();s.lastSync=now;setDriveState(s);setLastSync(now);setStatus('Синхронизирано','ok');}
    catch(e){console.error(e);setStatus('Грешка при sync','error');alert('Google Drive sync не успеа:\n'+e.message);}
    finally{busy=false;setButtons(!!accessToken);}
  }
  async function restore(){
    if(busy)return;busy=true;setStatus('Вчитување...','warn');setButtons(false);
    try{await ensureAuth();const folderId=await ensureFolder();const file=await findFile(JSON_NAME,folderId);if(!file)throw new Error('Kukja_Gradba_Data.json не е пронајден во Drive.');let d;
      // Read the JSON directly from Drive. This avoids the browser gapi media-response
      // shape differences that can return metadata instead of the JSON body.
      const r=await api(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,{headers:{Accept:'application/json'}});
      const text=await r.text();
      try{d=JSON.parse(text);}catch(e){throw new Error('Drive врати невалиден JSON backup.');}
      if(!d||typeof d!=='object'||!Array.isArray(d.budget)||!Array.isArray(d.expenses)||!Array.isArray(d.payments))throw new Error('Фајлот на Drive не е валиден backup.');
      if(!d.settings||typeof d.settings!=='object')d.settings={};
      if(!confirm('Да ги заменам локалните податоци со backup-от од Google Drive?'))return;
      window.KK.setData(d);const now=new Date().toLocaleString('mk-MK');setLastSync(now);setStatus('Вчитано од Drive','ok');}
    catch(e){console.error(e);setStatus('Грешка','error');alert('Не успеа вчитувањето од Drive:\n'+e.message);}finally{busy=false;setButtons(!!accessToken);}
  }
  function connect(){ensureAuth(true).catch(e=>{console.error(e);alert('Google Drive не може да се поврзе:\n'+e.message);});}
  async function downloadExcel(){
    if(busy)return;
    busy=true;setStatus('Преземање Excel...','warn');setButtons(false);
    try{
      await ensureAuth();
      const folderId=await ensureFolder();
      const file=await findFile(XLSX_NAME,folderId);
      if(!file)throw new Error('Kukja_Gradba.xlsx не е пронајден во Drive. Прво направи Sync.');
      const r=await api(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,{headers:{Accept:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=XLSX_NAME;
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1000);
      setStatus('Excel преземен','ok');
    }catch(e){
      console.error(e);setStatus('Грешка','error');alert('Не успеа преземањето на Excel од Drive:\n'+e.message);
    }finally{busy=false;setButtons(!!accessToken);}
  }
  window.KKDrive={sync,restore,connect,downloadExcel};
  document.addEventListener('DOMContentLoaded',()=>{ $('connectDrive')?.addEventListener('click',connect);$('syncDrive')?.addEventListener('click',sync);$('restoreDrive')?.addEventListener('click',restore);$('downloadDriveXlsx')?.addEventListener('click',downloadExcel);const s=driveState();if(s.lastSync)setLastSync(s.lastSync);if(s.connected)setStatus('Поврзан','ok');initGoogle().catch(console.error); });
})();
