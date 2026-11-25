const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
const daysLeft=d=>d?Math.round((new Date(d+'T00:00:00')-new Date().setHours(0,0,0,0))/864e5):null;
const stat=n=>n==null?'':n<0?['متأخر','bad']:n<=7?['قريب','warn']:['سليم','ok'];
const money=n=>Number(n||0).toLocaleString('ar-EG',{maximumFractionDigits:2});
const refs={};let cur=null,rows=[];
async function refMap(t){if(!refs[t]){const{data}=await sb.from(t).select('id,name').order('name');refs[t]=data||[]}return refs[t]}

async function boot(){
 if(!CONFIG.SUPABASE_URL){document.body.innerHTML='<p style="padding:30px">املأ js/config.js أولاً (URL و anon key).</p>';return}
 const{data}=await sb.auth.getSession();data.session?start():($('#login').hidden=false)}
$('#lf').onsubmit=async e=>{e.preventDefault();const{error}=await sb.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});
 error?$('#le').textContent='بيانات الدخول غير صحيحة':(location.reload())};
$('#out').onclick=async()=>{await sb.auth.signOut();location.reload()};

function start(){$('#login').hidden=true;$('#app').hidden=false;
 const nav=$('#nav');nav.innerHTML='<button data-id="dash">الملخص</button>'+TABLES.map(t=>`<button data-id="${t.id}">${esc(t.n)}</button>`).join('');
 nav.onclick=e=>e.target.dataset.id&&go(e.target.dataset.id);go('dash')}

function go(id){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
 $('#tools').innerHTML='';id==='dash'?dash():grid(TABLES.find(t=>t.id===id))}

async function dash(){$('#title').textContent='ملخص المتابعة';
 const[{data:due},{data:apps},{data:dl}]=await Promise.all([sb.from('v_due').select('*').order('due_date'),sb.from('apps').select('id,name'),sb.from('deliverables').select('app_id,status')]);
 const d=due||[],late=d.filter(r=>r.days_left<0),w7=d.filter(r=>r.days_left>=0&&r.days_left<=7),m30=d.filter(r=>r.days_left>=0&&r.days_left<=30);
 const sum=a=>a.reduce((s,r)=>s+Number(r.amount||0),0);
 const c=(l,v,k='')=>`<div class="card ${k}"><span>${l}</span><b>${v}</b></div>`;
 const prog=(apps||[]).map(a=>{const x=(dl||[]).filter(r=>r.app_id===a.id),p=x.length?Math.round(100*x.filter(r=>r.status==='تم الاستلام').length/x.length):0;
  return `<div><b>${esc(a.name)}</b> — ${p}%<div class="bar"><i style="width:${p}%"></i></div></div>`}).join('');
 $('#view').innerHTML=`<div class="cards">${c('بنود متأخرة',late.length,late.length?'bad':'')}${c('المبلغ المتأخر (ج.م)',money(sum(late)),late.length?'bad':'')}${c('مستحق خلال 7 أيام',w7.length,w7.length?'warn':'')}${c('مستحق خلال 30 يوم (ج.م)',money(sum(m30)),'warn')}</div>
 <div class="wrap"><table><tr><th>الفئة</th><th>البند</th><th>المبلغ</th><th>الاستحقاق</th><th>الأيام</th><th>الحالة</th></tr>${d.map(r=>{const s=stat(r.days_left);return `<tr><td>${esc(r.cat)}</td><td class="b">${esc(r.item)}</td><td>${money(r.amount)}</td><td>${esc(r.due_date)}</td><td>${r.days_left}</td><td><span class="badge ${s[1]}">${s[0]}</span></td></tr>`}).join('')||'<tr><td colspan="6">لا توجد استحقاقات مسجلة بعد</td></tr>'}</table></div>
 <div class="apps"><h3>نسبة استلام التطبيقات</h3>${prog}</div>`}

