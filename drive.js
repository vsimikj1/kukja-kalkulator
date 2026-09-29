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
  function setButtons(enabled){ if($('syncDrive'))$('syncDrive').disabled=!enabled||busy; if($('restoreDrive'))$('restoreDrive').disabled=!enabled||busy; }
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
    const paidFor=id=>(data.payments||[]).filter(p=>p.expenseId===id).reduce((s,p)=>s+(+p.amount||0),0);
    const planned=b=>b.choice==='CONTRACTOR'?(+b.contractor||0):((+b.material||0)+(+b.labor||0)+(+b.transport||0));
    const ex=(data.expenses||[]).map(x=>({Датум:x.date,Фаза:x.phase,Ставка:x.item,Добавувач:x.supplier,Количина:x.quantity,Единица:x.unit,Материјал:x.material,Работа:x.labor,Транспорт:x.transport,Вкупно:x.total,Платено:paidFor(x.id),Неплатено:(+x.total||0)-paidFor(x.id),Фактура:x.invoice,Забелешка:x.note}));
    const bu=(data.budget||[]).map(b=>({Фаза:b.phase,Ставка:b.item,Количина:b.qty,Единица:b.unit,'Директно + работа':(+b.material||0)+(+b.labor||0)+(+b.transport||0),'Понуда мајстор':b.contractor,Избрано:b.choice==='CONTRACTOR'?'Мајстор':'Директно',Планирано:planned(b),Забелешка:b.note}));
    const py=(data.payments||[]).map(p=>({Датум:p.date,Трошок:(data.expenses||[]).find(x=>x.id===p.expenseId)?.item||'',Рата:p.installment,Износ:p.amount,Начин:p.method,Забелешка:p.note}));
    const sum=[['Параметар','Вредност'],['Планиран буџет',(data.budget||[]).reduce((s,b)=>s+planned(b),0)],['Резерва %',data.settings?.reserve||0],['Реално потрошено',(data.expenses||[]).reduce((s,x)=>s+(+x.total||0),0)],['Платено',(data.expenses||[]).reduce((s,x)=>s+paidFor(x.id),0)]];
    const wb=XLSX.utils.book_new(); [['Трошоци',ex],['Буџет',bu],['Плаќања',py],['Резиме',sum]].forEach(([n,rows])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),n)); return XLSX.write(wb,{bookType:'xlsx',type:'array'});
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
  window.KKDrive={sync,restore,connect};
  document.addEventListener('DOMContentLoaded',()=>{ $('connectDrive')?.addEventListener('click',connect);$('syncDrive')?.addEventListener('click',sync);$('restoreDrive')?.addEventListener('click',restore);const s=driveState();if(s.lastSync)setLastSync(s.lastSync);if(s.connected)setStatus('Поврзан','ok');initGoogle().catch(console.error); });
})();
