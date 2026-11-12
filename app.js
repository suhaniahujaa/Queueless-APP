'use strict';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const activeStatuses = ['requested','waiting','serving'];
const statusNames = {requested:'Awaiting confirmation',waiting:'Waiting',serving:'Your turn',completed:'Completed',cancelled:'Cancelled'};
let currentUser = null, bookings = [], notifications = [], customerCount = 0, authMode = 'login';
let currentProvider = null, appointmentTab = 'upcoming', activeView = 'dashboard', pollTimer, refreshing = false, lastSnapshot = '', seenEvents = new Set(), initialEvents = true;
let appToday = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const mobileQuery = matchMedia('(max-width: 900px)');

async function api(path, data) {
  let response;
  try { response = await fetch(new URL('api/'+path, document.baseURI), {method:data === undefined?'GET':'POST', credentials:'same-origin', cache:'no-store', headers:data === undefined?{}:{'Content-Type':'application/json'}, body:data === undefined?undefined:JSON.stringify(data)}); }
  catch { throw new Error('Cannot reach QueueLess. Keep the Java server running and check your connection.'); }
  let payload;
  try { payload = await response.json(); } catch { throw new Error('Start QueueLess using run.bat, then open http://localhost:8090. This version needs its Java server.'); }
  if (!response.ok) { const error = new Error(payload.error || 'Could not complete this request.'); error.status=response.status; throw error; }
  return payload;
}
function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500); }
function setAuthMode(mode) {
  authMode=mode; const signup=mode==='signup', staff=mode==='staff';
  $('auth-error').textContent=''; $('login-tab').classList.toggle('active',mode==='login'); $('signup-tab').classList.toggle('active',signup);
  $('auth-title').textContent=staff?'Hello, team.':signup?'Make yourself at home.':'Welcome back.';
  $('auth-subtitle').textContent=staff?'Enter the staff access key printed in your Java window.':signup?'A few details. A little less waiting.':'Your appointments, all in one lovely place.';
  $('auth-submit').textContent=(staff?'Open team workspace':signup?'Create my account':'Log in')+' →';
  $('auth-fields').innerHTML=staff?'<label>STAFF ACCESS KEY<input id="staff-key" type="password" autocomplete="off" required maxlength="256" placeholder="Key from the Java server window"></label>':
    (signup?'<div class="signup-grid"><label>FULL NAME<input id="full-name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Your full name"></label><label>MOBILE NUMBER<input id="phone" type="tel" autocomplete="tel" required maxlength="32" placeholder="10-digit mobile number"></label></div>':'')+
    '<label>EMAIL ADDRESS<input id="email" type="email" autocomplete="email" required maxlength="160" placeholder="you@example.com"></label><label>PASSWORD<input id="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required '+(signup?'minlength="8" ':'')+'maxlength="256" placeholder="'+(signup?'At least 8 characters':'Your password')+'"></label>'+
    (signup?'<p class="signup-note">Staff use your phone to contact you about your appointments. WhatsApp reminders are optional in settings.</p>':'');
}
async function submitAuth() {
  const button=$('auth-submit'); button.disabled=true; $('auth-error').textContent='';
  const email=($('email')?.value||'').trim().toLowerCase(), password=$('password')?.value||'';
  try {
    const result=authMode==='staff'?await api('staff-login',{key:$('staff-key').value.trim()}):await api(authMode==='signup'?'register':'login',{email,password,name:$('full-name')?.value.trim(),phone:$('phone')?.value.trim()});
    await openApp(result.user); toast('Welcome, '+result.user.name+' ♡');
  } catch(error) {
    // v3 accounts existed only in this browser. Help their owner upgrade without erasing them.
    let legacy;
    try { legacy=JSON.parse(localStorage.getItem('queuelessShowcaseUsers')||'[]').find(u=>u.email===email&&u.password===password); } catch {}
    if(authMode==='login'&&error.status===401&&legacy) {
      setAuthMode('signup'); $('full-name').value=legacy.name||''; $('email').value=email; $('password').value=password;
      $('auth-error').textContent='Your older account was saved only in this browser. Add your phone and create it once on the new server.';
    } else $('auth-error').textContent=error.message;
  } finally { button.disabled=false; }
}
async function openApp(user) {
  currentUser=user; bookings=[]; notifications=[]; lastSnapshot=''; seenEvents=new Set(); initialEvents=true;
  $('auth-screen').classList.add('hidden'); $('app-shell').classList.remove('hidden'); $('support-fab').classList.remove('hidden');
  document.querySelectorAll('.staff-only').forEach(n=>n.classList.toggle('hidden',user.role!=='admin'));
  document.querySelectorAll('.customer-only').forEach(n=>n.classList.toggle('hidden',user.role==='admin'));
  renderIdentity(); fillProfile(); setSidebar(!mobileQuery.matches,false); showView(user.role==='admin'?'staff':'dashboard');
  clearInterval(pollTimer); await refreshData(); pollTimer=setInterval(()=>{if(!document.hidden&&currentUser) refreshData();},5000);
}
function renderIdentity() {
  const initials=currentUser.name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  ['top-name','side-name','settings-name','booking-name'].forEach(id=>$(id).textContent=currentUser.name);
  ['top-avatar','side-avatar','settings-avatar','booking-avatar'].forEach(id=>$(id).textContent=initials);
  ['top-role','side-role'].forEach(id=>$(id).textContent=currentUser.role==='admin'?'Team workspace':'My profile & settings');
  const city=currentUser.city||'Choose your location'; $('top-location').textContent=city; $('side-location').textContent=city;
  $('hero-action').textContent=currentUser.role==='admin'?'Open the staff console ↗':'Find your next appointment ↗';
}
async function signOut() {
  try { await api('logout',{}); } catch(error) { toast(error.message); return; }
  clearInterval(pollTimer); closeSidebar(false); closeBooking(); closeLocation(); closeSupport(); currentUser=null; bookings=[]; notifications=[];
  $('app-shell').classList.add('hidden'); $('support-fab').classList.add('hidden'); $('auth-screen').classList.remove('hidden'); setAuthMode('login'); toast('Signed out. See you soon ♡');
}
function openMyAccount() { showView(currentUser.role==='admin'?'staff':'settings'); }
function openMainAction() { showView(currentUser.role==='admin'?'staff':'discover'); }
function showView(view) {
  if(!currentUser) return;
  if(currentUser.role!=='admin'&&['admin','staff'].includes(view)) return;
  if(currentUser.role==='admin'&&['discover','appointments','settings','notifications','queue'].includes(view)) view='staff';
  activeView=view; document.querySelectorAll('.page-view').forEach(n=>n.classList.toggle('active-page',n.id===view+'-view'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const titles={dashboard:'Hello, '+currentUser.name.split(' ')[0]+' ♡',discover:'Find your kind of care',appointments:'My appointments',queue:'Your live queue',settings:'My profile & settings',notifications:'Your notifications',staff:'Staff console',admin:'Admin dashboard'};
  $('page-title').textContent=titles[view]; const drawerWasOpen=mobileQuery.matches&&!$('sidebar').hidden; if(mobileQuery.matches)closeSidebar(false);
  if(drawerWasOpen){$('page-title').tabIndex=-1;$('page-title').focus({preventScroll:true});}
  if(view==='discover') renderProviders(); if(view==='settings') fillProfile(); if(view==='staff') renderStaff(); if(view==='admin') renderAdmin();
  window.scrollTo({top:0,behavior:'instant'});
}

// The native hidden attribute is authoritative at EVERY viewport width.
// Wide phones and desktop-site mode must also be able to close the sidebar.
function setSidebar(open,restoreFocus=true) {
  open=Boolean(open); const sidebar=$('sidebar'), modal=open&&mobileQuery.matches;
  $('main-content').inert=modal; $('support-fab').inert=modal;
  if(!open&&restoreFocus&&!$('app-shell').classList.contains('hidden'))$('menu-toggle').focus({preventScroll:true});
  sidebar.hidden=!open; sidebar.inert=!open;
  sidebar.classList.toggle('open',open); document.body.classList.toggle('drawer-open',modal);
  $('menu-toggle').setAttribute('aria-expanded',String(open)); $('menu-toggle').setAttribute('aria-label',open?'Close menu':'Open menu');
  $('sidebar-backdrop').hidden=!modal; sidebar.setAttribute('aria-hidden',String(!open));
  if(modal) { sidebar.setAttribute('role','dialog'); sidebar.setAttribute('aria-modal','true'); $('sidebar-close').focus(); }
  else { sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); }
}
function toggleSidebar() { setSidebar($('sidebar').hidden); }
function closeSidebar(restoreFocus=true) { setSidebar(false,restoreFocus); }
$('menu-toggle').addEventListener('click',toggleSidebar);
$('sidebar-close').addEventListener('click',()=>closeSidebar());
$('sidebar-backdrop').addEventListener('click',()=>closeSidebar());
mobileQuery.addEventListener('change',()=>setSidebar(!mobileQuery.matches,false));
let touchStartX=0,touchStartY=0;
$('sidebar').addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0].clientX;touchStartY=e.changedTouches[0].clientY;},{passive:true});
$('sidebar').addEventListener('touchend',e=>{const t=e.changedTouches[0];if(touchStartX-t.clientX>65&&Math.abs(touchStartY-t.clientY)<60)closeSidebar();},{passive:true});
function trapFocus(event,container) { const nodes=[...container.querySelectorAll('button,a,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length); if(!nodes.length)return; const first=nodes[0],last=nodes.at(-1); if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} }
document.addEventListener('keydown',event=>{
  const modal=document.querySelector('.modal-backdrop.show');
  if(event.key==='Escape') { if(modal) {closeBooking();closeLocation();} else if($('support-chat').classList.contains('show'))closeSupport(); else closeSidebar(); }
  if(event.key==='Tab') { if(modal)trapFocus(event,modal); else if(mobileQuery.matches&&!$('sidebar').hidden)trapFocus(event,$('sidebar')); }
});

function emptyState(message,action=false) { return '<div class="empty-state"><span class="empty-icon">⌁</span><h3>A little breathing room.</h3><p>'+escapeHTML(message)+'</p>'+(action?'<button class="text-button" onclick="showView(\'discover\')">Find an appointment ↗</button>':'')+'</div>'; }
async function refreshData() {
  if(refreshing||!currentUser)return; refreshing=true; const identity=currentUser;
  try {
    const [result,eventResult]=await Promise.all([api('bookings'),currentUser.role==='admin'?Promise.resolve({events:[]}):api('notifications')]);
    if(currentUser!==identity)return;
    $('connection-status').classList.add('hidden'); appToday=result.today;
    const snapshot=JSON.stringify([result,eventResult]);
    if(snapshot!==lastSnapshot) { bookings=result.bookings; notifications=eventResult.events; customerCount=result.customers; lastSnapshot=snapshot; renderDashboard(); renderAppointments(); renderQueues(); renderNotifications(); if(currentUser.role==='admin'){renderStaff();renderAdmin();} }
    for(const event of eventResult.events) { if(!initialEvents&&!seenEvents.has(event.id)&&!event.read&&currentUser.notifications)toast(event.title+': '+event.text); seenEvents.add(event.id); }
    initialEvents=false;
  } catch(error) { if(currentUser!==identity)return; if(error.status===401){clearInterval(pollTimer);closeSidebar(false);closeBooking();closeLocation();closeSupport();currentUser=null;$('app-shell').classList.add('hidden');$('support-fab').classList.add('hidden');$('auth-screen').classList.remove('hidden');setAuthMode('login');$('auth-error').textContent='Your session ended. Please log in again.';}else $('connection-status').classList.remove('hidden'); }
  finally { refreshing=false; }
}
const byAppointment=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time)||a.createdAt.localeCompare(b.createdAt);
const dateLabel=date=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(date+'T12:00:00+05:30'));
const timeLabel=time=>{let [h,m]=time.split(':').map(Number);return (h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM');};
function statusBadge(b) { return '<span class="status-badge status-'+b.status+'">'+escapeHTML(statusNames[b.status]||b.status)+'</span>'; }
function queueMarkup(b,compact=false) {
  if(!b)return emptyState('Your next live queue will appear here after you book.',true);
  const requested=b.status==='requested',serving=b.status==='serving',today=b.date===appToday;
  const title=requested?'Waiting for staff confirmation':!today?'Scheduled for '+dateLabel(b.date):serving?'It’s your turn ♡':b.ahead===0?'You’re first in line':b.ahead===1?'You’re next in line':b.ahead+' people ahead';
  return '<article class="personal-queue '+(compact?'queue-compact':'')+'"><div class="personal-queue-top"><span class="token-large">'+escapeHTML(b.token)+'</span>'+statusBadge(b)+'</div><h3>'+escapeHTML(b.provider)+'</h3><p>'+escapeHTML(b.service)+' · '+dateLabel(b.date)+' · '+timeLabel(b.time)+'</p><div class="queue-position"><span class="queue-orbit">'+(requested?'…':serving?'✓':b.ahead)+'</span><div><h2>'+escapeHTML(title)+'</h2><small>'+(requested?'Your request is saved. Staff will confirm it.':!today?'Your live position appears on the appointment date.':serving?'Please go to reception with your token.':'Estimated wait: '+b.estimatedMinutes+' minutes · Now serving '+escapeHTML(b.nowServing))+'</small></div></div></article>';
}
function renderDashboard() {
  const upcoming=bookings.filter(b=>activeStatuses.includes(b.status)&&b.date>=appToday).sort(byAppointment);
  $('appointment-count').textContent=upcoming.length; $('stat-appointments').textContent=String(upcoming.length).padStart(2,'0');
  $('stat-queues').textContent=String(bookings.filter(b=>['waiting','serving'].includes(b.status)&&b.date===appToday).length).padStart(2,'0');
  $('stat-completed').textContent=String(bookings.filter(b=>b.status==='completed').length).padStart(2,'0');
  $('stat-profile').textContent=currentUser.role==='admin'?'TEAM':currentUser.phone?'100%':'Add phone';
  $('dashboard-queue').innerHTML=currentUser.role==='admin'?'<div class="team-overview"><b>'+customerCount+'</b><p>customers registered. Manage their appointments and contacts in the staff console.</p><button class="text-button" onclick="showView(\'staff\')">Open customer queue ↗</button></div>':queueMarkup(upcoming.find(b=>b.date===appToday)||upcoming[0],true);
  $('next-appointment').innerHTML=upcoming.length?bookingMarkup(upcoming[0],true):emptyState('Nothing booked yet. Let’s find a moment for you.',currentUser.role!=='admin');
}
function setAppointmentTab(tab,button) { appointmentTab=tab; document.querySelectorAll('#appointment-tabs button').forEach(n=>n.classList.toggle('active',n===button));renderAppointments(); }
function bookingMarkup(b,compact=false) {
  const date=new Date(b.date+'T12:00:00');
  return '<article class="booking-card '+(compact?'booking-compact':'')+'"><div class="booking-date"><b>'+date.getDate()+'</b><span>'+date.toLocaleDateString('en-IN',{month:'short'})+'</span></div><div class="booking-main">'+statusBadge(b)+'<h3>'+escapeHTML(b.provider)+'</h3><p>'+escapeHTML(b.service)+' · '+escapeHTML(b.token)+'</p><strong>'+dateLabel(b.date)+' · '+timeLabel(b.time)+'</strong><small>⌖ '+escapeHTML(b.area)+'</small></div>'+(!compact&&['requested','waiting'].includes(b.status)?'<button class="cancel-booking" onclick="cancelBooking(\''+b.id+'\')">Cancel</button>':'')+'</article>';
}
function renderAppointments() {
  const list=bookings.filter(b=>appointmentTab==='upcoming'?activeStatuses.includes(b.status):b.status===appointmentTab).sort(byAppointment);
  $('appointment-list').innerHTML=list.length?list.map(b=>bookingMarkup(b)).join(''):emptyState('No '+appointmentTab+' appointments to show.',appointmentTab==='upcoming');
}
function renderQueues() { const list=bookings.filter(b=>activeStatuses.includes(b.status)&&b.date>=appToday).sort(byAppointment);$('customer-queue').innerHTML=list.length?list.map(b=>queueMarkup(b)).join(''):emptyState('Book a visit to get your personal token.',true); }
async function cancelBooking(id) { if(!confirm('Cancel this appointment request?'))return; await bookingAction(id,'cancel'); }

function options(list,placeholder) {return (placeholder?'<option value="">'+escapeHTML(placeholder)+'</option>':'')+list.map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join('');}
function changeState(){ $('city-select').innerHTML=options(cityMap[$('state-select').value]||[],'All cities');renderProviders(); }
function filterService(service){showView('discover');$('service-select').value=service;renderProviders();}
function renderProviders() {
  const state=$('state-select').value,city=$('city-select').value,service=$('service-select').value,q=$('locality-search').value.toLowerCase().trim();
  const list=providers.filter(p=>(!state||p.state===state)&&(!city||p.city===city)&&(!service||p.type===service)&&(!q||(p.name+' '+p.area+' '+p.city+' '+p.type).toLowerCase().includes(q)));
  $('provider-grid').innerHTML=list.length?list.map(p=>'<article class="provider-card"><div class="provider-top"><span class="provider-logo">'+p.icon+'</span><div><small class="provider-category">'+escapeHTML(p.type)+'</small><h3>'+escapeHTML(p.name)+'</h3></div></div><div class="provider-meta"><span>⌖ '+escapeHTML(p.area)+'</span><span>'+escapeHTML(p.state)+'</span></div><p class="provider-city">'+escapeHTML(p.city)+'</p><div class="provider-bottom"><span class="directory-badge">'+(p.demo?'Sample listing':'Imported directory')+'</span><button class="book-button" onclick="openBooking(\''+p.id+'\')">Request a visit ↗</button></div><small class="source-note">Details and availability need provider confirmation.</small></article>').join(''):emptyState('No listings in this filter yet. Try a nearby city.');
}
function openBooking(id) {
  currentProvider=providers.find(p=>p.id===id); if(!currentProvider)return;
  $('modal-provider').textContent=currentProvider.name;$('modal-meta').textContent=currentProvider.area+' · '+currentProvider.state;$('modal-icon').textContent=currentProvider.icon;
  $('modal-service').value=currentProvider.type;$('booking-name').textContent=currentUser.name;$('booking-phone').textContent=currentUser.phone;$('booking-consent').checked=false;$('booking-error').textContent='';
  $('modal-date').min=appToday;$('modal-date').value=appToday;updateTimes();openDialog('booking-modal');
}
function updateTimes() {
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number),now=parts[0]*60+parts[1];
  const slots=[];for(let m=8*60;m<=20*60;m+=30){if($('modal-date').value===appToday&&m<=now)continue;const value=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');slots.push('<option value="'+value+'">'+timeLabel(value)+'</option>');}
  $('modal-time').innerHTML=slots.length?slots.join(''):'<option value="">No times left today — choose tomorrow</option>';
}
async function confirmBooking() {
  $('booking-submit').disabled=true; $('booking-error').textContent='';
  try {const p=currentProvider;await api('bookings',{providerId:p.id,provider:p.name,service:p.type,area:p.area+', '+p.state,date:$('modal-date').value,time:$('modal-time').value,contactConsent:$('booking-consent').checked});closeBooking();appointmentTab='upcoming';document.querySelectorAll('#appointment-tabs button').forEach((n,i)=>n.classList.toggle('active',i===0));showView('appointments');await refreshData();toast('Your request is saved. Staff will confirm it shortly.');}
  catch(error){$('booking-error').textContent=error.message;}finally{$('booking-submit').disabled=false;}
}
let dialogReturnFocus;
function openDialog(id){if(mobileQuery.matches)closeSidebar(false);dialogReturnFocus=document.activeElement;$(id).classList.add('show');document.body.classList.add('modal-open');setTimeout(()=>$(id).querySelector('button,input,select')?.focus(),0);}
function closeDialog(id){const wasOpen=$(id).classList.contains('show');$(id).classList.remove('show');if(!document.querySelector('.modal-backdrop.show'))document.body.classList.remove('modal-open');if(wasOpen&&dialogReturnFocus?.isConnected)dialogReturnFocus.focus();}
function closeBooking(){closeDialog('booking-modal');}
function openLocation(){openDialog('location-modal');}
function closeLocation(){closeDialog('location-modal');}
function locationCities(){$('location-city').innerHTML=options(cityMap[$('location-state').value]||[]);}
function saveLocation(){const state=$('location-state').value,city=$('location-city').value;closeLocation();if(currentUser.role==='admin'){toast('Manage centres with the filter in the staff console.');return;}showView('discover');$('state-select').value=state;changeState();$('city-select').value=city;renderProviders();$('top-location').textContent=city;$('side-location').textContent=city;}

function fillProfile(){if(!currentUser||currentUser.role==='admin')return;const u=currentUser;['name','email','phone','address'].forEach(key=>$('profile-'+key).value=u[key]||'');$('profile-state').value=u.state||'';profileCities();$('profile-city').value=u.city||'';$('profile-notifications').checked=u.notifications!==false;$('profile-whatsapp').checked=Boolean(u.allowWhatsApp);$('settings-email').textContent=u.email;$('settings-phone').textContent=u.phone;$('member-since').textContent=new Date(u.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'});$('profile-error').textContent='';}
function profileCities(){$('profile-city').innerHTML=options(cityMap[$('profile-state').value]||[],'Choose city / locality');}
async function saveProfile(){const button=$('profile-save-button');button.disabled=true;$('profile-error').textContent='';try{const result=await api('profile',{name:$('profile-name').value.trim(),phone:$('profile-phone').value.trim(),state:$('profile-state').value,city:$('profile-city').value,address:$('profile-address').value.trim(),notifications:$('profile-notifications').checked,allowWhatsApp:$('profile-whatsapp').checked});currentUser=result.user;renderIdentity();fillProfile();$('profile-save-status').textContent='✓ Saved just now';toast('Your details are saved ♡');}catch(error){$('profile-error').textContent=error.message;}finally{button.disabled=false;}}

function renderStaff(){
  if(currentUser?.role!=='admin')return;
  $('staff-waiting').textContent=bookings.filter(b=>b.status==='waiting'&&b.date===appToday).length;$('staff-requested').textContent=bookings.filter(b=>b.status==='requested').length;$('staff-completed').textContent=bookings.filter(b=>b.status==='completed'&&b.completedAt?.slice(0,10)===new Date().toISOString().slice(0,10)).length;$('staff-customers').textContent=customerCount;
  const select=$('staff-provider'),selected=select.value,centres=[...new Map(bookings.map(b=>[b.providerId,b.provider])).entries()];
  select.innerHTML='<option value="">All centres</option>'+centres.map(([id,name])=>'<option value="'+escapeHTML(id)+'">'+escapeHTML(name)+'</option>').join('');select.value=selected;
  const q=$('staff-search').value.trim().toLowerCase(),date=$('staff-date').value;
  const list=bookings.filter(b=>(!selected||b.providerId===selected)&&(!date||b.date===date)&&(!q||(b.customerName+' '+b.customerPhone+' '+b.token).toLowerCase().includes(q))).sort(byAppointment);
  $('call-next-button').disabled=!selected||Boolean(date&&date!==appToday);
  $('staff-queue-body').innerHTML=list.map(b=>{
    const action=(name,label)=>'<button class="queue-action" onclick="bookingAction(\''+b.id+'\',\''+name+'\')">'+label+'</button>';
    const message='Hi '+b.customerName+', your turn is approaching for token '+b.token+' at '+b.provider+'. Please check QueueLess and stay nearby. — QueueLess team';
    return '<tr><td><b class="token-tag">'+escapeHTML(b.token)+'</b></td><td><b class="customer-name">'+escapeHTML(b.customerName)+'</b><a class="customer-phone" href="tel:'+escapeHTML(b.customerPhone)+'">'+escapeHTML(b.customerPhone)+'</a></td><td><b>'+escapeHTML(b.provider)+'</b><small>'+escapeHTML(b.service)+'</small><small>'+dateLabel(b.date)+' · '+timeLabel(b.time)+'</small></td><td>'+statusBadge(b)+(b.status==='waiting'&&b.date===appToday?'<small>'+b.ahead+' ahead · ~'+b.estimatedMinutes+' min</small>':'')+(b.lastNotifiedAt?'<small class="notified-label">✓ In-app reminder created</small>':'')+'</td><td><div class="contact-actions"><a class="queue-action" href="tel:'+escapeHTML(b.customerPhone)+'">↗ Call phone</a>'+(b.allowWhatsApp?'<a class="queue-action whatsapp-action" href="https://wa.me/'+b.customerPhone.replace(/\D/g,'')+'?text='+encodeURIComponent(message)+'" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>':'')+(b.status==='requested'?action('confirm','Confirm ✓'):'')+(b.status==='waiting'&&b.date===appToday?action('notify','Notify in app')+action('call','Call token →'):'')+(b.status==='serving'?action('complete','Complete ✓'):'')+(['waiting','requested'].includes(b.status)?action('cancel','Cancel'):'')+'</div></td></tr>';
  }).join('');$('staff-empty').classList.toggle('hidden',list.length>0);
}
async function bookingAction(id,action){try{await api('booking-action',{id,action});await refreshData();toast(action==='notify'?'In-app reminder created. Use the contact buttons for a phone call or WhatsApp.':'Queue updated.');}catch(error){toast(error.message);}}
async function callNext(){const providerId=$('staff-provider').value;if(!providerId){toast('Choose a centre first.');return;}if($('staff-date').value&&$('staff-date').value!==appToday){toast('Call next is available for today’s queue only.');return;}try{const r=await api('call-next',{providerId});await refreshData();toast(r.token+' called. Customer alert created.');}catch(error){toast(error.message);}}
function renderAdmin(){
  if(currentUser?.role!=='admin')return;
  const counts={requested:0,waiting:0,serving:0,completed:0,cancelled:0};bookings.forEach(b=>counts[b.status]++);
  $('admin-today').textContent=bookings.filter(b=>b.date===appToday).length;$('admin-completed').textContent=counts.completed;$('admin-waiting').textContent=bookings.filter(b=>b.status==='waiting'&&b.date===appToday).length;$('admin-customers').textContent=customerCount;$('admin-requested').textContent=counts.requested;
  const days=[];for(let i=6;i>=0;i--){const d=new Date(appToday+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);const date=d.toISOString().slice(0,10);days.push({label:d.toLocaleDateString('en-IN',{weekday:'short',timeZone:'UTC'}),n:bookings.filter(b=>b.date===date).length});}
  const max=Math.max(1,...days.map(d=>d.n));$('admin-week-chart').innerHTML=days.map(d=>'<div class="real-chart-column"><b>'+d.n+'</b><div class="real-chart-track"><i style="height:'+Math.max(2,d.n/max*100)+'%"></i></div><span>'+d.label+'</span></div>').join('');
  const colours=['#d9a441','#c29bde','#62bba0','#79aaff','#b97186'];let total=0;const stops=Object.entries(counts).map(([status,n],i)=>{const start=total;total+=bookings.length?n/bookings.length*100:0;return colours[i]+' '+start+'% '+total+'%';});
  $('admin-donut').style.background=bookings.length?'conic-gradient('+stops.join(',')+')':'#ffffff15';$('admin-total').innerHTML=bookings.length+'<small>Total</small>';
  $('admin-status-legend').innerHTML=Object.entries(counts).map(([s,n],i)=>'<span><i style="background:'+colours[i]+'"></i>'+statusNames[s]+' <b>'+n+'</b></span>').join('');
  $('admin-contact-body').innerHTML=bookings.filter(b=>activeStatuses.includes(b.status)).slice(-8).reverse().map(b=>'<tr><td>'+escapeHTML(b.token)+'</td><td>'+escapeHTML(b.customerName)+'</td><td><a href="tel:'+escapeHTML(b.customerPhone)+'">'+escapeHTML(b.customerPhone)+'</a></td><td>'+escapeHTML(b.provider)+'</td><td>'+statusBadge(b)+'</td></tr>').join('')||'<tr><td colspan="5">New bookings will appear here with the customer’s name and phone.</td></tr>';
}
function renderNotifications(){const unread=notifications.filter(n=>!n.read).length;$('top-unread').textContent=unread;$('nav-unread').textContent=unread;$('notification-list').innerHTML=notifications.length?[...notifications].reverse().map(n=>'<article class="notification-card '+(!n.read?'unread':'')+'"><span class="notification-icon">♢</span><div><h3>'+escapeHTML(n.title)+'</h3><p>'+escapeHTML(n.text)+'</p><small>'+new Date(n.createdAt).toLocaleString('en-IN')+'</small></div></article>').join(''):emptyState('All quiet here. Your next booking update will appear in this space.');}
async function markNotificationsRead(){try{await api('notifications/read',{});await refreshData();toast('All caught up ♡');}catch(error){toast(error.message);}}

function openSupport(){if(mobileQuery.matches)closeSidebar(false);$('support-chat').classList.add('show');setTimeout(()=>$('sarya-input').focus(),50);}
function closeSupport(){$('support-chat').classList.remove('show');}
function addChat(text,who){const node=document.createElement('div');node.className='chat-bubble '+who;node.textContent=text;$('chat-messages').appendChild(node);$('chat-messages').scrollTop=$('chat-messages').scrollHeight;return node;}
function askSarya(query){$('sarya-input').value=query;sendSarya();}
function sendSarya(){const query=$('sarya-input').value.trim();if(!query)return;addChat(query,'user');$('sarya-input').value='';const q=query.toLowerCase();let text;
  if(/phone|profile|setting|name|number/.test(q))text='Open My profile & settings from the sidebar (or tap your avatar). Update your name, mobile number and location, then tap Save my details. Staff will see the latest name and number alongside your bookings.';
  else if(/staff|admin|contact|remind/.test(q))text='Staff sign in with the key printed in the Java window. Open Staff console to see customer names and phone numbers. Confirm a request, then use Notify in app, Call phone, or WhatsApp. WhatsApp opens a prepared message for you to send manually.';
  else if(/bidholi|upes|hospital/.test(q)){text='Choose Find services → Uttarakhand → Dehradun · Bidholi. You can explore the imported medical-centre listings there. Confirm details directly before visiting.';const bubble=addChat(text,'bot');const link=document.createElement('a');link.href='https://www.google.com/maps/search/hospitals+near+UPES+Bidholi+Dehradun';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open nearby care on a map ↗';bubble.appendChild(document.createElement('br'));bubble.appendChild(link);return;}
  else if(/salon|beauty|pet|doctor|delhi|gurgaon|gurugram/.test(q))text='Open Find services, choose your state and city, then pick a category such as Salon or Pet clinic. Listing cards distinguish imported directory entries from sample listings. Requests need staff confirmation; no external booking app is connected.';
  else if(/queue|token|turn/.test(q)){const b=bookings.find(b=>['waiting','serving'].includes(b.status)&&b.date===appToday);text=b?'Your token is '+b.token+'. '+(b.status==='serving'?'It is your turn — please go to reception.':b.ahead+' people are ahead of you. Open Live queue for updates.'):'After staff confirm a booking, your token and position appear in Live queue. Keep the app open for updates and turn reminders.';}
  else if(/menu|sidebar|close/.test(q))text='On a phone, tap ☰ to open navigation. Close it using ×, tap the shaded area outside, swipe left, or choose a page. On a keyboard, press Escape.';
  else text='Here’s your guide: 1. Complete My profile & settings. 2. Open Find services and choose your location. 3. Request a date and time. 4. Wait for staff confirmation. 5. Follow your token in Live queue. I can also explain your phone number, queue or reminders.';
  addChat(text,'bot');
}

document.querySelectorAll('.modal-backdrop').forEach(node=>node.addEventListener('click',e=>{if(e.target===node){closeBooking();closeLocation();}}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)refreshData();});
$('today-label').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Kolkata'}).format(new Date()).toUpperCase();
const states=Object.keys(cityMap);$('state-select').innerHTML=options(states,'All states');$('profile-state').innerHTML=options(states,'Choose state');$('location-state').innerHTML=options(states);locationCities();
$('service-select').innerHTML=options([...new Set(providers.map(p=>p.type))].sort(),'All categories');
setAuthMode('login');setSidebar(false,false);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=4.1').catch(()=>{});
(async()=>{try{const result=await api('me');await openApp(result.user);}catch(error){if(error.status!==401)$('auth-error').textContent=error.message;}})();