async function grid(t){cur=t;$('#title').textContent=t.n;
 for(const f of t.f) if(f.t==='ref') await refMap(f.ref);
 const{data,error}=await sb.from(t.id).select('*').order('created_at');if(error){$('#view').textContent=error.message;return}rows=data;
 $('#tools').innerHTML='<input id="q" placeholder="بحث..."><button id="add">+ إضافة</button>';
 $('#q').oninput=draw;$('#add').onclick=()=>form();draw()}

function cell(f,r){const v=r[f.k];
 if(f.due){const s=stat(daysLeft(v));return `<td class="${f.b?'b':''}">${esc(v)||''} ${s&&f.k!=='end_date'?`<span class="badge ${s[1]}">${s[0]}</span>`:''}</td>`}
 if(f.t==='bool')return `<td>${v?'نعم':'لا'}</td>`;
 if(f.t==='ref')return `<td class="b">${esc((refs[f.ref].find(a=>a.id===v)||{}).name)}</td>`;
 if(f.t==='num')return `<td class="${f.b?'b':''}">${v==null?'':money(v)}</td>`;
 return `<td class="${f.b?'b':''}">${esc(v)}</td>`}

function draw(){const t=cur,q=($('#q')?.value||'').trim(),fs=t.f.filter(f=>!f.h);
 const list=rows.filter(r=>!q||JSON.stringify(Object.values(r)).includes(q));
 $('#view').innerHTML=`<div class="wrap"><table><tr>${fs.map(f=>`<th>${esc(f.l)}</th>`).join('')}<th></th></tr>${list.map(r=>`<tr>${fs.map(f=>cell(f,r)).join('')}<td><button class="ed" data-e="${r.id}">تعديل</button> <button class="del" data-d="${r.id}">حذف</button></td></tr>`).join('')||`<tr><td colspan="${fs.length+1}">لا توجد بيانات</td></tr>`}</table></div>`;
 $('#view').onclick=async e=>{const b=e.target;if(b.dataset.e)form(rows.find(r=>r.id===b.dataset.e));
  if(b.dataset.d&&confirm('تأكيد الحذف؟')){const{error}=await sb.from(t.id).delete().eq('id',b.dataset.d);error?alert(error.message):grid(t)}}}

function input(f,v){const n=`name="${f.k}"${f.r?' required':''}`;
 if(f.t==='list')return `<select ${n}><option value="">—</option>${f.o.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
 if(f.t==='ref')return `<select ${n}><option value="">—</option>${refs[f.ref].map(o=>`<option value="${o.id}"${o.id===v?' selected':''}>${esc(o.name)}</option>`).join('')}</select>`;
 if(f.t==='bool')return `<input type="checkbox" name="${f.k}"${v?' checked':''}>`;
 if(f.t==='num')return `<input type="number" step="0.01" min="0" ${n} value="${esc(v)}">`;
 if(f.t==='date')return `<input type="date" min="2020-01-01" ${n} value="${esc(v)}">`;
 return `<input ${n} value="${esc(v)}">`}

function form(r){const t=cur;$('#df').innerHTML=`<h3>${r?'تعديل':'إضافة'} — ${esc(t.n)}</h3>${t.f.map(f=>`<label>${esc(f.l)}${f.r?' *':''}${input(f,r?.[f.k])}</label>`).join('')}<div class="row"><button value="ok">حفظ</button><button type="button" class="ghost" style="width:auto;margin:0" onclick="dlg.close()">إلغاء</button></div>`;
 $('#df').onsubmit=async e=>{e.preventDefault();const o={};
  t.f.forEach(f=>{const el=$('#df').elements[f.k];o[f.k]=f.t==='bool'?el.checked:el.value===''?null:f.t==='num'?Number(el.value):el.value});
  const q=r?sb.from(t.id).update(o).eq('id',r.id):sb.from(t.id).insert(o);const{error}=await q;
  error?alert('تعذر الحفظ: '+error.message):(dlg.close(),grid(t))};dlg.showModal()}
boot();
