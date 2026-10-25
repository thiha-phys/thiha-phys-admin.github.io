# စာအုပ်အော်ဒါ

Build tool မလိုသော root-level static app:

- `index.html` — Customer order form
- `admin.html` — Create Order နှင့် Firebase မှ Order History
- `books.json` — စာအုပ်ဈေးနှုန်းနှင့်အလေးချိန်
- `cities.json` — ပူးတွဲပေးထားသော Excel မှ မြို့နှင့် ပို့ခ ၂၂၃ ခု
- `firebase.js` — Firebase Realtime Database URL

ဤ app အော်ဒါများကို Firebase ရှိ `/bookOrders` path တွင် သီးခြားသိမ်းသည်။

စာအုပ်ဈေးနှုန်း tier ကို စာအုပ်တစ်မျိုးချင်း၏ အရေအတွက်အလိုက် ၁–၉၊ ၁၀–၂၉၊ ၃၀–၄၉၊ ၅၀+ ဟုတွက်သည်။ မြို့စာရင်းနှင့် နှုန်းထားများကို ပေးထားသော `royal list.xlsx` မှ `cities.json` ထဲသို့ ထည့်ထားသည်။ မြို့ကို search box ကိုနှိပ်ရုံဖြင့် စာရင်းအားလုံးပြပြီး မြန်မာစာ `ရ` သို့မဟုတ် အင်္ဂလိပ် `y` အပါအဝင် ရိုက်ထည့်သောစာသားအလိုက် ရှာနိုင်သည်။

ပို့ခကို spreadsheet ရှိ သက်ဆိုင်ရာမြို့၏ ၂ kg အထိ နှုန်းထားပေါ် အခြေခံပြီး ၂ kg ကျော်သော အလေးချိန် တစ် kg စီ (စတင်ကျော်သည့် အပိုင်းပါဝင်) အတွက် `nextKg` နှုန်းထားထပ်ပေါင်း၍ တွက်သည်။ တွက်ချက်ရာတွင် စာအုပ်တစ်အုပ်ချင်း၏ အလေးချိန်ကိုသုံးပြီး customer app နှင့် admin app နှစ်ခုလုံးတွင် ပို့ခနှင့် စုစုပေါင်းကို ချက်ချင်းပြသည်။

Firebase database URL ကို `firebase.js` တွင်ထားသည်။ Browser မှ Realtime Database REST API ကို တိုက်ရိုက်ခေါ်သောကြောင့် database rules က `/bookOrders` ကို create/read လုပ်ခွင့်ပေးရမည်။ Firebase URL ကို စမ်းသပ်ကြည့်ရာ database မှ HTTP 200 ပြန်ရသော်လည်း ဒီစစ်ဆေးမှုသည် order ရေးခွင့်ကို မစမ်းသပ်ထားပါ။

**စမ်းသပ်ရန်သာ:** Admin login/auth မထည့်ထားပါ။ Firebase order data ထဲတွင် အမည်၊ ဖုန်းနှင့် လိပ်စာများပါမည်။ Database ကို အများပြည်သူဖတ်/ရေးခွင့်ဖွင့်ထားလျှင် မည်သူမဆို order data ကို ဖတ်နိုင်/ပြင်နိုင်သည်။ စမ်းသပ်ဒေတာသာသုံးပါ။ တကယ့် customer data အသုံးမပြုမီ Firebase Authentication နှင့် database rules ဖြင့် Admin ဖတ်ရှုခွင့်ကို ကာကွယ်ပါ။

Local testing အတွက် repository root ကို static file server ဖြင့်ဖွင့်ပါ (ဥပမာ `python3 -m http.server 8080`), ထို့နောက် `/` နှင့် `/admin.html` ကိုစမ်းသပ်ပါ။ `file://` ဖြင့်ဖွင့်ပါက JSON fetch ကို browser က ပိတ်နိုင်သည်။

## Browser app အဖြစ် install လုပ်ရန်

HTTPS ဖြင့် host လုပ်ထားသော site ကို Chrome သို့မဟုတ် Edge တွင်ဖွင့်ပါ။ Browser က install လုပ်နိုင်ကြောင်း သတ်မှတ်ပါက navigation ထဲရှိ **Install app** ကိုနှိပ်ပါ၊ သို့မဟုတ် browser menu မှ **Install app** ကိုရွေးပါ။ iPhone/iPad တွင် Safari ၏ Share menu မှ **Add to Home Screen** ကိုရွေးပါ။ Service worker က app ဖိုင်များကို offline အတွက်သိမ်းထားသော်လည်း အော်ဒါတင်ခြင်းနှင့် Firebase မှ history ဖတ်ခြင်းအတွက် အင်တာနက်လိုအပ်သည်။
