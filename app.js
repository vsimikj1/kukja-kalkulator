// KK UI version 16.15 — Фази таб: само фази + Уреди/Избриши + Додај; без Ставка форма.
const DB='kukja-gradba-v2';
const BASE_PHASES=['Рушење и ископ','Карабина','Прозори и ролетни','Врати','Електрична инсталација','Водовод','Топлотна пумпа','Кошулица','Керамика','Фасада','Останати трошкови'];
const defaults={phases:[...BASE_PHASES],phaseDetails:{},grossArea:140,netArea:120,basementArea:50,basementHeight:2.4,levelHeight:2.7,otherHeight:3,reserve:10,eurRate:61.5,totalBudget:0,projectNote:'Нова куќа ~10×14 m, приземје, двоводен кров. Нов подрум околу 7×7 m. Старата куќа и стариот подрум се отстрануваат.'};
let data=load()||{settings:{...defaults,phases:[...BASE_PHASES],phaseDetails:{}},budget:[],expenses:[],payments:[],offers:[]};
let selectedPhase=(data.settings?.phases||BASE_PHASES)[0]||BASE_PHASES[0];
function getPhases(){const p=data?.settings?.phases;return Array.isArray(p)&&p.length?p:BASE_PHASES}
function load(){try{const d=JSON.parse(localStorage.getItem(DB)); if(!d)return null; const map={'Рушење':'Рушење и ископ','Ископ':'Рушење и ископ','Подрум':'Карабина','Темели':'Карабина','Конструкција':'Карабина','Ytong':'Карабина','Кров':'Карабина','Прозори и врати':'Прозори и ролетни','Инсталации':'Електрична инсталација','Завршни работи':'Керамика','Друго':'Останати трошкови'}; const fix=x=>{if(x&&map[x])x.phase=map[x];return x}; if(Array.isArray(d.budget))d.budget.forEach(fix); if(Array.isArray(d.expenses))d.expenses.forEach(fix); d.settings={...defaults,...(d.settings||{})}; d.settings.phases=Array.isArray(d.settings.phases)&&d.settings.phases.length?d.settings.phases:[...BASE_PHASES]; d.settings.phaseDetails=(d.settings.phaseDetails&&typeof d.settings.phaseDetails==='object')?d.settings.phaseDetails:{}; d.offers=Array.isArray(d.offers)?d.offers:[]; return d}catch{return null}}
function save(){localStorage.setItem(DB,JSON.stringify(data)); if(window.KK && window.KK.onDataChanged) window.KK.onDataChanged()}
const $=id=>document.getElementById(id), money=v=>new Intl.NumberFormat('mk-MK').format(Math.round(v||0))+' ден', eur=v=>'€ '+((v||0)/(+data.settings.eurRate||61.5)).toFixed(2), phaseEur=v=>'€ '+Number(v||0).toFixed(2), esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function init(){
 renderPhaseNavigation(); setSelectedPhase(selectedPhase);
 $('date').value=today();$('paymentDate').value=today();fillSettings();tabs();
 if($('expenseForm'))$('expenseForm').onsubmit=addExpense;if($('paymentForm'))$('paymentForm').onsubmit=addPayment;
 $('editTotalBudget').onclick=toggleTotalBudgetEditor;$('offersAddBudget').onclick=addOffer;$('saveTotalBudget').onclick=saveTotalBudget;$('autoTotalBudget').onclick=resetTotalBudgetAuto;
 $('usedBudgetCard').onclick=toggleExpenseDrilldown;$('closeExpenseModal').onclick=closeExpenseModal;$('offerPhaseFilter').onchange=renderOffers;$('usedBudgetCard').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleExpenseDrilldown()}};$('closeExpenseDrilldown').onclick=()=>{$('expenseDrilldown').hidden=true};
 if($('clearForm'))$('clearForm').onclick=clearExpense;if($('phaseEditForm'))$('phaseEditForm').onsubmit=savePhaseEdit;if($('offerEditForm'))$('offerEditForm').onsubmit=saveOffer;if($('closePhaseEdit'))$('closePhaseEdit').onclick=closePhaseEdit;if($('closeOfferEdit'))$('closeOfferEdit').onclick=closeOfferEdit;if($('closeOfferEdit2'))$('closeOfferEdit2').onclick=closeOfferEdit;if($('closePhaseEdit2'))$('closePhaseEdit2').onclick=closePhaseEdit;if($('closeOfferModal'))$('closeOfferModal').onclick=closeOfferModal;if($('addPhase'))$('addPhase').onclick=addPhase;if($('saveSettings'))$('saveSettings').onclick=saveSettings;if($('resetData'))$('resetData').onclick=resetAll;if($('exportCsv'))$('exportCsv').onclick=exportCsv;if($('exportXlsx'))$('exportXlsx').onclick=exportXlsx;if($('backupJson'))$('backupJson').onclick=backup;if($('importJson'))$('importJson').onchange=importJson;if($('randomData'))$('randomData').onclick=randomData;
 render();
}
window.KK={getData:()=>data,setData:(d)=>{data={settings:{...defaults,...(d?.settings||{})},budget:Array.isArray(d?.budget)?d.budget:[],expenses:Array.isArray(d?.expenses)?d.expenses:[],payments:Array.isArray(d?.payments)?d.payments:[],offers:Array.isArray(d?.offers)?d.offers:[]};data.settings.phases=Array.isArray(data.settings.phases)&&data.settings.phases.length?data.settings.phases:[...BASE_PHASES];data.settings.phaseDetails=(data.settings.phaseDetails&&typeof data.settings.phaseDetails==='object')?data.settings.phaseDetails:{};selectedPhase=getPhases()[0]||BASE_PHASES[0];save();fillSettings();renderPhaseNavigation();render()},save:save,onDataChanged:()=>{}};
function today(){return new Date().toISOString().slice(0,10)}
function tabs(){document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active');render()})}
function showTab(n){document.querySelector(`[data-tab="${n}"]`).click()}
function fillSettings(){Object.keys(defaults).forEach(k=>{if($(k))$(k).value=data.settings[k]})}
function setSelectedPhase(p){const list=getPhases();selectedPhase=list.includes(p)?p:(list[0]||BASE_PHASES[0]);const input=$('bPhase');if(input)input.value=selectedPhase;renderPhaseNavigation();const title=$('selectedPhaseTitle');if(title)title.textContent=selectedPhase;renderBudget()}
function phaseInfo(name){
 const d=data.settings.phaseDetails?.[name]||{};
 const planned=Number.isFinite(+d.budget)?+d.budget:data.budget.filter(b=>b.phase===name).reduce((s,b)=>s+budgetPlanned(b),0);
 const actual=Number.isFinite(+d.spent)?+d.spent:data.expenses.filter(x=>x.phase===name).reduce((s,x)=>s+(+x.total||0),0);
 return {name,status:d.status||'Планирано',start:d.start||'',end:d.end||'',budget:planned,spent:actual,note:d.note||''};
}
function renderPhaseNavigation(){
 const box=$('phaseTabs');if(!box)return;
 const list=getPhases();if(!list.includes(selectedPhase))selectedPhase=list[0]||BASE_PHASES[0];
 const cards=list.map((p,i)=>{
   const info=phaseInfo(p);
   const cls=info.status==='Завршено'?'status-done':info.status==='Во тек'?'status-progress':'status-planned';
   return `<div class="phase-tab ${p===selectedPhase?'active ':''}${cls}" data-phase-index="${i}">
      <button type="button" class="phase-select" data-select-phase="${i}"><span class="phase-card-name">${esc(p)}</span><span class="phase-card-meta">Буџет ${phaseEur(info.budget)} · Потрошено ${phaseEur(info.spent)}</span></button>
      <span class="phase-card-status">${esc(info.status)}</span>
      <div class="phase-card-actions"><button type="button" class="secondary small" data-edit-phase="${i}">Уреди</button><button type="button" class="danger small" data-delete-phase="${i}">Избриши</button></div>
   </div>`;
 }).join('');
 box.innerHTML=cards;
 box.querySelectorAll('[data-select-phase]').forEach(btn=>btn.onclick=()=>selectPhase(list[+btn.dataset.selectPhase]));
 box.querySelectorAll('[data-edit-phase]').forEach(btn=>btn.onclick=()=>editPhase(list[+btn.dataset.editPhase]));
 box.querySelectorAll('[data-delete-phase]').forEach(btn=>btn.onclick=()=>deletePhase(list[+btn.dataset.deletePhase]));
 // V15.8: every phase card explicitly exposes Edit/Delete controls.
 // Edit opens the full phase editor shown in the reference: name, status, start, end, budget, spent, note.
}
function selectPhase(p){setSelectedPhase(p)}
function addPhase(){
 const f=$('phaseEditForm');
 if(!f)return;
 $('phaseEditTitle').textContent='Нова фаза';
 $('phaseEditName').value='';
 $('phaseEditStatus').value='Планирано';
 $('phaseEditStart').value='';
 $('phaseEditEnd').value='';
 $('phaseEditBudget').value='';
 $('phaseEditSpent').value='';
 $('phaseEditNote').value='';
 f.dataset.mode='new';
 delete f.dataset.phase;
 $('phaseEditModal').hidden=false;
 setTimeout(()=>$('phaseEditName').focus(),50);
}
function ensurePhaseDetails(name){data.settings.phaseDetails=data.settings.phaseDetails||{};if(!data.settings.phaseDetails[name]){const planned=data.budget.filter(b=>b.phase===name).reduce((s,b)=>s+budgetPlanned(b),0);const actual=data.expenses.filter(x=>x.phase===name).reduce((s,x)=>s+(+x.total||0),0);data.settings.phaseDetails[name]={status:'Планирано',start:'',end:'',budget:planned,spent:actual,note:''};}return data.settings.phaseDetails[name];}
function editPhase(name){const d=ensurePhaseDetails(name);$('phaseEditTitle').textContent='Уреди фаза';$('phaseEditName').value=name;$('phaseEditStatus').value=d.status||'Планирано';$('phaseEditStart').value=d.start||'';$('phaseEditEnd').value=d.end||'';$('phaseEditBudget').value=d.budget??0;$('phaseEditSpent').value=d.spent??0;$('phaseEditNote').value=d.note||'';$('phaseEditForm').dataset.mode='edit';$('phaseEditForm').dataset.phase=name;$('phaseEditModal').hidden=false;}
function closePhaseEdit(){if($('phaseEditModal'))$('phaseEditModal').hidden=true}
function savePhaseEdit(e){
 e.preventDefault();
 const form=$('phaseEditForm');
 const mode=form.dataset.mode||'edit';
 const oldName=form.dataset.phase||'';
 const newName=$('phaseEditName').value.trim();
 if(!newName){alert('Внеси име на фазата.');return}
 const list=getPhases();
 if((mode==='new'||newName!==oldName)&&list.some(p=>p.toLocaleLowerCase()===newName.toLocaleLowerCase())){alert('Оваа фаза веќе постои.');return}
 const d={status:$('phaseEditStatus').value,start:$('phaseEditStart').value,end:$('phaseEditEnd').value,budget:+$('phaseEditBudget').value||0,spent:+$('phaseEditSpent').value||0,note:$('phaseEditNote').value.trim()};
 data.settings.phaseDetails=data.settings.phaseDetails||{};
 if(mode==='new'){
   data.settings.phases=[...list,newName];
   data.settings.phaseDetails[newName]=d;
   selectedPhase=newName;
 }else{
   delete data.settings.phaseDetails[oldName];
   data.settings.phaseDetails[newName]=d;
   data.settings.phases=list.map(p=>p===oldName?newName:p);
   if(oldName!==newName){data.budget.forEach(b=>{if(b.phase===oldName)b.phase=newName});data.expenses.forEach(x=>{if(x.phase===oldName)x.phase=newName});if(selectedPhase===oldName)selectedPhase=newName;}
 }
 save();
 closePhaseEdit();
 form.dataset.mode='edit';
 delete form.dataset.phase;
 setSelectedPhase(selectedPhase);
 render();
}
function deletePhase(name){const linkedBudget=data.budget.some(b=>b.phase===name),linkedExpenses=data.expenses.some(x=>x.phase===name);if(linkedBudget||linkedExpenses){alert('Фазата не може да се избрише бидејќи има поврзани буџетски ставки или трошоци. Прво премести ги во друга фаза.');return}if(!confirm(`Да се избрише фазата „${name}“?`))return;data.settings.phases=getPhases().filter(p=>p!==name);if(data.settings.phaseDetails)delete data.settings.phaseDetails[name];selectedPhase=getPhases()[0]||BASE_PHASES[0];save();renderPhaseNavigation();render();}

function saveSettings(){Object.keys(defaults).forEach(k=>{if(k==='phases')return;if(k==='projectNote')data.settings[k]=$(k).value;else if($(k))data.settings[k]=+$(k).value||0});save();render();alert('Параметрите се зачувани.')}
function budgetPlanned(b){return b.choice==='CONTRACTOR'?b.contractor:(b.material+b.labor+b.transport)}
function addExpense(e){e.preventDefault();const mat=+$('material').value||0,lab=+$('labor').value||0,tr=+$('transport').value||0;data.expenses.push({id:crypto.randomUUID(),date:$('date').value,phase:$('phase').value,budgetId:$('budgetRef').value,item:$('item').value.trim(),supplier:$('supplier').value.trim(),quantity:+$('quantity').value||0,unit:$('unit').value.trim(),material:mat,labor:lab,transport:tr,total:mat+lab+tr,status:$('status').value,paymentMethod:$('paymentMethod').value,deposit:+$('deposit').value||0,invoice:$('invoice').value.trim(),note:$('note').value.trim()});save();clearExpense();render();showTab('dashboard')}
function clearExpense(){$('expenseForm').reset();$('date').value=today();$('quantity').value=1;$('material').value=0;$('labor').value=0;$('transport').value=0;$('deposit').value=0}
function saveBudget(e){e.preventDefault();const b={id:$('budgetForm').dataset.edit||crypto.randomUUID(),phase:$('bPhase').value||selectedPhase,item:$('bItem').value.trim(),qty:+$('bQty').value||0,unit:$('bUnit').value.trim(),material:+$('bMat').value||0,labor:+$('bLabor').value||0,transport:+$('bTrans').value||0,contractor:+$('bContractor').value||0,choice:$('bChoice').value,note:$('bNote').value.trim()};const i=data.budget.findIndex(x=>x.id===b.id);i>=0?data.budget[i]=b:data.budget.push(b);save();clearBudgetForm();render()}
function clearBudgetForm(){$('budgetForm').reset();delete $('budgetForm').dataset.edit;$('bPhase').value=selectedPhase;$('bQty').value=1;$('bMat').value=0;$('bLabor').value=0;$('bTrans').value=0;$('bContractor').value=0;$('bChoice').value='DIRECT'}
function editBudget(id){const b=data.budget.find(x=>x.id===id);if(!b)return;setSelectedPhase(b.phase);Object.entries({bItem:b.item,bQty:b.qty,bUnit:b.unit,bMat:b.material,bLabor:b.labor,bTrans:b.transport,bContractor:b.contractor,bChoice:b.choice,bNote:b.note}).forEach(([k,v])=>$(k).value=v);$('bPhase').value=b.phase;$('budgetForm').dataset.edit=id;showTab('phases');$('budgetForm').scrollIntoView({behavior:'smooth',block:'start'})}
function deleteBudget(id){if(confirm('Да се избрише буџетската ставка?')){data.budget=data.budget.filter(x=>x.id!==id);save();render()}}
function deleteExpense(id){if(confirm('Да се избрише трошокот и поврзаните плаќања?')){data.expenses=data.expenses.filter(x=>x.id!==id);data.payments=data.payments.filter(x=>x.expenseId!==id);save();render()}}
function addPayment(e){e.preventDefault();const id=$('paymentExpense').value;if(!id)return;data.payments.push({id:crypto.randomUUID(),expenseId:id,installment:+$('installment').value||1,date:$('paymentDate').value,amount:+$('paymentAmount').value||0,method:$('payMethod').value,note:$('paymentNote').value.trim()});save();$('paymentForm').reset();$('paymentDate').value=today();render()}
function paidFor(id){return data.payments.filter(p=>p.expenseId===id).reduce((s,p)=>s+p.amount,0)}
function calculatedBudget(){const planned=data.budget.reduce((s,b)=>s+budgetPlanned(b),0);return planned*(1+(+data.settings.reserve||0)/100)}
function totalBudgetValue(){const manual=+data.settings.totalBudget||0;return manual>0?manual:calculatedBudget()}
function toggleTotalBudgetEditor(){const ed=$('totalBudgetEditor');ed.hidden=!ed.hidden;if(!ed.hidden){$('totalBudgetInput').value=+data.settings.totalBudget||Math.round(calculatedBudget());$('totalBudgetInput').focus()}}
function saveTotalBudget(){const v=+$('totalBudgetInput').value||0;if(v<=0){alert('Внеси сума поголема од 0.');return}data.settings.totalBudget=v;save();$('totalBudgetEditor').hidden=true;render()}
function resetTotalBudgetAuto(){data.settings.totalBudget=0;save();$('totalBudgetEditor').hidden=true;render()}
function toggleExpenseDrilldown(){const box=$('expenseDrilldown');box.hidden=!box.hidden;if(!box.hidden){renderDashboardExpenses();box.scrollIntoView({behavior:'smooth',block:'start'})}}
function renderDashboardExpenses(){const rows=data.expenses.slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || data.expenses.indexOf(b)-data.expenses.indexOf(a));$('dashboardExpenseTable').innerHTML=rows.length?rows.map(x=>{const p=paidFor(x.id),r=x.total-p;return `<tr class="clickable-row" onclick="openExpenseDetail('${x.id}')"><td>${esc(x.date)}</td><td>${esc(x.phase)}</td><td>${esc(x.item)}</td><td>${esc(x.supplier||'—')}</td><td>${money(x.total)}</td><td>${money(p)}</td><td>${money(r)}</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Нема внесени трошоци.</td></tr>'}
function render(){
 const planned=data.budget.reduce((s,b)=>s+budgetPlanned(b),0),actual=data.expenses.reduce((s,x)=>s+x.total,0),paid=data.expenses.reduce((s,x)=>s+paidFor(x.id),0),unpaid=actual-paid;
 const total=totalBudgetValue(),remaining=Math.max(0,total-actual),usedPct=total?actual/total*100:0;
 const phases=getPhases();
 const completed=phases.filter(p=>phaseInfo(p).status==='Завршено').length;
 const rate=+data.settings.eurRate||61.5;
 const fmtEur=v=>'€ '+(v/rate).toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:0});
 const setText=(id,v)=>{const el=$(id);if(el)el.textContent=v};
 setText('summaryCompleted',`${completed} од ${phases.length}`);
 setText('summaryBudget',fmtEur(total));
 setText('summarySpent',fmtEur(actual));
 setText('summaryRemaining',fmtEur(remaining));
 const gp=$('globalProgressBar');if(gp)gp.style.width=Math.min(100,Math.max(0,usedPct))+'%';

 $('totalBudget').textContent=money(total);$('usedBudget').textContent=money(actual);$('remainingBudget').textContent=money(remaining);$('paidCost').textContent=money(paid);$('unpaidCost').textContent=money(unpaid);$('usedBudgetEur').textContent=eur(actual)+' · кликни за трошоци';$('progressText').textContent=Math.min(100,usedPct).toFixed(0)+'%';$('budgetUsedPercent').textContent=usedPct.toFixed(0)+'%';$('budgetUsedBar').style.width=Math.min(100,usedPct)+'%';$('totalBudgetHint').textContent=(+data.settings.totalBudget||0)>0?'рачно внесен буџет':'автоматски од буџетот + резерва';
 const donutPct=Math.min(100,Math.max(0,usedPct)),remainPct=Math.max(0,100-donutPct);$('budgetDonut').style.background=`conic-gradient(#ef4444 0 ${donutPct}%, #22c55e ${donutPct}% 100%)`;$('donutPercent').textContent=usedPct.toFixed(0)+'%';$('donutUsed').textContent=money(actual);$('donutRemaining').textContent=money(remaining);$('donutTotal').textContent=money(total);
 renderPhaseNavigation();renderBudget();renderPhaseChart();renderRecent();renderExpenses();renderPayments();renderRefs();renderOffers();renderDashboardExpenses();
}
function renderBudget(){if(!$('budgetTable'))return;const actualBy={};data.expenses.forEach(x=>actualBy[x.budgetId]=(actualBy[x.budgetId]||0)+x.total);const rows=data.budget.filter(b=>b.phase===selectedPhase);$('budgetTable').innerHTML=rows.length?rows.map(b=>{const d=b.material+b.labor+b.transport,v=budgetPlanned(b),a=actualBy[b.id]||0;return `<tr><td>${esc(b.phase)}</td><td>${esc(b.item)}</td><td>${b.qty} ${esc(b.unit)}</td><td>${money(d)}</td><td>${money(b.contractor)}</td><td>${b.choice==='CONTRACTOR'?'Мајстор':'Директно'}</td><td>${money(v)}</td><td>${money(a)}</td><td>${money(v-a)}</td><td><button class="secondary" onclick="editBudget('${b.id}')">Уреди</button> <button class="danger small" onclick="deleteBudget('${b.id}')">×</button></td></tr>`}).join(''):'<tr><td colspan="10" class="empty">Нема буџетски ставки.</td></tr>'}
function formatOfferAmount(v){return new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(v||0))+' €'}
function renderOffers(){
 const phases=getPhases();
 const filter=$('offerPhaseFilter');
 const list=$('offersList');
 if(!filter||!list)return;
 const selected=filter.value||'';
 filter.innerHTML='<option value="">Сите фази</option>'+phases.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 filter.value=phases.includes(selected)?selected:'';
 const all=data.offers||[];
 const visiblePhases=filter.value?[filter.value]:phases;
 const lowestByPhase={};
 phases.forEach(phase=>{
   const phaseOffers=all.filter(o=>o.phase===phase && Number.isFinite(Number(o.amount)));
   if(phaseOffers.length) lowestByPhase[phase]=Math.min(...phaseOffers.map(o=>Number(o.amount)||0));
 });
 const groups=visiblePhases.map(phase=>({
   phase,
   offers:all.filter(o=>o.phase===phase).slice().reverse()
 })).filter(g=>g.offers.length);
 if(!groups.length){list.innerHTML='<div class="empty">Нема понуди за избраната фаза.</div>';return;}
 list.innerHTML=groups.map(g=>{
   const phaseOffersCount=g.offers.length;
   const rows=g.offers.map(o=>{
     const amount=Number(o.amount||0);
     const isLowest=lowestByPhase[o.phase]!==undefined && amount===lowestByPhase[o.phase] && phaseOffersCount>1;
     return `<div class="offer-item">
       <div class="offer-item-main">
         <div class="offer-item-info">
           <strong class="offer-supplier">${esc(o.supplier||'Без внесен мајстор / добавувач')}</strong>
           <div class="offer-card-meta"><span>${esc(o.status||'Примена')} · ${esc(o.date||'—')}</span>${o.phone?`<span>☎ ${esc(o.phone)}</span>`:''}</div>
           ${o.note?`<div class="offer-card-note">${esc(o.note)}</div>`:''}
         </div>
         <div class="offer-item-right">
           <div class="offer-amount ${isLowest?'offer-lowest':''}">${formatOfferAmount(amount)}${isLowest?' <span class="offer-lowest-label">· најниска</span>':''}</div>
         </div>
       </div>
       <div class="offer-card-actions">
         <button type="button" class="secondary small" onclick="editOffer('${o.id}')">Уреди</button>
         <button type="button" class="danger small" onclick="deleteOffer('${o.id}')">Избриши</button>
       </div>
     </div>`;
   }).join('');
   return `<div class="offer-phase-section">
     <h2 class="offer-phase-title">${esc(g.phase)}</h2>
     <div class="offer-items">${rows}</div>
   </div>`;
 }).join('');
}
function addOffer(){
 const phases=getPhases();
 $('offerEditTitle').textContent='Нова понуда';
 $('offerEditPhase').innerHTML=phases.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 $('offerEditPhase').value=filterOfferPhaseForNew();
 $('offerEditSupplier').value='';
 $('offerEditAmount').value='';
 $('offerEditDate').value=today();
 $('offerEditPhone').value='';
 $('offerEditStatus').value='Примена';
 $('offerEditNote').value='';
 delete $('offerEditForm').dataset.edit;
 $('offerEditModal').hidden=false;
}
function editOffer(id){
 const o=(data.offers||[]).find(x=>x.id===id); if(!o)return;
 const phases=getPhases();
 $('offerEditTitle').textContent='Уреди понуда';
 $('offerEditPhase').innerHTML=phases.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
 $('offerEditPhase').value=o.phase||phases[0]||'';
 $('offerEditSupplier').value=o.supplier||'';
 $('offerEditAmount').value=o.amount??'';
 $('offerEditDate').value=o.date||'';
 $('offerEditPhone').value=o.phone||'';
 $('offerEditStatus').value=o.status||'Примена';
 $('offerEditNote').value=o.note||'';
 $('offerEditForm').dataset.edit=id;
 $('offerEditModal').hidden=false;
}
function filterOfferPhaseForNew(){const f=$('offerPhaseFilter');const v=f?.value||'';return getPhases().includes(v)?v:(getPhases()[0]||'')}
function closeOfferEdit(){$('offerEditModal').hidden=true}
function saveOffer(e){
 e.preventDefault();
 const form=$('offerEditForm');
 const id=form.dataset.edit||'';
 const o={id:id||crypto.randomUUID(),phase:$('offerEditPhase').value,supplier:$('offerEditSupplier').value.trim(),amount:Number($('offerEditAmount').value||0),date:$('offerEditDate').value,phone:$('offerEditPhone').value.trim(),status:$('offerEditStatus').value,note:$('offerEditNote').value.trim()};
 data.offers=data.offers||[];
 const i=data.offers.findIndex(x=>x.id===o.id);
 if(i>=0)data.offers[i]=o;else data.offers.push(o);
 save(); delete form.dataset.edit; closeOfferEdit(); renderOffers();
}
function deleteOffer(id){
 const o=(data.offers||[]).find(x=>x.id===id); if(!o)return;
 if(!confirm(`Да се избрише понудата од „${o.supplier||'Без внесен мајстор / добавувач'}“?`))return;
 data.offers=data.offers.filter(x=>x.id!==id); save(); renderOffers();
}

function openOfferDetail(id){const b=data.budget.find(v=>v.id===id);if(!b)return;const direct=b.material+b.labor+b.transport,diff=direct-b.contractor,actual=data.expenses.filter(x=>x.budgetId===id).reduce((s,x)=>s+x.total,0);$('offerDetail').innerHTML=`<div class="detail-grid"><div class="detail-item"><span>Фаза</span><strong>${esc(b.phase)}</strong></div><div class="detail-item"><span>Ставка</span><strong>${esc(b.item)}</strong></div><div class="detail-item"><span>Количина</span><strong>${b.qty||0} ${esc(b.unit||'')}</strong></div><div class="detail-item"><span>Директен материјал</span><strong>${money(b.material)}</strong></div><div class="detail-item"><span>Работа</span><strong>${money(b.labor)}</strong></div><div class="detail-item"><span>Транспорт</span><strong>${money(b.transport)}</strong></div><div class="detail-item"><span>Директно + работа</span><strong>${money(direct)}</strong></div><div class="detail-item"><span>Понуда од мајстор</span><strong>${money(b.contractor)}</strong></div><div class="detail-item"><span>Разлика</span><strong>${diff>=0?'+':''}${money(diff)}</strong></div><div class="detail-item"><span>Избрано</span><strong>${b.choice==='CONTRACTOR'?'Мајстор':'Директно'}</strong></div><div class="detail-item"><span>Реално потрошено</span><strong>${money(actual)}</strong></div></div><div class="section-card"><h3>Забелешка</h3><p>${esc(b.note||'Нема забелешка.')}</p></div><div class="modal-actions"><button class="primary" onclick="editOfferFromModal('${b.id}')">Уреди понуда</button><button class="secondary" onclick="closeOfferModal()">Затвори</button></div>`;$('offerModal').hidden=false}
function editOfferFromModal(id){closeOfferModal();editBudget(id)}
function editBudgetKeepOffers(id){editBudget(id)}
function closeOfferModal(){$('offerModal').hidden=true}

function renderPhaseChart(){
 const colors=['#4f46e5','#0891b2','#16a34a','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0f766e','#ea580c','#2563eb','#65a30d','#9333ea'];
 const filter=$('dashboardPhaseFilter');
 const phases=getPhases();
 if(filter){
   const selected=filter.value||'';
   filter.innerHTML='<option value="">Сите фази</option>'+phases.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');
   filter.value=phases.includes(selected)?selected:'';
   filter.onchange=()=>renderPhaseChart();
 }
 const selected=filter?.value||'';
 if(!selected){$('phaseChart').innerHTML='';return;}
 const visiblePhases=[selected];
 const rows=visiblePhases.map((p,i)=>{
   const info=phaseInfo(p);
   return {p,status:info.status,planned:info.budget,actual:info.spent,color:colors[phases.indexOf(p)%colors.length]};
 }).filter(x=>x.planned||x.actual);
 if(!rows.length){$('phaseChart').innerHTML='<div class="empty">Нема внесен буџет или потрошено за избраната фаза.</div>';return;}
 const max=Math.max(...rows.flatMap(x=>x.status==='Завршено'?[x.planned,x.actual]:[x.planned]),1);
 $('phaseChart').innerHTML=rows.map(x=>{
   const completed=x.status==='Завршено';
   const pw=x.planned/max*100;
   const aw=completed?x.actual/max*100:0;
   const pct=completed&&x.planned?Math.min(100,x.actual/x.planned*100):0;
   return `<div class="chart-row"><div class="chart-label"><span>${esc(x.p)}</span><strong>${completed?money(x.actual):money(x.planned)}</strong></div><div class="chart-bars"><div class="chart-bar planned" style="width:${pw}%"><span>Буџет: ${money(x.planned)}</span></div>${completed?`<div class="chart-bar actual" style="width:${aw}%;background:${x.color}"><span>Потрошено: ${money(x.actual)}</span></div>`:''}</div><div class="chart-meta">${completed?`<span>${pct.toFixed(0)}% од фазниот буџет</span><span>Останува: ${money(x.planned-x.actual)}</span>`:`<span>Фаза: ${esc(x.status)}</span>`}</div></div>`
 }).join('');
}
function renderRecent(){
 const box=$('recentExpenses');
 if(!box)return;
 const rows=getPhases().map((p,index)=>{
   const info=phaseInfo(p);
   return {p,info,index};
 }).filter(x=>x.info.status==='Завршено' && Number(x.info.spent||0)>0)
   .sort((a,b)=>{
     const ad=String(a.info.end||'');
     const bd=String(b.info.end||'');
     return bd.localeCompare(ad)||b.index-a.index;
   });
 box.innerHTML=rows.length?rows.map(x=>`<div class="phase-row clickable-row"><div class="phase-line"><span><strong>${esc(x.p)}</strong><br><span class="muted">Фаза: Завршено</span></span><strong>${money(x.info.spent)}</strong></div></div>`).join(''):'<div class="empty">Нема завршени фази со внесен трошок.</div>';
}

function renderRefs(){$('budgetRef').innerHTML='<option value="">-- без врска --</option>'+data.budget.map(b=>`<option value="${b.id}">${esc(b.phase)} – ${esc(b.item)}</option>`).join('');$('paymentExpense').innerHTML=data.expenses.map(x=>`<option value="${x.id}">${x.date} – ${esc(x.item)} (${money(x.total)})</option>`).join('')||'<option value="">Нема трошоци</option>'}
function openExpenseDetail(id){const x=data.expenses.find(e=>e.id===id);if(!x)return;const p=paidFor(id),r=x.total-p,ps=data.payments.filter(v=>v.expenseId===id).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));const b=data.budget.find(v=>v.id===x.budgetId);$('expenseDetail').innerHTML=`<div class="detail-grid"><div class="detail-item"><span>Датум</span><strong>${esc(x.date)}</strong></div><div class="detail-item"><span>Фаза</span><strong>${esc(x.phase)}</strong></div><div class="detail-item"><span>Ставка</span><strong>${esc(x.item)}</strong></div><div class="detail-item"><span>Добавувач / мајстор</span><strong>${esc(x.supplier||'—')}</strong></div><div class="detail-item"><span>Материјал</span><strong>${money(x.material)}</strong></div><div class="detail-item"><span>Работа</span><strong>${money(x.labor)}</strong></div><div class="detail-item"><span>Транспорт</span><strong>${money(x.transport)}</strong></div><div class="detail-item"><span>Вкупно</span><strong>${money(x.total)}</strong></div><div class="detail-item"><span>Платено</span><strong>${money(p)}</strong></div><div class="detail-item"><span>Останува</span><strong>${money(r)}</strong></div><div class="detail-item"><span>Фактура / сметка</span><strong>${esc(x.invoice||'—')}</strong></div><div class="detail-item"><span>Буџетска ставка</span><strong>${esc(b?b.item:'Без врска')}</strong></div></div><div class="section-card"><h3>Плаќања</h3><div class="table-wrap"><table><thead><tr><th>Датум</th><th>Рата</th><th>Износ</th><th>Начин</th><th>Забелешка</th></tr></thead><tbody>${ps.length?ps.map(v=>`<tr><td>${esc(v.date)}</td><td>${v.installment}</td><td>${money(v.amount)}</td><td>${esc(v.method)}</td><td>${esc(v.note||'')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Нема внесени плаќања.</td></tr>'}</tbody></table></div></div><div class="section-card"><h3>Забелешка</h3><p>${esc(x.note||'Нема забелешка.')}</p></div>`;$('expenseModal').hidden=false}
function closeExpenseModal(){$('expenseModal').hidden=true}
function renderExpenses(){$('expenseTable').innerHTML=data.expenses.length?data.expenses.slice().reverse().map(x=>{const p=paidFor(x.id),r=x.total-p;return `<tr><td>${x.date}</td><td>${esc(x.phase)}</td><td>${esc(x.item)}</td><td>${money(x.total)}</td><td>${money(p)}</td><td>${money(r)}</td><td><button class="danger small" onclick="deleteExpense('${x.id}')">Избриши</button></td></tr>`}).join(''):'<tr><td colspan="7" class="empty">Нема трошоци.</td></tr>'}
function renderPayments(){$('paymentTable').innerHTML=data.payments.length?data.payments.slice().reverse().map(p=>{const x=data.expenses.find(e=>e.id===p.expenseId);return `<tr><td>${p.date}</td><td>${esc(x?.item||'избришан трошок')}</td><td>${p.installment}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td><button class="danger small" onclick="deletePayment('${p.id}')">Избриши</button></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">Нема плаќања.</td></tr>'}
function deletePayment(id){data.payments=data.payments.filter(x=>x.id!==id);save();render()}
function backup(){download('Kukja_Gradba_Backup.json',JSON.stringify(data,null,2),'application/json')}
function importJson(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.settings||!Array.isArray(x.budget)||!Array.isArray(x.expenses)||!Array.isArray(x.payments))throw Error();data=x;save();fillSettings();render();alert('Backup успешно внесен.')}catch{alert('Невалиден backup JSON.')}};r.readAsText(f)}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportCsv(){const h=['Датум','Фаза','Ставка','Добавувач','Количина','Единица','Материјал','Работа','Транспорт','Вкупно','Платено','Останува','Фактура'];const r=data.expenses.map(x=>[x.date,x.phase,x.item,x.supplier,x.quantity,x.unit,x.material,x.labor,x.transport,x.total,paidFor(x.id),x.total-paidFor(x.id),x.invoice]);download('Kukja_Gradba_Trosoci.csv','\uFEFF'+[h,...r].map(a=>a.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\n'),'text/csv;charset=utf-8')}
function exportXlsx(){if(!window.XLSX){alert('Excel библиотеката не е достапна. Провери интернет конекција.');return}const wb=XLSX.utils.book_new();const ex=data.expenses.map(x=>({Датум:x.date,Фаза:x.phase,Ставка:x.item,Добавувач:x.supplier,Количина:x.quantity,Единица:x.unit,Материјал:x.material,Работа:x.labor,Транспорт:x.transport,Вкупно:x.total,Платено:paidFor(x.id),Неплатено:x.total-paidFor(x.id),Фактура:x.invoice,Забелешка:x.note}));const bu=data.budget.map(b=>({Фаза:b.phase,Ставка:b.item,Количина:b.qty,Единица:b.unit,'Директно + работа':b.material+b.labor+b.transport,'Понуда мајстор':b.contractor,Избрано:b.choice==='CONTRACTOR'?'Мајстор':'Директно',Планирано:budgetPlanned(b),Забелешка:b.note}));const py=data.payments.map(p=>({Датум:p.date,Трошок:data.expenses.find(x=>x.id===p.expenseId)?.item||'',Рата:p.installment,Износ:p.amount,Начин:p.method,Забелешка:p.note}));const sum=[['Параметар','Вредност'],['Планиран буџет',data.budget.reduce((s,b)=>s+budgetPlanned(b),0)],['Резерва %',data.settings.reserve],['Реално потрошено',data.expenses.reduce((s,x)=>s+x.total,0)],['Платено',data.expenses.reduce((s,x)=>s+paidFor(x.id),0)]];[['Трошоци',ex],['Буџет',bu],['Плаќања',py],['Резиме',sum]].forEach(([n,rows])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),n));XLSX.writeFile(wb,'Kukja_Gradba.xlsx')}
function randomData(){if(!confirm('Да додадам тест буџет, трошоци и плаќања?'))return;const names=['Бетон C25/30','Арматура B500','Ископ','Ytong 25 cm','Дрвена кровна конструкција','Керамички ќерамиди','Песок и тампон','Хидроизолација','Прозори'];for(let i=0;i<names.length;i++){const p=getPhases()[(i+1)%Math.min(8,getPhases().length)],mat=Math.round((50000+Math.random()*250000)/1000)*100,lab=Math.round((20000+Math.random()*100000)/1000)*100,con=Math.round((mat+lab)*(0.9+Math.random()*0.35));data.budget.push({id:crypto.randomUUID(),phase:p,item:names[i],qty:Math.round((1+Math.random()*20)*10)/10,unit:i%2?'m²':'m³',material:mat,labor:lab,transport:Math.round(Math.random()*30000/100)*100,contractor:con,choice:i%3===0?'CONTRACTOR':'DIRECT',note:'TEST'});const b=data.budget.at(-1);const total=budgetPlanned(b);const eid=crypto.randomUUID();data.expenses.push({id:eid,date:new Date(Date.now()-i*86400000).toISOString().slice(0,10),phase:p,budgetId:b.id,item:names[i],supplier:'TEST MAJSTOR',quantity:b.qty,unit:b.unit,material:b.choice==='CONTRACTOR'?0:b.material,labor:b.choice==='CONTRACTOR'?total:b.labor,transport:b.choice==='CONTRACTOR'?0:b.transport,total,status:i%3?'ДА':'НЕ',paymentMethod:'Банка',deposit:0,invoice:'TEST-'+(100+i),note:'TEST'});if(i%3){data.payments.push({id:crypto.randomUUID(),expenseId:eid,installment:1,date:today(),amount:Math.round(total*0.5),method:'Банка',note:'TEST аванс/плаќање'})}}save();render();alert('Додадени се random тест податоци.')}
function resetAll(){if(confirm('Ќе се избришат буџет, трошоци, плаќања и параметри. Сигурен си?')){data={settings:{...defaults,phases:[...BASE_PHASES],phaseDetails:{}},budget:[],expenses:[],payments:[],offers:[]};selectedPhase=BASE_PHASES[0];save();fillSettings();renderPhaseNavigation();render()}}


window.addEventListener('error',e=>{if(String(e?.message||'').includes('innerHTML')) console.error('KK render DOM error:',e.message,e.filename,e.lineno,e.colno);});
// Start application
init();
