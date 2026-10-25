
let books=[], cities=[], selectedCity=null, quantities={};
const $=id=>document.getElementById(id);
function renderBooks(){
 $('books').innerHTML=books.map(b=>`<article class="book"><h3>${safe(b.name)}</h3><div class="muted">တစ်အုပ်အလေးချိန် ${b.weight} kg</div><div class="price" id="price-${b.id}">${fmt(b.prices[0])} / အုပ်</div><div class="muted" id="tier-${b.id}">၁–၉ အုပ်ဈေးနှုန်း</div><div class="qtyrow"><label for="q-${b.id}" class="muted">အရေအတွက်</label><input id="q-${b.id}" type="number" min="0" step="1" value="0" inputmode="numeric" aria-label="${safe(b.name)} အရေအတွက်"></div><div class="sumrow"><span>ကျသင့်ငွေ</span><strong id="sub-${b.id}">0 ကျပ်</strong></div></article>`).join('');
 books.forEach(b=>$('q-'+b.id).addEventListener('input',e=>{e.target.value=e.target.value.replace(/[^\d]/g,'');quantities[b.id]=Math.max(0,parseInt(e.target.value||0,10));updateSummary()}));
}
function renderCities(filter=''){
 const q=filter.trim().toLocaleLowerCase();
 const filtered=cities.filter(c=>!q||c.en.toLocaleLowerCase().includes(q)||c.my.toLocaleLowerCase().includes(q));
 $('cityList').innerHTML=filtered.map((c,i)=>`<div class="cityoption" data-city="${cities.indexOf(c)}">${safe(c.my)} <span class="muted">(${safe(c.en)}) · ${fmt(c.upTo2)} / 2kg</span></div>`).join('')||'<div class="cityoption">မြို့မတွေ့ပါ</div>';
 $('cityList').classList.add('open');
 $('cityList').querySelectorAll('[data-city]').forEach(el=>el.addEventListener('click',()=>{selectedCity=cities[Number(el.dataset.city)];$('citySearch').value=selectedCity.my+' ('+selectedCity.en+')';$('cityPicked').textContent='ရွေးချယ်ထားသောမြို့: '+selectedCity.my+' ('+selectedCity.en+')';$('cityList').classList.remove('open');updateSummary()}));
}
function updateSummary(){
 const calc=calcBooks(books,quantities);
 calc.items.forEach(item=>{$('sub-'+item.id).textContent=fmt(item.subtotal)});
 books.forEach(b=>{const q=Number(quantities[b.id]||0),tier=qtyTier(q);$('price-'+b.id).textContent=fmt(b.prices[tier])+' / အုပ်';$('tier-'+b.id).textContent=q===0?'အရေအတွက်ရွေးပါ':tier===0?'၁–၉ အုပ်ဈေးနှုန်း':tier===1?'၁၀–၂၉ အုပ်ဈေးနှုန်း':tier===2?'၃၀–၄၉ အုပ်ဈေးနှုန်း':'၅၀ အုပ်နှင့်အထက်ဈေးနှုန်း';});
 const count=calc.items.reduce((a,x)=>a+x.quantity,0), fee=deliveryFor(selectedCity,calc.totalWeight);
 $('count').textContent=count+' အုပ်';$('weight').textContent=calc.totalWeight.toFixed(2)+' kg';$('bookTotal').textContent=fmt(calc.bookTotal);$('delivery').textContent=selectedCity?(calc.totalWeight?fmt(fee):'စာအုပ်ရွေးပါ'):'မြို့ရွေးပါ';$('grand').textContent=fmt(calc.bookTotal+(calc.totalWeight?fee:0));
 return {...calc,count,deliveryFee:calc.totalWeight?fee:0,grandTotal:calc.bookTotal+(calc.totalWeight?fee:0)};
}
async function submitOrder(){
 const status=$('status');status.textContent='';
 const name=$('name').value.trim(),phone=$('phone').value.trim(),address=$('address').value.trim();
 const c=updateSummary();
 if(!name||!phone||!address||!selectedCity){status.textContent='အမည်၊ ဖုန်း၊ လိပ်စာနှင့် မြို့တို့ကို ဖြည့်/ရွေးချယ်ပါ။';return}
 if(!/^[0-9+\-\s()]{7,20}$/.test(phone)){status.textContent='ဖုန်းနံပါတ်ကို ပြန်စစ်ပါ။';return}
 if(!c.items.length){status.textContent='အနည်းဆုံး စာအုပ်တစ်မျိုး အရေအတွက်ရွေးပါ။';return}
 const btn=$('submit');btn.disabled=true;btn.textContent='သိမ်းဆည်းနေသည်…';
 try{
 const order={customerName:name,phone,address,city:{en:selectedCity.en,my:selectedCity.my},note:$('note').value.trim(),items:c.items,bookCount:c.count,totalWeight:Number(c.totalWeight.toFixed(3)),bookTotal:c.bookTotal,deliveryFee:c.deliveryFee,grandTotal:c.grandTotal,createdAt:Date.now(),source:'customer',status:'အသစ်'};
 const result=await dbPost('orders',order);status.textContent='အော်ဒါတင်ပြီးပါပြီ။ Order ID: '+result.name;status.style.color='var(--green)';
 $('name').value='';$('phone').value='';$('address').value='';$('note').value='';selectedCity=null;$('citySearch').value='';$('cityPicked').textContent='မြို့မရွေးရသေးပါ';quantities={};books.forEach(b=>$('q-'+b.id).value=0);updateSummary();
 }catch(e){status.textContent=e.message;status.style.color='#b42318'}
 finally{btn.disabled=false;btn.textContent='အော်ဒါတင်မည်'}
}
(async()=>{try{[books,cities]=await Promise.all([getJSON('../shared/books.json'),getJSON('../shared/cities.json')]);renderBooks();updateSummary();$('citySearch').addEventListener('focus',()=>renderCities($('citySearch').value));$('citySearch').addEventListener('input',()=>{selectedCity=null;$('cityPicked').textContent='မြို့မရွေးရသေးပါ';renderCities($('citySearch').value);updateSummary()});document.addEventListener('click',e=>{if(!e.target.closest('.citywrap'))$('cityList').classList.remove('open')});$('submit').addEventListener('click',submitOrder)}catch(e){$('status').textContent=e.message}})();
