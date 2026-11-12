'use strict';
// QueueLess v5 GitHub bundle: directory, browser storage and interface.
// Original directory retained; sample listings are not provider integrations.
const cityMap = {
  Uttarakhand: ['Dehradun · Bidholi','Dehradun · Prem Nagar','Dehradun · Rajpur Road','Haridwar','Rishikesh'],
  Haryana: ['Gurugram · DLF Phase 1','Gurugram · Sector 31','Gurugram · Sector 44','Gurugram · Sector 51','Gurugram · Sector 53','Faridabad'],
  Delhi: ['New Delhi · Saket','New Delhi · Dwarka','Delhi · Rohini','Delhi · Karol Bagh','New Delhi · Karol Bagh'],
  'Uttar Pradesh': ['Noida · Sector 18','Noida · Sector 62','Ghaziabad · Indirapuram','Lucknow · Gomti Nagar'],
  Maharashtra:['Mumbai · Bandra','Mumbai · Andheri','Pune · Kothrud'], Karnataka:['Bengaluru · Indiranagar','Bengaluru · Whitefield','Mysuru'],
  Rajasthan:['Jaipur · Malviya Nagar','Jaipur · Pratap Nagar'], Gujarat:['Ahmedabad · Navrangpura','Surat · Adajan'],
  'West Bengal':['Kolkata · Salt Lake'], 'Tamil Nadu':['Chennai · Anna Nagar'], Telangana:['Hyderabad · Banjara Hills'], Kerala:['Kochi · Kakkanad']
};
const directoryRows = [
  ['🏥','UPES Bidholi Medical Centre','General physician','Uttarakhand','Dehradun · Bidholi','Bidholi',false],
  ['🩺','D.I.M.S. Multi Speciality Hospital','General physician','Uttarakhand','Dehradun · Bidholi','Bidholi',false],
  ['🧪','Uttranchal University Hospital & Diagnostic Centre','Diagnostic lab','Uttarakhand','Dehradun · Bidholi','Kandhauli',false],
  ['💊','Swasthya Clinic & Diagnostics Centre','Diagnostic lab','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',false],
  ['🏥','Subharti Hospital & College','General physician','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',false],
  ['🏥','Artemis Hospital','General physician','Haryana','Gurugram · Sector 51','Sector 51',false],
  ['🏥','Alchemist Hospital','General physician','Haryana','Gurugram · Sector 53','Sector 53',false],
  ['🩺','Aggarwal Clinic','General physician','Haryana','Gurugram · Sector 31','Sector 31',false],
  ['❤️','Sir Ganga Ram Hospital','General physician','Delhi','New Delhi · Karol Bagh','Pusa Road',false],
  ['🏥','Indraprastha Apollo Hospital','General physician','Delhi','New Delhi · Saket','Sarita Vihar',false],
  ['🦷','Maulana Azad Institute of Dental Sciences','Dentist','Delhi','New Delhi · Karol Bagh','JLN Marg',false],
  ['🧒','Chacha Nehru Bal Chikitsalaya','Paediatrician','Delhi','Delhi · Karol Bagh','Geeta Colony',false],
  ['🐾','Paws & Care Veterinary Clinic','Pet clinic','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['🐶','Happy Tails Pet Hospital','Pet clinic','Delhi','New Delhi · Saket','Saket',true],
  ['✂️','Urban Company Salon at Home','Salon','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['💅','Urban Company Beauty at Home','Salon','Delhi','New Delhi · Saket','Saket',true],
  ['✨','Blush & Bloom Studio','Salon','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🦷','Pearl Dental Studio','Dentist','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🧪','CityCare Diagnostics','Diagnostic lab','Uttar Pradesh','Noida · Sector 18','Sector 18',true],
  ['🏠','HomeFix Services','Home service','Haryana','Gurugram · Sector 44','Sector 44',true],
  ['💆','The Wellness Room','Salon','Haryana','Gurugram · Sector 44','Sector 44',true],
  ['💇','Looks Salon','Salon','Delhi','New Delhi · Saket','Saket',false],
  ['💅','Nail Artistry Studio','Salon','Haryana','Gurugram · DLF Phase 1','DLF Phase 1',true],
  ['🐕','Dr. Vet Pet Clinic','Pet clinic','Uttarakhand','Dehradun · Rajpur Road','Rajpur Road',true],
  ['🧘','PhysioPlus Wellness','Physiotherapy','Delhi','New Delhi · Dwarka','Dwarka',true],
  ['👁️','VisionCare Eye Centre','Eye care','Haryana','Gurugram · Sector 51','Sector 51',true],
  ['💊','MediPoint Pharmacy','Pharmacy','Uttarakhand','Dehradun · Prem Nagar','Prem Nagar',true],
  ['🏛️','Citizen Service Centre','Government service','Delhi','Delhi · Rohini','Rohini',true],
  ['🧴','Urban Company Home Spa','Home service','Uttar Pradesh','Noida · Sector 62','Sector 62',true]
];
const providers = directoryRows.map((p,i)=>({id:'provider-'+i,icon:p[0],name:p[1],type:p[2],state:p[3],city:p[4],area:p[5],demo:p[6]}));

/* QueueLess GitHub edition: browser storage only; no Java or network API. */
(function () {
  'use strict';
  const scope = new URL('./', document.baseURI).pathname;
  const dataKey = 'queueless-pages-v5:' + scope;
  const sessionKey = dataKey + ':session';
  const active = ['requested', 'waiting', 'serving'];
  const presetStaff = Object.freeze({salt: '323a18a8a07f29805525947133deee79', hash: '0f71cc9125763d1e38377c6aa8104c703eaf5571baba149cb419e1ba174e5248', presetVersion: '5.1'});
  let pending = Promise.resolve();

  function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
  function blank() { return {version: 1, users: [], bookings: [], events: [], sequence: 0, staff: {...presetStaff}}; }
  function load() {
    let raw;
    try { raw = localStorage.getItem(dataKey); }
    catch { fail(503, 'Allow browser storage for this site to save your account and bookings.'); }
    if (!raw) return blank();
    try {
      const state = JSON.parse(raw);
      if (state.version !== 1 || !Array.isArray(state.users) || !Array.isArray(state.bookings) || !Array.isArray(state.events)) throw new Error();
      // Apply the requested staff PIN without changing customer records or bookings.
      if (state.staff?.presetVersion !== presetStaff.presetVersion) state.staff = {...presetStaff};
      return state;
    } catch { fail(503, 'Your saved browser data could not be read. It has been left untouched.'); }
  }
  function save(state) {
    try { localStorage.setItem(dataKey, JSON.stringify(state)); }
    catch { fail(507, 'Your browser could not save this change. Check available storage and site permissions.'); }
  }
  function clean(input, key, max = 240, required = false) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (value.length > max) fail(400, key + ' is too long.');
    if (required && !value) fail(400, 'Please enter ' + key + '.');
    return value;
  }
  function name(input) { const value = clean(input, 'name', 80, true); if (value.length < 2) fail(400, 'Please enter your full name.'); return value; }
  function email(input) { const value = clean(input, 'email', 160, true).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400, 'Enter a valid email address.'); return value; }
  function phone(input) {
    let value = clean(input, 'phone', 32, true).replace(/[\s()\-]/g, '');
    if (/^[6-9]\d{9}$/.test(value)) value = '+91' + value;
    if (/^91[6-9]\d{9}$/.test(value)) value = '+' + value;
    if (!/^\+[1-9]\d{7,14}$/.test(value) || value.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(value)) fail(400, 'Enter a 10-digit Indian mobile number, or an international number with +country code.');
    return value;
  }
  function secret(input, key, min) {
    const value = typeof input[key] === 'string' ? input[key] : '';
    if (value.length < min || value.length > 256) fail(400, 'Use at least ' + min + ' characters for your ' + (key === 'password' ? 'password.' : 'staff PIN.'));
    return value;
  }
  function today() { return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()); }
  function id() { return crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''); }
  function salt() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''); }
  async function digest(value, hexSalt) {
    if (!crypto.subtle) fail(503, 'Open your published HTTPS GitHub Pages link to use account storage.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
    const bytes = Uint8Array.from(hexSalt.match(/../g), n => parseInt(n, 16));
    const hash = await crypto.subtle.deriveBits({name: 'PBKDF2', salt: bytes, iterations: 210000, hash: 'SHA-256'}, key, 256);
    return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
  }
  function publicUser(user) { const {hash, salt, ...safe} = user; return safe; }
  function operator() { return {id: 'operator', name: 'QueueLess Team', role: 'admin'}; }
  function signIn(userId, role) {
    try { sessionStorage.setItem(sessionKey, JSON.stringify({userId, role, expires: Date.now() + 43200000})); }
    catch { fail(503, 'Allow browser session storage to sign in.'); }
  }
  function session(state) {
    let result;
    try { result = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch {}
    if (!result || result.expires < Date.now() || !['customer', 'admin'].includes(result.role)) fail(401, 'Please log in to continue.');
    if (result.role === 'admin' && !state.staff) fail(401, 'Set up staff access on this browser first.');
    if (result.role === 'customer' && !state.users.some(user => user.id === result.userId)) fail(401, 'Please log in to continue.');
    return result;
  }
  function customer(current) { if (current.role !== 'customer') fail(403, 'Sign in as a customer to use this feature.'); }
  function staff(current) { if (current.role !== 'admin') fail(403, 'Open staff access to use this feature.'); }
  function find(state, kind, recordId) { const record = state[kind].find(value => value.id === recordId); if (!record) fail(404, 'Record not found.'); return record; }
  function sameQueue(a, b) { return a.providerId === b.providerId && a.date === b.date; }
  function event(state, booking, title, text) { state.events.push({id: id(), userId: booking.userId, bookingId: booking.id, title, text, createdAt: new Date().toISOString(), read: false}); }
  function bookingView(state, booking, contacts) {
    const {userId, contactConsent, ...safe} = booking;
    const queue = state.bookings.filter(value => sameQueue(value, booking));
    const serving = queue.find(value => value.status === 'serving');
    const ahead = booking.status === 'waiting' ? queue.filter(value => value.status === 'serving' || value.status === 'waiting' && value.sequence < booking.sequence).length : 0;
    const result = {...safe, ahead, estimatedMinutes: ahead * 6, nowServing: serving?.token || '—'};
    if (contacts) { const user = find(state, 'users', userId); Object.assign(result, {customerName: user.name, customerPhone: user.phone, allowWhatsApp: user.allowWhatsApp}); }
    return result;
  }
  function call(state, booking) {
    if (state.bookings.some(value => sameQueue(value, booking) && value.status === 'waiting' && value.sequence < booking.sequence)) fail(409, 'Call the earlier waiting token first.');
    for (const value of state.bookings) if (sameQueue(value, booking) && value.status === 'serving') { value.status = 'completed'; value.completedAt = new Date().toISOString(); }
    booking.status = 'serving'; booking.calledAt = new Date().toISOString();
    event(state, booking, 'It is your turn', 'Please proceed to reception for ' + booking.token + ' at ' + booking.provider + '.');
    const next = state.bookings.find(value => sameQueue(value, booking) && value.status === 'waiting');
    if (next) { event(state, next, 'You are next', 'You are next after ' + booking.token + '. Please stay nearby.'); next.lastNotifiedAt = new Date().toISOString(); }
  }

  async function handle(route, input) {
    let state = load();
    const data = input || {};
    if (route === 'staff-status') return {configured: Boolean(state.staff)};
    if (route === 'register') {
      const fullName = name(data), mail = email(data), mobile = phone(data), password = secret(data, 'password', 8);
      if (state.users.some(user => user.email === mail)) fail(409, 'This email is already registered in this browser. Please log in.');
      const newSalt = salt(), hash = await digest(password, newSalt);
      state = load();
      if (state.users.some(user => user.email === mail)) fail(409, 'This email is already registered in this browser. Please log in.');
      const user = {id: id(), name: fullName, email: mail, phone: mobile, salt: newSalt, hash, role: 'customer', createdAt: new Date().toISOString(), state: '', city: '', address: '', notifications: true, allowWhatsApp: false};
      state.users.push(user); save(state); signIn(user.id, 'customer'); return {user: publicUser(user)};
    }
    if (route === 'login') {
      const mail = email(data), password = typeof data.password === 'string' ? data.password : '';
      const user = state.users.find(value => value.email === mail);
      if (!user || password.length > 256 || await digest(password, user.salt) !== user.hash) fail(401, 'Email or password is incorrect for this browser. New here? Create an account.');
      signIn(user.id, 'customer'); return {user: publicUser(user)};
    }
    if (route === 'staff-setup') {
      if (state.staff) fail(409, 'A staff PIN is already set on this browser. Please sign in.');
      const pin = secret(data, 'key', 5);
      if (pin !== data.confirmKey) fail(400, 'The two staff PINs do not match.');
      const newSalt = salt(), hash = await digest(pin, newSalt);
      state = load(); if (state.staff) fail(409, 'A staff PIN is already set on this browser. Please sign in.');
      state.staff = {salt: newSalt, hash}; save(state); signIn('operator', 'admin'); return {user: operator()};
    }
    if (route === 'staff-login') {
      if (!state.staff) fail(409, 'Set up a staff PIN on this browser first.');
      const pin = typeof data.key === 'string' ? data.key : '';
      if (pin.length > 256 || await digest(pin, state.staff.salt) !== state.staff.hash) fail(401, 'Incorrect staff PIN for this browser.');
      save(state); signIn('operator', 'admin'); return {user: operator()};
    }
    if (route === 'logout') { sessionStorage.removeItem(sessionKey); return {ok: true}; }
    const current = session(state);
    const user = current.role === 'admin' ? operator() : find(state, 'users', current.userId);
    if (route === 'me') return {user: publicUser(user)};
    if (route === 'profile') {
      customer(current);
      const changed = {name: name(data), phone: phone(data), state: clean(data, 'state'), city: clean(data, 'city'), address: clean(data, 'address'), notifications: Boolean(data.notifications), allowWhatsApp: Boolean(data.allowWhatsApp)};
      Object.assign(user, changed); save(state); return {user: publicUser(user)};
    }
    if (route === 'bookings' && input === undefined) return {bookings: state.bookings.filter(value => current.role === 'admin' || value.userId === user.id).map(value => bookingView(state, value, current.role === 'admin')), today: today(), customers: current.role === 'admin' ? state.users.length : 0};
    if (route === 'bookings') {
      customer(current); phone(user);
      if (data.contactConsent !== true) fail(400, 'Please allow your contact details in this device’s staff queue.');
      const provider = providers.find(value => value.id === data.providerId);
      if (!provider) fail(400, 'Choose a provider from Find services.');
      const date = clean(data, 'date', 10, true), time = clean(data, 'time', 5, true);
      const when = new Date(date + 'T' + time + ':00+05:30');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isFinite(when.getTime()) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date) fail(400, 'Choose a valid date and time.');
      if (date < today() || when.getTime() < Date.now()) fail(400, 'That time has passed. Choose a later time.');
      const last = new Date(today() + 'T12:00:00Z'); last.setUTCDate(last.getUTCDate() + 180);
      if (date > last.toISOString().slice(0, 10)) fail(400, 'Choose a date within the next 180 days.');
      if (state.bookings.some(value => value.userId === user.id && value.providerId === provider.id && value.date === date && active.includes(value.status))) fail(409, 'You already have an active request with this centre on this date.');
      state.sequence += 1;
      const booking = {id: id(), sequence: state.sequence, token: 'Q' + String(state.sequence).padStart(3, '0'), userId: user.id, providerId: provider.id, provider: provider.name, service: provider.type, area: provider.area + ', ' + provider.state, date, time, status: 'requested', createdAt: new Date().toISOString(), contactConsent: true};
      state.bookings.push(booking); event(state, booking, 'Request saved on this device', provider.name + ' · Open the staff demo on this browser to confirm this request. No request has been sent to the provider.');
      save(state); return {booking: bookingView(state, booking, false)};
    }
    if (route === 'booking-action') {
      const booking = find(state, 'bookings', clean(data, 'id', 80, true)), action = data.action;
      if (action === 'cancel' && current.role !== 'admin' && booking.userId !== user.id) fail(403, 'This is not your booking.');
      if (action !== 'cancel') staff(current);
      if (action === 'confirm' && booking.status === 'requested') { booking.status = 'waiting'; event(state, booking, 'Appointment confirmed in demo', booking.token + ' · ' + booking.date + ' at ' + booking.time + '.'); }
      else if (action === 'notify' && booking.status === 'waiting' && booking.date === today()) { event(state, booking, 'Your turn is approaching', 'Please stay nearby for ' + booking.token + ' at ' + booking.provider + '.'); booking.lastNotifiedAt = new Date().toISOString(); }
      else if (action === 'call' && booking.status === 'waiting' && booking.date === today()) call(state, booking);
      else if (action === 'complete' && booking.status === 'serving') { booking.status = 'completed'; booking.completedAt = new Date().toISOString(); event(state, booking, 'Visit completed in demo', 'Thank you for using QueueLess.'); }
      else if (action === 'cancel' && ['requested', 'waiting'].includes(booking.status)) { booking.status = 'cancelled'; event(state, booking, 'Booking cancelled', booking.token + ' has been cancelled on this device.'); }
      else fail(409, 'This action is not available for this booking right now.');
      save(state); return {ok: true};
    }
    if (route === 'call-next') {
      staff(current); const providerId = clean(data, 'providerId', 80, true);
      const next = state.bookings.find(value => value.providerId === providerId && value.date === today() && value.status === 'waiting');
      if (!next) fail(409, 'No confirmed customers are waiting at this centre today.');
      call(state, next); save(state); return {ok: true, token: next.token};
    }
    if (route === 'notifications') return {events: state.events.filter(value => value.userId === current.userId)};
    if (route === 'notifications/read') { state.events.filter(value => value.userId === current.userId).forEach(value => { value.read = true; }); save(state); return {ok: true}; }
    fail(404, 'This action is not available.');
  }

  function request(route, input) {
    const run = () => navigator.locks?.request ? navigator.locks.request(dataKey + ':lock', () => handle(route, input)) : handle(route, input);
    const result = pending.then(run, run); pending = result.catch(() => {}); return result;
  }
  window.QueueLessStore = Object.freeze({request, staffConfigured: () => Boolean(load().staff), dataKey});
})();

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
  if(!window.QueueLessStore)throw new Error('This app update is incomplete. Upload browser-store.js beside index.html, then refresh.');
  return window.QueueLessStore.request(path,data);
}
function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500); }
function setAuthMode(mode) {
  if(mode==='staff'&&window.QueueLessStore&&!QueueLessStore.staffConfigured())mode='staff-setup';
  authMode=mode; const signup=mode==='signup', setup=mode==='staff-setup', staff=mode==='staff'||setup;
  $('auth-error').textContent=''; $('login-tab').classList.toggle('active',mode==='login'); $('signup-tab').classList.toggle('active',signup);
  $('auth-title').textContent=setup?'Create your team space.':staff?'Hello, team.':signup?'Make yourself at home.':'Welcome back.';
  $('auth-subtitle').textContent=setup?'Set a staff PIN for the demo data saved on this browser.':staff?'Enter your 5-digit staff PIN.':signup?'A few details. A little less waiting.':'Your appointments, all in one lovely place.';
  $('auth-submit').textContent=(setup?'Save PIN & open staff demo':staff?'Open team workspace':signup?'Create my account':'Log in')+' →';
  $('auth-fields').innerHTML=staff?'<label>STAFF PIN<input id="staff-key" type="password" inputmode="numeric" pattern="[0-9]{5}" autocomplete="'+(setup?'new-password':'current-password')+'" required minlength="5" maxlength="5" placeholder="Enter your 5-digit PIN"></label>'+(setup?'<label>CONFIRM STAFF PIN<input id="staff-confirm-key" type="password" autocomplete="new-password" required minlength="5" maxlength="5" placeholder="Repeat your staff PIN"></label>':'')+'<p class="signup-note">Staff tools only manage bookings saved in this browser. This is not a shared hospital system.</p>':
    (signup?'<div class="signup-grid"><label>FULL NAME<input id="full-name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Your full name"></label><label>MOBILE NUMBER<input id="phone" type="tel" autocomplete="tel" required maxlength="32" placeholder="10-digit mobile number"></label></div>':'')+
    '<label>EMAIL ADDRESS<input id="email" type="email" autocomplete="email" required maxlength="160" placeholder="you@example.com"></label><label>PASSWORD<input id="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" required '+(signup?'minlength="8" ':'')+'maxlength="256" placeholder="'+(signup?'At least 8 characters':'Your password')+'"></label>'+
    (signup?'<p class="signup-note">Staff use your phone to contact you about your appointments. WhatsApp reminders are optional in settings.</p>':'');
}
async function submitAuth() {
  const button=$('auth-submit'); button.disabled=true; $('auth-error').textContent='';
  const email=($('email')?.value||'').trim().toLowerCase(), password=$('password')?.value||'';
  try {
    const result=['staff','staff-setup'].includes(authMode)?await api(authMode==='staff-setup'?'staff-setup':'staff-login',{key:$('staff-key').value,confirmKey:$('staff-confirm-key')?.value}):await api(authMode==='signup'?'register':'login',{email,password,name:$('full-name')?.value.trim(),phone:$('phone')?.value.trim()});
    await openApp(result.user); toast('Welcome, '+result.user.name+' ♡');
  } catch(error) {
    // v3 accounts existed only in this browser. Help their owner upgrade without erasing them.
    let legacy;
    try { legacy=JSON.parse(localStorage.getItem('queuelessShowcaseUsers')||'[]').find(u=>u.email===email&&u.password===password); } catch {}
    if(authMode==='login'&&error.status===401&&legacy) {
      setAuthMode('signup'); $('full-name').value=legacy.name||''; $('email').value=email; $('password').value=password;
      $('auth-error').textContent='Your earlier account needs a phone number for this version. Add it once to save your updated profile in this browser.';
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
  try {const p=currentProvider;await api('bookings',{providerId:p.id,provider:p.name,service:p.type,area:p.area+', '+p.state,date:$('modal-date').value,time:$('modal-time').value,contactConsent:$('booking-consent').checked});closeBooking();appointmentTab='upcoming';document.querySelectorAll('#appointment-tabs button').forEach((n,i)=>n.classList.toggle('active',i===0));showView('appointments');await refreshData();toast('Saved on this device. Open the staff demo here to confirm your request.');}
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
  else if(/staff|admin|contact|remind/.test(q))text='Choose Staff / admin access. First time? Set a staff PIN for this browser. You can confirm this device’s bookings, view names and phone numbers, and use Notify in app, Call phone or WhatsApp. WhatsApp messages are sent manually. Other devices have separate data.';
  else if(/bidholi|upes|hospital/.test(q)){text='Choose Find services → Uttarakhand → Dehradun · Bidholi. You can explore the imported medical-centre listings there. Confirm details directly before visiting.';const bubble=addChat(text,'bot');const link=document.createElement('a');link.href='https://www.google.com/maps/search/hospitals+near+UPES+Bidholi+Dehradun';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open nearby care on a map ↗';bubble.appendChild(document.createElement('br'));bubble.appendChild(link);return;}
  else if(/salon|beauty|pet|doctor|delhi|gurgaon|gurugram/.test(q))text='Open Find services, choose your state and city, then pick a category such as Salon or Pet clinic. Listing cards distinguish imported directory entries from sample listings. Requests need staff confirmation; no external booking app is connected.';
  else if(/queue|token|turn/.test(q)){const b=bookings.find(b=>['waiting','serving'].includes(b.status)&&b.date===appToday);text=b?'Your token is '+b.token+'. '+(b.status==='serving'?'The staff demo has called this token.':b.ahead+' people are ahead in this browser’s demo queue.'):'After you confirm a booking in the staff demo on this browser, the token appears in Live queue. Queue changes do not sync to other people’s phones.';}
  else if(/github|online|sync|device|free/.test(q))text='This GitHub edition opens for free from your published link. Accounts, appointments and the staff queue stay in the browser where they were created. The same browser’s tabs can share saved data, but other devices cannot see it.';
  else if(/menu|sidebar|close/.test(q))text='On a phone, tap ☰ to open navigation. Close it using ×, tap the shaded area outside, swipe left, or choose a page. On a keyboard, press Escape.';
  else text='Here’s your guide: 1. Complete My profile & settings. 2. Open Find services and choose your location. 3. Request a date and time. 4. Wait for staff confirmation. 5. Follow your token in Live queue. I can also explain your phone number, queue or reminders.';
  addChat(text,'bot');
}

document.querySelectorAll('.modal-backdrop').forEach(node=>node.addEventListener('click',e=>{if(e.target===node){closeBooking();closeLocation();}}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)refreshData();});
window.addEventListener('storage',event=>{if(event.key===window.QueueLessStore?.dataKey&&currentUser)refreshData();});
$('today-label').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Kolkata'}).format(new Date()).toUpperCase();
const states=Object.keys(cityMap);$('state-select').innerHTML=options(states,'All states');$('profile-state').innerHTML=options(states,'Choose state');$('location-state').innerHTML=options(states);locationCities();
$('service-select').innerHTML=options([...new Set(providers.map(p=>p.type))].sort(),'All categories');
setAuthMode('login');setSidebar(false,false);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=5.1').catch(()=>{});
(async()=>{try{const result=await api('me');await openApp(result.user);}catch(error){if(error.status!==401)$('auth-error').textContent=error.message;}})();
