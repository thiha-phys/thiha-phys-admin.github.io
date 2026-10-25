// Set this to your deployed Cloudflare Worker URL after deployment.
// Example: https://book-order-api.YOUR-SUBDOMAIN.workers.dev
const API_BASE = "https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev";
const BOOKS_URL = "../shared/books.json";
const CITIES_URL = "../shared/cities.json";
const fmt = n => new Intl.NumberFormat("en-US").format(Math.round(n)) + " ကျပ်";
const qtyTier = q => q >= 50 ? 3 : q >= 30 ? 2 : q >= 10 ? 1 : 0;
async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error("ဖိုင်ကို ဖတ်မရပါ: " + path);
  return r.json();
}
async function apiRequest(path, options={}) {
  if (API_BASE.includes("YOUR-WORKER-NAME")) throw new Error("API_BASE ကို shared/common.js ထဲတွင် သင့် Worker URL ဖြင့် အစားထိုးပါ။");
  let r;
  try { r = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type":"application/json", ...(options.headers||{}) } }); }
  catch { throw new Error("Backend ကို ချိတ်ဆက်မရပါ။ API URL နှင့် network ကို စစ်ဆေးပါ။"); }
  const data = await r.json().catch(()=>({error:"Server မှ ဖတ်မရသော တုံ့ပြန်ချက်ရရှိသည်။"}));
  if (!r.ok) throw new Error(data.error || `Request မအောင်မြင်ပါ (${r.status})`);
  return data;
}
async function dbPost(path, data) {
  if (path !== "orders") throw new Error("ခွင့်မပြုသော API လမ်းကြောင်းဖြစ်သည်။");
  return apiRequest("/api/orders", {method:"POST", body:JSON.stringify(data)});
}
async function dbGet(path, token) {
  if (path !== "orders") throw new Error("ခွင့်မပြုသော API လမ်းကြောင်းဖြစ်သည်။");
  return apiRequest("/api/admin/orders", {headers:{Authorization:`Bearer ${token||""}`}});
}
function calcBooks(books, quantities) {
  let total=0, weight=0, items=[];
  for (const b of books) {
    const q=Math.max(0,parseInt(quantities[b.id]||0,10)||0);
    if (!q) continue;
    const unit=b.prices[qtyTier(q)];
    const subtotal=unit*q;
    total+=subtotal; weight+=b.weight*q;
    items.push({id:b.id,name:b.name,quantity:q,unitPrice:unit,subtotal,unitWeight:b.weight});
  }
  return {items,bookTotal:total,totalWeight:weight};
}
function deliveryFor(city, weight) {
  if (!city || !weight) return 0;
  return city.upTo2 + Math.max(0,Math.ceil(weight-2-1e-9))*city.nextKg;
}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
