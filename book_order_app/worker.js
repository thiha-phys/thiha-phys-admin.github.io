/**
 * Cloudflare Worker API bridge for Firebase Realtime Database.
 * Secrets required: FIREBASE_SERVICE_ACCOUNT_JSON, ADMIN_PASSWORD.
 * Variable recommended: ALLOWED_ORIGINS (comma-separated HTTPS site origins).
 */
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const enc = s => new TextEncoder().encode(s);
const decodePem = pem => Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"")), c=>c.charCodeAt(0));
function corsHeaders(request, env) {
  const origin=request.headers.get("Origin")||"";
  const allowed=(env.ALLOWED_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const valid=allowed.length===0 ? "*" : (allowed.includes(origin) ? origin : "null");
  return {"Access-Control-Allow-Origin":valid,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Vary":"Origin"};
}
async function firebaseAccessToken(env) {
  const sa=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON||"{}");
  if(!sa.client_email||!sa.private_key) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON secret မပြည့်စုံပါ။");
  const now=Math.floor(Date.now()/1000);
  const header=b64url(enc(JSON.stringify({alg:"RS256",typ:"JWT"})));
  const claim=b64url(enc(JSON.stringify({iss:sa.client_email,scope:"https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})));
  const unsigned=`${header}.${claim}`;
  const key=await crypto.subtle.importKey("pkcs8",decodePem(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,enc(unsigned));
  const assertion=`${unsigned}.${b64url(sig)}`;
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  const data=await response.json();
  if(!response.ok||!data.access_token) throw new Error("Firebase server authentication မအောင်မြင်ပါ။ Service Account / IAM ကို စစ်ပါ။");
  return data.access_token;
}
async function rtdb(env, path, method="GET", value) {
  const sa=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON||"{}");
  const base=(env.FIREBASE_DATABASE_URL||"https://test-51e64-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/,"");
  const token=await firebaseAccessToken(env);
  const response=await fetch(`${base}/${path}.json`,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(value===undefined?{}:{body:JSON.stringify(value)})});
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error("Firebase request မအောင်မြင်ပါ ("+response.status+")");
  return data;
}
async function signAdminToken(password, exp) {
  const payload=b64url(enc(JSON.stringify({role:"admin",exp})));
  const key=await crypto.subtle.importKey("raw",enc(password),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return `${payload}.${b64url(await crypto.subtle.sign("HMAC",key,enc(payload)))}`;
}
async function isAdmin(request, env) {
  const token=(request.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  const [payload,signature,...extra]=token.split(".");
  if(!payload||!signature||extra.length||!env.ADMIN_PASSWORD) return false;
  const key=await crypto.subtle.importKey("raw",enc(env.ADMIN_PASSWORD),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const actual=b64url(await crypto.subtle.sign("HMAC",key,enc(payload)));
  if(actual!==signature) return false;
  try {
    let raw=payload.replace(/-/g,"+").replace(/_/g,"/");
    raw += "=".repeat((4-raw.length%4)%4);
    const data=JSON.parse(atob(raw));
    return data.role==="admin"&&Number(data.exp)>Date.now();
  } catch { return false; }
}

function validOrder(o) {
  if(!o||typeof o!=="object") return "အော်ဒါအချက်အလက် မမှန်ပါ။";
  if(typeof o.customerName!=="string"||!o.customerName.trim()||o.customerName.length>120) return "ဝယ်သူအမည်ကို စစ်ဆေးပါ။";
  if(typeof o.phone!=="string"||o.phone.length>30||!/[0-9]{7,}/.test(o.phone)) return "ဖုန်းနံပါတ်ကို စစ်ဆေးပါ။";
  if(typeof o.address!=="string"||!o.address.trim()||o.address.length>600) return "လိပ်စာကို စစ်ဆေးပါ။";
  if(!o.city||typeof o.city.my!=="string"||typeof o.city.en!=="string") return "ပို့ဆောင်မည့်မြို့ကို ရွေးပါ။";
  if(!Array.isArray(o.items)||o.items.length<1||o.items.length>7) return "စာအုပ်အရေအတွက်ကို စစ်ဆေးပါ။";
  if(o.items.some(i=>!Number.isInteger(Number(i.quantity))||Number(i.quantity)<1||Number(i.quantity)>1000||!Number.isFinite(Number(i.subtotal))||Number(i.subtotal)<0)) return "စာအုပ်အရေအတွက် သို့မဟုတ် ဈေးနှုန်း မမှန်ပါ။";
  if(!Number.isFinite(Number(o.grandTotal))||Number(o.grandTotal)<0||Number(o.grandTotal)>100000000) return "စုစုပေါင်းငွေကို စစ်ဆေးပါ။";
  return "";
}
export default {
 async fetch(request, env) {
  const cors=corsHeaders(request,env);
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url);
  try {
   if(url.pathname==="/api/health"&&request.method==="GET") return json({ok:true,service:"book-order-api"},200,cors);
   if(url.pathname==="/api/admin/login"&&request.method==="POST") {
    const body=await request.json();
    if(!env.ADMIN_PASSWORD||typeof body.password!=="string"||body.password!==env.ADMIN_PASSWORD) return json({error:"Admin password မမှန်ပါ။"},401,cors);
    return json({token:await signAdminToken(env.ADMIN_PASSWORD,Date.now()+8*60*60*1000),expiresIn:28800},200,cors);
   }
   if(url.pathname==="/api/orders"&&request.method==="POST") {
    const order=await request.json(); const problem=validOrder(order); if(problem) return json({error:problem},400,cors);
    // Ignore any client-supplied database key; Firebase creates the order ID.
    const saved=await rtdb(env,"orders","POST",order);
    return json({ok:true,name:saved.name},201,cors);
   }
   if(url.pathname==="/api/admin/orders"&&request.method==="GET") {
    if(!await isAdmin(request,env)) return json({error:"Admin login လုပ်ရန် လိုအပ်ပါသည်။"},401,cors);
    return json(await rtdb(env,"orders"),200,cors);
   }
   return json({error:"Not found"},404,cors);
  } catch(e) { return json({error:e?.message||"Server error"},500,cors); }
 }
};
