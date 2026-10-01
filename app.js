const SHEET_ID='1jiLASp9amBPKSfOt3lqSjA7SUUSGyiLMb2jH-lgSFDs';
const SHEET_CSV=name=>`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
const EVENTS={
  SISAKET:{label:'ศรีสะเกษ',dates:[['SISAKET|2026-10-17','17 ตุลาคม 2569'],['SISAKET|2026-10-18','18 ตุลาคม 2569']]},
  LOEI:{label:'เลย',dates:[['LOEI|2026-10-31','31 ตุลาคม 2569'],['LOEI|2026-11-01','1 พฤศจิกายน 2569']]},
  KAMPHAENGPHET:{label:'กำแพงเพชร',dates:[['KAMPHAENGPHET|2026-11-14','14 พฤศจิกายน 2569'],['KAMPHAENGPHET|2026-11-15','15 พฤศจิกายน 2569']]}
};

const $=selector=>document.querySelector(selector);
const form=$('#registrationForm');
let addressRows=[];
let submitting=false;

function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(quoted){if(c==='"'&&n==='"'){field+='"';i++;}else if(c==='"'){quoted=false;}else{field+=c;}}
    else if(c==='"'){quoted=true;}else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else{field+=c;}
  }
  if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  const headers=rows.shift()||[];
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h.trim(),(r[i]||'').trim()])));
}

function unique(rows,key){return [...new Set(rows.map(r=>r[key]).filter(Boolean))];}
function setOptions(select,values){values.forEach(v=>select.add(new Option(v,v)));}
function setChecks(container,values,name){container.innerHTML=values.map(v=>`<label><input type="checkbox" name="${name}" value="${escapeHtml(v)}"><span>${escapeHtml(v)}</span></label>`).join('');}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function loadData(){
  try{
    const [masterText,dealerText,addressText]=await Promise.all([
      fetch(SHEET_CSV('Master')).then(r=>{if(!r.ok)throw new Error('Master');return r.text();}),
      fetch(SHEET_CSV('Dealer_Master')).then(r=>{if(!r.ok)throw new Error('Dealer');return r.text();}),
      fetch(SHEET_CSV('Address_Master')).then(r=>{if(!r.ok)throw new Error('Address');return r.text();})
    ]);
    const master=parseCsv(masterText),dealers=parseCsv(dealerText);
    addressRows=parseCsv(addressText);
    document.querySelectorAll('[data-master]').forEach(select=>setOptions(select,unique(master,select.dataset.master)));
    setOptions($('#dealer'),unique(dealers,'Dealer_Name'));
    setOptions($('#province'),unique(addressRows,'province').sort((a,b)=>a.localeCompare(b,'th')));
    setChecks($('#usedProducts'),unique(master,'current_used_product'),'current_used_product');
    setChecks($('#interestProducts'),unique(master,'q_interest_product'),'q_interest_product');
    $('#loadingMaster').hidden=true;form.hidden=false;
  }catch(error){
    $('#loadingMaster').hidden=true;showError('ไม่สามารถโหลดข้อมูลแบบฟอร์มได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้าใหม่');
  }
}

function renderVenues(){
  $('#venueOptions').innerHTML=Object.entries(EVENTS).map(([key,item])=>`<label class="choice-card"><input type="radio" name="venue" value="${key}" required><span><strong>${item.label}</strong><small>YANMAR Festival 2026</small></span></label>`).join('');
}

function renderDates(venue){
  const item=EVENTS[venue];
  $('#dateFieldset').disabled=!item;
  $('#dateOptions').innerHTML=item?item.dates.map(([value,label])=>`<label class="choice-card"><input type="checkbox" name="event_keys" value="${value}"><span><strong>${label}</strong><small>${item.label}</small></span></label>`).join(''):'<p class="muted">เลือกจังหวัดก่อนเพื่อดูวันจัดงาน</p>';
}

function resetSelect(select,label){select.innerHTML='';select.add(new Option(label,''));select.disabled=true;}
function updateDistricts(){
  const province=$('#province').value;resetSelect($('#district'),'เลือกอำเภอ/เขต');resetSelect($('#subdistrict'),'เลือกตำบล/แขวง');$('#postalCode').value='';
  if(!province)return;setOptions($('#district'),unique(addressRows.filter(r=>r.province===province),'district').sort((a,b)=>a.localeCompare(b,'th')));$('#district').disabled=false;
}
function updateSubdistricts(){
  const province=$('#province').value,district=$('#district').value;resetSelect($('#subdistrict'),'เลือกตำบล/แขวง');$('#postalCode').value='';
  if(!district)return;setOptions($('#subdistrict'),unique(addressRows.filter(r=>r.province===province&&r.district===district),'subdistrict').sort((a,b)=>a.localeCompare(b,'th')));$('#subdistrict').disabled=false;
}
function updatePostal(){const r=addressRows.find(r=>r.province===$('#province').value&&r.district===$('#district').value&&r.subdistrict===$('#subdistrict').value);$('#postalCode').value=r?r.postal_code:'';}
function showError(message){const box=$('#globalError');box.textContent=message;box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'center'});}
function clearError(){$('#globalError').hidden=true;}
function values(name){return [...form.querySelectorAll(`[name="${name}"]:checked`)].map(el=>el.value);}

function buildPayload(){
  const data=Object.fromEntries(new FormData(form).entries());
  const crops={rice:'q_rice_planting',sugarcane:'q_sugarcane_planting',cassava:'q_cassava_planting',corn:'q_corn_planting'};
  Object.entries(crops).forEach(([key,name])=>data[name]=form.querySelector(`[data-crop="${key}"]`).checked?'ใช่':'ไม่ใช่');
  data.q_other_crop_name=form.querySelector('[data-crop="other"]').checked?data.q_other_crop_name:'';
  data.q_other_crop_amount=form.querySelector('[data-crop="other"]').checked?data.q_other_crop_amount:'';
  data.event_keys=values('event_keys');
  data.current_used_product=values('current_used_product').join(', ');
  data.q_interest_product=values('q_interest_product').join(', ');
  data.pdpa=$('#pdpa').checked?'acknowledged':'';
  data.client_ts=Date.now();
  return data;
}

form.addEventListener('change',event=>{
  if(event.target.name==='venue')renderDates(event.target.value);
  if(event.target.id==='province')updateDistricts();
  if(event.target.id==='district')updateSubdistricts();
  if(event.target.id==='subdistrict')updatePostal();
  if(event.target.matches('[data-crop]')){
    const card=event.target.closest('.crop-card');card.querySelectorAll('input:not([type=checkbox])').forEach(input=>{input.disabled=!event.target.checked;if(!event.target.checked)input.value='';});
  }
});

form.addEventListener('submit',event=>{
  event.preventDefault();clearError();
  if(submitting)return;
  if(!form.reportValidity())return;
  if(!values('event_keys').length){showError('กรุณาเลือกวันที่เข้าร่วมงานอย่างน้อย 1 วัน');return;}
  if(!values('q_interest_product').length){showError('กรุณาเลือกสินค้าที่สนใจอย่างน้อย 1 รายการ');return;}
  const phone=form.elements.telephone.value.replace(/\D/g,'');
  if(!/^0\d{8,9}$/.test(phone)){showError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');return;}
  form.elements.telephone.value=phone;
  submitting=true;$('#submitButton').disabled=true;$('#submitStatus').textContent='กำลังบันทึกข้อมูล กรุณารอสักครู่…';
  $('#apiPayload').value=JSON.stringify(buildPayload());$('#apiForm').submit();
  window.setTimeout(()=>{if(submitting){submitting=false;$('#submitButton').disabled=false;$('#submitStatus').textContent='';showError('การเชื่อมต่อใช้เวลานาน กรุณาลองใหม่อีกครั้ง');}},25000);
});

window.addEventListener('message',event=>{
  const result=event.data&&event.data.source==='yanmar-registration-api'?event.data:null;if(!result)return;
  submitting=false;$('#submitButton').disabled=false;$('#submitStatus').textContent='';
  if(!result.success){showError(result.message||'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');return;}
  form.hidden=true;document.querySelector('.steps').children[2].classList.add('active');
  $('#registrationNumbers').innerHTML=(result.registrationIds||[]).map(id=>`<span>${escapeHtml(id)}</span>`).join('');
  $('#successPanel').hidden=false;$('#successPanel').scrollIntoView({behavior:'smooth',block:'start'});
});

$('#newRegistration').addEventListener('click',()=>location.reload());
renderVenues();loadData();
