const SHEET_NAME = 'Profiles';
const HEADERS = ['Name', 'Job', 'Email', 'Phone'];
const ORDERS_SHEET_NAME = 'Book Orders';
const ORDER_HEADERS = [
  'Voucher No', 'Name', 'Address', 'Phone 1', 'Phone 2', 'Ordered Date', 'Deliver Date',
  'Special Qty', 'Special Amount',
  'Practice Qty', 'Practice Amount',
  'OQ Qty', 'OQ Amount',
  'Solution Qty', 'Solution Amount',
  'G11 Handbook Qty', 'G11 Handbook Amount',
  'G11 Objective Qty', 'G11 Objective Amount',
  'G10 Handbook Qty', 'G10 Handbook Amount',
  'Total', 'Payment Method', 'Received', 'KPay Account', 'Pay Date',
  'Delivery Service', 'Delivery Fees', 'Total KG', 'Cash Collection',
  'Delivery Notes', 'Facebook Name', 'Facebook Link', 'Royal Voucher'
];
const ORDER_HEADER_ALIASES = {
  'Phone': 'Phone 1',
  'Order Date': 'Ordered Date',
  'Delivered Date': 'Deliver Date',
  'Order Confirm': 'Deliver Date',
  'Old Questions Qty': 'OQ Qty',
  'Old Questions Amount': 'OQ Amount',
  'Grade 11 Handbook Qty': 'G11 Handbook Qty',
  'Grade 11 Handbook Amount': 'G11 Handbook Amount',
  'Grade 11 Objective Qty': 'G11 Objective Qty',
  'Grade 11 Objective Amount': 'G11 Objective Amount',
  'Grade 10 Handbook Qty': 'G10 Handbook Qty',
  'Grade 10 Handbook Amount': 'G10 Handbook Amount',
  'Amount Received': 'Received',
  'Royal VOC No': 'Royal Voucher',
  'Delivery': 'Delivery Service',
  'Facebook Account Name': 'Facebook Name'
};
const BOOK_ORDER_ITEMS = [
  {
    id: 'special', name: 'သင်ရိုးကုန် အထူးထုတ်',
    quantityHeader: 'Special Qty', amountHeader: 'Special Amount', weight: 0.7,
    prices: [20000, 19000, 18000, 17000, 16000]
  },
  {
    id: 'practice', name: 'Practice Book',
    quantityHeader: 'Practice Qty', amountHeader: 'Practice Amount', weight: 0.44925,
    prices: [13000, 12000, 11500, 11000, 10500]
  },
  {
    id: 'old-questions', name: 'မေးခွန်းဟောင်းစာအုပ်',
    quantityHeader: 'OQ Qty', amountHeader: 'OQ Amount', weight: 0.4668,
    prices: [11000, 10000, 9500, 9000, 8800]
  },
  {
    id: 'solution', name: 'တွက်စာသီးသန့်စာအုပ်',
    quantityHeader: 'Solution Qty', amountHeader: 'Solution Amount', weight: 0.10437,
    prices: [5000, 4500, 4000, 4000, 3800]
  },
  {
    id: 'g11-handbook', name: 'Grade 11 စာသင်ခန်းသုံး စာအုပ်',
    quantityHeader: 'G11 Handbook Qty', amountHeader: 'G11 Handbook Amount', weight: 0.3,
    prices: [10000, 9000, 8500, 8000, 8000]
  },
  {
    id: 'g11-objective', name: 'Grade 11 တစ်မှတ်တန် သီးသန့်စာအုပ်',
    quantityHeader: 'G11 Objective Qty', amountHeader: 'G11 Objective Amount', weight: 0.25,
    prices: [8000, 7000, 6500, 6500, 6500]
  },
  {
    id: 'g10-handbook', name: 'Grade 10 စာသင်ခန်းသုံး စာအုပ်',
    quantityHeader: 'G10 Handbook Qty', amountHeader: 'G10 Handbook Amount', weight: 0.2,
    prices: [10000, 9000, 8500, 8000, 8000]
  }
];
const ORDER_PRICE_THRESHOLDS = [0, 10, 30, 50, 100];
const ROYAL_SERVICE_FEE = 300;
const COD_MAX_TOTAL = 150000;
const DELIVERY_CITY_ROWS = [["Hinthada","ဟင်္သာတ",4500,1350],["Maubin","မအူပင်",4500,1350],["Mawlamyinegyun","မော်လမြိုင်ကျွန်း",4950,1350],["Myaungmya","မြောင်းမြ",4500,1350],["Nyaungtone","ညောင်တုန်း",4500,1350],["Pathein","ပုသိမ်",4500,1350],["Pyapon","ဖျာပုံ",4500,1350],["Wakema","ဝါးခယ်မ",4500,1350],["Kyaiklat","ကျိုက်လတ်",4500,1350],["Pantanaw","ပန်းတနော်",4500,1350],["Zalun","ဇလွန်",4500,1350],["Bogale","ဘိုကလေး",4950,1350],["Labutta","လပွတ္တာ",4950,1350],["Danubyu","ဓနုဖြူ",4500,1350],["Ngathaingchaung","ငသိုင်းချောင်း",4500,1350],["Yegyi","ရေကြည်",4500,1350],["Kyonpyaw","ကျုံပျော်",4500,1350],["Ahtaung","အထောင်",4500,1350],["Kyaunggon","ကျောင်းကုန်း",4500,1350],["Thabaung","သာပေါင်း",4950,1350],["Chaung Thar","ချောင်းသာ",4950,1350],["Myanaung","မြန်အောင်",4950,1350],["Kyangin","ကြံခင်း",4950,1350],["Paungde","ပေါင်းတည်",4050,1350],["Einme","အိမ်မဲ",4500,1350],["Dedaye","ဒေးဒရဲ",4500,1350],["Kangyidaunt","ကန်ကြီးထောင့်",4500,1350],["Ngapudaw","ငပုတော",4950,1350],["Ingapu","အင်္ဂပူ",4950,1350],["Lemyethna","လေးမျက်နှာ",4950,1350],["Kyonemangay","ကျုံမငေး",4950,1350],["Htugyi","ထူးကြီး",4950,1350],["Darka","ဒါးက",4500,1350],["Ngwesaung","ငွေဆောင်",4950,1350],["Atthoke","အသုတ်",4500,1350],["Sar Ma Lauk","ဆားမလောက်",4500,1350],["Bago","ပဲခူး",4050,1350],["Nyaunglebin","ညောင်လေးပင်",4050,1350],["Daik-U","ဒိုက်ဦး",4050,1350],["Phyu","ဖြူး",4050,1350],["Pyay","ပြည်",4050,1350],["Taungoo","တောင်ငူ",4050,1350],["Tharyarwaddy","သာယာဝတီ",4050,1350],["Thonese","သုံးဆယ်",4050,1350],["Gyobingauk","ကြို့ပင်ကောက်",4050,1350],["Nattalin","နတ်တလင်း",4050,1350],["Yae Ni","ရေနီ",4050,1350],["Letpadan","လက်ပံတန်း",4050,1350],["Thanatpin","သနပ်ပင်",4500,1350],["Lower MinHla","အောက်မင်းလှ",4050,1350],["Kaytumaddy","ကေတုမတီ",4050,1350],["ShweDaung","ရွှေတောင်",4050,1350],["Inntakaw","အင်းတကော်",4050,1350],["Waw","ဝေါ",4050,1350],["Kyauktaga","ကျောက်တံခါး",4050,1350],["Yedashay","ရေတာရှည်",4050,1350],["Zigon","ဇီးကုန်း",4050,1350],["Oktwin","အုတ်တွင်း",4050,1350],["OkeShitPin","ဥရှစ်ပင်",4500,1350],["Penwegon","ပဲနွယ်ကုန်း",4050,1350],["HpaYarGyi","ဘုရားကြီး",4050,1350],["Monyo","မိုးညို",4500,1350],["Paungtale","ပေါင်းတလည်",4500,1350],["Okpho","အုတ်ဖို",4050,1350],["Thegon","သဲကုန်း",4500,1350],["Shwegyin","ရွှေကျင်",4500,1350],["Pyuntasa","ပြွန်တန်ဆာ",4050,1350],["Innma","အင်းမ",4050,1350],["Kanyutkwin","ကညွတ်ကွင်း",4050,1350],["Tharkaya","သာဂရ",4050,1350],["Myohla","မြို့လှ",4050,1350],["Kawa","ကဝ",4500,1350],["Sitkwin","စစ်ကွင်း",4050,1350],["Oaethaekone","အိုးသည်ကုန်း",4050,1350],["Shwelaung","ရွှေတောင်",4500,1350],["NyaungChayHtauk","ညောင်ခြေထောက်",4500,1350],["Swar","ဆွာ",4050,1350],["Padaung","ပန်းတောင်း",4500,1350],["Hakha","ဟားခါး",6750,1800],["Myitkyina","မြစ်ကြီးနား",5850,1800],["Mogaung","မိုးကောင်း",4950,1350],["Mohnyin","မိုးညှင်း",4950,1350],["Hpakan","ဖားကန့်",5850,1800],["Bhamaw","ဗန်းမော်",4950,1350],["Waingmaw","ဝိုင်းမော်",4950,1350],["Danai","တနိုင်း",5850,1800],["Namti","နမ္မတီး",4950,1350],["Momauk","မိုးမောက်",4950,1350],["Loikaw","လွိုင်ကော်",5850,1800],["Hpa-An","ဘားအံ",4500,1350],["Myawaddy","မြဝတီ",8100,2250],["Kawkareik","ကော့ကရိတ်",6750,1800],["Hlaingbwe","လှိုင်းဘွဲ့",4500,1350],["Myaingkalay","မြိုင်ကလေး",4500,1350],["Bagan","ပုဂံ",4050,1350],["Nyaung-U","ညောင်ဦး",4050,1350],["Kyaukse","ကျောက်ဆည်",3600,1350],["Mandalay","မန္တလေး",3600,1350],["Meiktila","မိတ္ထီလာ",3600,1350],["Wundwin","ဝမ်းတွင်း",3600,1350],["Mahlaing","မလှိုင်",3600,1350],["Mogok","မိုးကုတ်",4500,1350],["Myingyan","မြင်းခြံ",4050,1350],["Pyawbwe","ပျော်ဘွယ်",3600,1350],["Pyin Oo Lwin","ပြင်ဦးလွင်",2975,1275],["Yamethin","ရမည်းသင်း",3600,1350],["Kyaukpadaung","ကျောက်ပန်းတောင်း",4050,1350],["Sintgaing","စဉ့်ကိုင်",3600,1350],["Kume","ကူမဲ",3600,1350],["Thazi","သာစည်",4050,1350],["Madaya","မတ္တရာ",4050,1350],["Myitthar","မြစ်သား",3600,1350],["Paukkhaung","ပေါက်ခေါင်း",4500,1350],["Ohn Chaw","အုန်းချော",3600,1350],["Taungtha","တောင်သာ",4050,1350],["Anesakhan","အနီးစခန်း",3600,1350],["Amarapura","အမရပူရ",3600,1350],["Myintnge","မြင့်ငယ်",3600,1350],["Natoegyi","နွားထိုးကြီး",4050,1350],["Han Myint Mo","ဟန်မြင့်မိုရ်",3600,1350],["Tada-U","တံတားဦး",3600,1350],["Zeepingyi","ဇီးပင်ကြီး",3600,1350],["Patheingyi","ပုသိမ်ကြီး",3600,1350],["Aunglan","အောင်လံ",4050,1350],["Chauk","ချောက်",4050,1350],["Magway","မကွေး",4050,1350],["Minbu","မင်းဘူး",4050,1350],["Pakokku","ပခုက္ကူ",4050,1350],["Yesagyo","ရေစကြို",3600,1350],["Taungtwingyi","တောင်တွင်းကြီး",4050,1350],["Thayed","သရက်",4050,1350],["Yenanchaung","ရေနံချောင်း",4050,1350],["Pwintbyu","ပွင့်ဖြူ",4050,1350],["NatMauk","နတ်မောက်",4050,1350],["Salin","စလင်း",4050,1350],["SinHpyuKyun","ဆင်ဖြူကျွန်း",4050,1350],["Satthwar","ဆတ်သွား",4050,1350],["Myothit","မြို့သစ်",4050,1350],["Kamma","ကံမ (သရက်)",4050,1350],["Mindone","မင်းတုန်း",4050,1350],["Ngape","ငဖဲ",4050,1350],["Upper Minhla","အထက်မင်းလှ",4050,1350],["Saku","စကု",4050,1350],["Salay","စလေ",4050,1350],["Seik Phyu","ဆိပ်ဖြူ",4050,1350],["Kamma (Pakokku)","ကံမ (ပခုက္ကူ)",4050,1350],["SinBaungWe","ဆင်ပေါင်ဝဲ",4050,1350],["Mawlamyine","မော်လမြိုင်",4500,1350],["Bilin","ဘီးလင်း",4500,1350],["Mudon","မုဒုံ",4950,1350],["Thaton","သထုံ",4500,1350],["Ye","ရေး",4950,1350],["Thanbyuzayat","သံဖြူဇရပ်",4950,1350],["Kyaikto","ကျိုက်ထို",4500,1350],["Paung","ပေါင်",4500,1350],["Mottama","မုတ္တမ",4500,1350],["Kyaikmaraw","ကျိုက်မရော",4950,1350],["Kyaikkhami","ကျိုက္ခမီ",4950,1350],["Kyaikkaw","ကျိုက်ကော်",4500,1350],["Chaungzone","ချောင်းဆုံ",4950,1350],["Thein Za Yat","သိမ်ဇရပ်",4950,1350],["ZinKyaik","ဇင်းကျိုက်",4500,1350],["Naypyidaw","နေပြည်တော်",3600,1350],["Tatkon","တပ်ကုန်း",3600,1350],["Tharwuthti","သာဝတ္ထိ",3600,1350],["Zeyawaddy","ဇေယျဝတီ",4050,1350],["Sittwe","စစ်တွေ",6750,1800],["Toungup","တောင်ကုတ်",6750,1800],["Thandwe","သံတွဲ",6750,1800],["Kyaukpyu","ကျောက်ဖြူ",6750,1800],["Min Pyar","မင်းပြား",6750,1800],["Ann","အန်း",6750,1800],["Kyauktaw","ကျောက်တော်",6750,1800],["Mrauk-U","မြောက်ဦး",6750,1800],["Ramree","ရမ်းဗြဲ",6750,1800],["Kalay","ကလေး",4950,1350],["Monywa","မုံရွာ",4050,1350],["Sagaing","စစ်ကိုင်း",3600,1350],["Shwebo","ရွှေဘို",4050,1350],["Tamu","တမူး",4950,1350],["Katha","ကသာ",4950,1350],["Kawlin","ကောလင်း",4950,1350],["Tigyaing","ထီးချိုင့်",4950,1350],["Myinmu","မြင်းမူ",4050,1350],["Seikkhun","ဆိပ်ခွန်",4050,1350],["Pyinywa","ပြင်ရွာ",4500,1350],["Indaw","အင်းတော်",4950,1350],["Aungpan","အောင်ပန်း",4050,1350],["Kalaw","ကလော",4050,1350],["Lashio","လားရှိုး",5850,1800],["Kyaukme","ကျောက်မဲ",4950,1350],["Hsipaw","သီပေါ",4950,1350],["Muse","မူဆယ်",6750,1800],["Taunggyi","တောင်ကြီး",4050,1350],["Yatsauk","ရပ်စောက်",4500,1350],["Pinlaung","ပင်လောင်း",4500,1350],["Kengtung","ကျိုင်းတုံ",8550,2250],["Tachileik","တာချီလိတ်",8550,2250],["Nyaungshwe","ညောင်ရွှေ",4500,1350],["Ayetharyar","အေးသာယာ",4050,1350],["Hopong","ဟိုပုံး",4500,1350],["Nawnghkio","နောင်ချို",4950,1350],["Pindaya","ပင်းတယ",4500,1350],["Loilem","လွိုင်လင်",4500,1350],["HeHoe","ဟဲဟိုး",4050,1350],["Ywangan","ရွာငံ",4500,1350],["Namhkam","နမ့်ခမ်း",3600,1350],["Namtu","နမ္မတူ",4950,1350],["Kutkai","ကွတ်ခိုင်",3600,1350],["Shwenyaung","ရွှေညောင်",4050,1350],["Dawei","ထားဝယ်",6750,1800],["Myeik","မြိတ်",8100,2250],["Kawthoung","ကော့သောင်း",8550,2250],["Yangon","ရန်ကုန်",4050,1350],["Hlegu","လှည်းကူး",4050,1350],["Thongwa","သုံးခွ",4050,1350],["Hmawbi","မှော်ဘီ",4050,1350],["Taikkyi","တိုက်ကြီး",4050,1350],["Twantay","တွံတေး",4050,1350],["Kyauktan","ကျောက်တန်း",4050,1350],["Kungyangone","ကွမ်းခြံကုန်း",4050,1350],["Ahpyauk","အဖျောက်",4050,1350],["Kawhmu","ကော့မှူး",4050,1350]];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('A JSON request body is required.');
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    if (action === 'createOrder') {
      return createBookOrder_(request.order);
    }
    if (action === 'listOrders') {
      return jsonResponse_({ ok: true, orders: listBookOrders_() });
    }
    if (action === 'updateOrder') {
      return updateBookOrder_(request.order);
    }
    if (action === 'getDeliveryCities') {
      return jsonResponse_({ ok: true, cities: getDeliveryCities_() });
    }
    if (action === 'getBookStock') {
      return jsonResponse_({ ok: true, stock: getBookStock_() });
    }
    if (action === 'addBookStock') {
      return addBookStock_(request.stock);
    }
    if (action === 'submitFeedback') {
      return submitRecommendation_(request.profile);
    }

    const profile = request.profile;

    if (action !== 'create' && action !== 'update' && action !== 'lookup') {
      throw new Error('Action must be "create", "update", or "lookup".');
    }
    if (!profile || typeof profile !== 'object') {
      throw new Error('Profile data is required.');
    }

    if (action === 'lookup') {
      const phone = normalizePhone_(profile.phone);
      if (!phone) throw new Error('Phone is required.');

      const sheet = getProfilesSheet_();
      const phoneRows = findPhoneRows_(sheet, phone);
      if (phoneRows.length === 0) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_NOT_FOUND',
          message: 'No profile was found for this phone number.'
        });
      }
      if (phoneRows.length > 1) {
        throw new Error('More than one row has this phone number; lookup was stopped.');
      }

      const values = sheet.getRange(phoneRows[0], 1, 1, HEADERS.length).getDisplayValues()[0];
      return jsonResponse_({
        ok: true,
        action: 'found',
        profile: {
          name: values[0],
          job: values[1],
          email: values[2],
          phone: formatPhone_(normalizePhone_(values[3]))
        }
      });
    }

    const normalizedProfile = normalizeProfile_(profile);
    const lookupPhone = action === 'update' && profile.lookupPhone
      ? normalizePhone_(profile.lookupPhone)
      : normalizedProfile.phone;

    if (action === 'update' && !lookupPhone) {
      throw new Error('A lookup phone is required for profile updates.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getProfilesSheet_();
      const phoneRows = findPhoneRows_(sheet, lookupPhone);

      if (action === 'create') {
        if (phoneRows.length > 0) {
          return jsonResponse_({
            ok: false,
            error: 'PHONE_EXISTS',
            message: 'A profile with this phone number already exists.'
          });
        }

        appendProfile_(sheet, normalizedProfile);
        return jsonResponse_({ ok: true, action: 'created', profile: normalizedProfile });
      }

      if (phoneRows.length === 0) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_NOT_FOUND',
          message: 'No profile was found for this phone number.'
        });
      }
      if (phoneRows.length > 1) {
        throw new Error('More than one row has the lookup phone number; update was stopped.');
      }

      const newPhoneRows = findPhoneRows_(sheet, normalizedProfile.phone);
      if (normalizePhone_(normalizedProfile.phone) !== lookupPhone &&
          newPhoneRows.some((row) => row !== phoneRows[0])) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_EXISTS',
          message: 'Another profile already uses the new phone number.'
        });
      }

      writeProfile_(sheet, phoneRows[0], normalizedProfile);
      return jsonResponse_({ ok: true, action: 'updated', profile: normalizedProfile });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function listBookOrders_() {
  const sheet = getOrdersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues()
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) {
      const order = {};
      headers.forEach(function (header, index) {
        if (header) order[header] = row[index];
      });
      return order;
    });
}

function updateBookOrder_(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Order data is required.');
  }
  const voucherNo = requiredText_(order.voucherNo, 'Voucher No');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('No orders were found.');
    const voucherRows = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
      .reduce(function (rows, values, index) {
        if (String(values[0]).trim() === voucherNo) rows.push(index + 2);
        return rows;
      }, []);
    if (voucherRows.length === 0) throw new Error('No order was found for this voucher number.');
    if (voucherRows.length > 1) throw new Error('Duplicate voucher numbers were found; update was stopped.');

    const rowNumber = voucherRows[0];
    const columnCount = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, columnCount).getDisplayValues()[0];
    const range = sheet.getRange(rowNumber, 1, 1, columnCount);
    const values = range.getDisplayValues()[0];
    headers.forEach(function (header, index) {
      if (header === 'Voucher No' || !ORDER_HEADERS.includes(header)) return;
      let inputHeader = header;
      if (!Object.prototype.hasOwnProperty.call(order, inputHeader)) {
        inputHeader = Object.keys(ORDER_HEADER_ALIASES).find(function (alias) {
          return ORDER_HEADER_ALIASES[alias] === header &&
            Object.prototype.hasOwnProperty.call(order, alias);
        });
      }
      if (!inputHeader) return;
      const value = order[inputHeader] == null ? '' : String(order[inputHeader]);
      values[index] = sheetSafeText_(value);
    });
    range.setNumberFormat('@');
    range.setValues([values]);
    const updated = {};
    headers.forEach(function (header, index) {
      if (header) updated[header] = values[index];
    });
    return jsonResponse_({ ok: true, order: updated });
  } finally {
    lock.releaseLock();
  }
}

function getBookStock_() {
  const stockSheet = getBookStockSheet_();
  const stockLastRow = stockSheet.getLastRow();
  const orders = listBookOrders_();
  return BOOK_ORDER_ITEMS.map(function (book, bookIndex) {
    const column = bookIndex * 2 + 1;
    const incoming = [];
    if (stockLastRow >= 3) {
      const values = stockSheet.getRange(3, column, stockLastRow - 2, 2).getDisplayValues();
      values.forEach(function (row) {
        const quantity = Number(row[1]);
        if (row[0] && Number.isSafeInteger(quantity) && quantity > 0) {
          incoming.push({ date: row[0], quantity: quantity });
        }
      });
    }
    const received = incoming.reduce(function (sum, entry) { return sum + entry.quantity; }, 0);
    const delivered = orders.reduce(function (sum, order) {
      if (!order['Deliver Date']) return sum;
      return sum + Number(order[book.quantityHeader] || 0);
    }, 0);
    return {
      id: book.id,
      name: book.name,
      received: received,
      delivered: delivered,
      remaining: received - delivered,
      entries: incoming
    };
  });
}

function addBookStock_(stock) {
  if (!stock || typeof stock !== 'object') {
    throw new Error('Stock entry is required.');
  }
  const bookIndex = BOOK_ORDER_ITEMS.findIndex(function (book) { return book.id === stock.bookId; });
  const quantity = Number(stock.quantity);
  const date = requiredText_(stock.date, 'Stock date');
  if (bookIndex < 0) throw new Error('Book type is invalid.');
  const parsedDate = new Date(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Stock date must be a valid date in YYYY-MM-DD format.');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Stock quantity must be a positive whole number.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getBookStockSheet_();
    const column = bookIndex * 2 + 1;
    const lastRow = Math.max(sheet.getLastRow(), 2);
    const dates = lastRow > 2
      ? sheet.getRange(3, column, lastRow - 2, 1).getDisplayValues()
      : [];
    const entryRow = dates.reduce(function (last, values, index) {
      return values[0] ? index + 3 : last;
    }, 2) + 1;
    const range = sheet.getRange(entryRow, column, 1, 2);
    range.setNumberFormat('@');
    range.setValues([[date, String(quantity)]]);
    return jsonResponse_({
      ok: true,
      entry: { bookId: stock.bookId, date: date, quantity: quantity },
      stock: getBookStock_()
    });
  } finally {
    lock.releaseLock();
  }
}

function getBookStockSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }
  let sheet = spreadsheet.getSheetByName('Book Stock');
  if (!sheet) sheet = spreadsheet.insertSheet('Book Stock');

  const requiredColumns = BOOK_ORDER_ITEMS.length * 2;
  if (sheet.getLastRow() === 0) {
    const headers = new Array(requiredColumns);
    BOOK_ORDER_ITEMS.forEach(function (book, index) {
      headers[index * 2] = book.name;
      headers[index * 2 + 1] = '';
    });
    sheet.getRange(1, 1, 1, requiredColumns).setValues([headers]);
    const subheaders = new Array(requiredColumns).fill('');
    BOOK_ORDER_ITEMS.forEach(function (_book, index) {
      subheaders[index * 2] = 'Stock Date';
      subheaders[index * 2 + 1] = 'Quantity';
    });
    sheet.getRange(2, 1, 1, requiredColumns).setValues([subheaders]);
    sheet.setFrozenRows(2);
  } else {
    const actual = sheet.getRange(1, 1, 2, requiredColumns).getDisplayValues();
    const isValid = BOOK_ORDER_ITEMS.every(function (book, index) {
      return actual[0][index * 2] === book.name &&
        actual[1][index * 2] === 'Stock Date' &&
        actual[1][index * 2 + 1] === 'Quantity';
    });
    if (!isValid) {
      throw new Error('The Book Stock sheet must contain the expected seven book tables.');
    }
  }
  return sheet;
}

function getDeliveryCities_() {
  return DELIVERY_CITY_ROWS.map(function (row) {
    return {
      english: row[0],
      myanmar: row[1],
      label: row[0] + ' (' + row[1] + ')',
      upTo2Kg: row[2],
      nextKg: row[3]
    };
  });
}

function findDeliveryCity_(value) {
  const cityName = value == null
    ? ''
    : String(value).trim().toLocaleLowerCase().replace(/မြို့/g, '').trim();
  if (!cityName) return null;
  const city = DELIVERY_CITY_ROWS.find(function (row) {
    return cityName === row[0].toLocaleLowerCase() ||
      cityName === row[1].toLocaleLowerCase() ||
      cityName === (row[0] + ' (' + row[1] + ')').toLocaleLowerCase();
  });
  return city || null;
}

function normalizeDeliveryService_(value) {
  const service = value == null ? '' : String(value).trim().toLocaleLowerCase();
  if (!service) return '';
  if (service === 'royal' || service === 'royal delivery' ||
      service === 'royal delivery service') return 'Royal';
  if (service === 'car' || service === 'car delivery' ||
      service === 'ကားတင်ရန်' || service === 'ကားတင်' || service === 'ကား') return 'Car';
  throw new Error('Delivery service must be Royal or Car.');
}

function calculateRoyalDeliveryFee_(totalWeight, city) {
  const packageCount = Math.max(1, Math.ceil(totalWeight / 5 - 0.000000001));
  const fullPackageFee = city[2] + 3 * city[3];
  const lastPackageWeight = totalWeight - 5 * (packageCount - 1);
  const lastPackageExtraKg = Math.ceil(Math.max(0, lastPackageWeight - 2) - 0.000000001);
  return (packageCount - 1) * fullPackageFee +
    city[2] + lastPackageExtraKg * city[3] + ROYAL_SERVICE_FEE;
}

function bookUnitPrice_(book, quantity) {
  const priceTier = ORDER_PRICE_THRESHOLDS.reduce(function (tier, threshold, index) {
    return quantity >= threshold ? index : tier;
  }, 0);
  return book.prices[priceTier];
}

function buildOrderAddress_(order, city) {
  const streetAddress = order.streetAddress || order.addressDetails || order.address;
  const details = [
    order.township,
    order.ward,
    order.street,
    order.houseNumber || order.houseNo,
    streetAddress
  ].filter(function (value) {
    return value != null && String(value).trim() !== '';
  }).map(function (value) {
    return String(value).trim();
  });
  if (city) {
    const detailText = details.join(', ').toLocaleLowerCase();
    const containsCity = detailText.indexOf(city[0].toLocaleLowerCase()) !== -1 ||
      detailText.indexOf(city[1].toLocaleLowerCase()) !== -1;
    if (!containsCity) details.unshift(city[0] + ' (' + city[1] + ')');
  }
  return requiredText_(details.join(', '), 'Address');
}

function createBookOrder_(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Order data is required.');
  }

  const name = requiredText_(order.name, 'Name');
  const phone = normalizePhone_(order.phone || order.phone1);
  if (!phone) throw new Error('Phone is required.');
  const phone2 = normalizePhone_(order.phone2 || order.phoneSecondary);
  const paymentMethod = order.paymentMethod == null ? '' : String(order.paymentMethod).trim();
  if (!Array.isArray(order.items)) {
    throw new Error('A list of book quantities is required.');
  }

  const quantities = {};
  order.items.forEach(function (item) {
    if (!item || typeof item.id !== 'string' || quantities[item.id] !== undefined) {
      throw new Error('Book item is invalid or repeated.');
    }
    const book = BOOK_ORDER_ITEMS.find(function (candidate) {
      return candidate.id === item.id;
    });
    const quantity = Number(item.quantity);
    if (!book || !Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error('Book quantity is invalid.');
    }
    quantities[item.id] = quantity;
  });
  if (BOOK_ORDER_ITEMS.some(function (book) { return quantities[book.id] === undefined; })) {
    throw new Error('All book quantities must be provided.');
  }

  const itemCount = BOOK_ORDER_ITEMS.reduce(function (sum, book) {
    return sum + quantities[book.id];
  }, 0);
  if (!Number.isSafeInteger(itemCount)) {
    throw new Error('Total book quantity is too large.');
  }
  let total = 0;
  let totalWeight = 0;
  const itemRows = [];
  BOOK_ORDER_ITEMS.forEach(function (book) {
    const quantity = quantities[book.id];
    const unitPrice = bookUnitPrice_(book, quantity);
    const amount = quantity * unitPrice;
    totalWeight += quantity * book.weight;
    total += amount;
    itemRows.push({
      id: book.id,
      name: book.name,
      quantity: quantity,
      unitPrice: unitPrice,
      amount: amount
    });
  });
  if (total <= 0) {
    throw new Error('At least one book must be ordered.');
  }
  if (!Number.isSafeInteger(total) || !Number.isFinite(totalWeight)) {
    throw new Error('The order total or weight is too large.');
  }
  totalWeight = Math.round(totalWeight * 100000) / 100000;

  const deliveryService = normalizeDeliveryService_(order.deliveryService || order.delivery);
  const cityValue = order.deliveryCity || order.city || order.cityName || '';
  const deliveryCityName = cityValue && typeof cityValue === 'object'
    ? cityValue.english || cityValue.englishName || cityValue.myanmar ||
      cityValue.myanmarName || cityValue.label
    : cityValue;
  const deliveryCity = deliveryCityName ? findDeliveryCity_(deliveryCityName) : null;
  if (deliveryService && !deliveryCity) {
    throw new Error('A valid delivery city is required.');
  }
  const deliveryFees = deliveryService === 'Royal'
    ? calculateRoyalDeliveryFee_(totalWeight, deliveryCity)
    : 0;
  const cashCollection = paymentMethod === 'COD' ? total + deliveryFees : 0;
  const address = buildOrderAddress_(order, deliveryCity);
  const carDetails = [order.carStation, order.carName].filter(Boolean).join(' / ') ||
    order.carDetails || order.deliveryNotes;
  const deliveryNotes = deliveryService === 'Car'
    ? requiredText_(carDetails, 'Car station and car name')
    : '';

  if (paymentMethod !== 'COD' && paymentMethod !== 'KBZ Pay') {
    throw new Error('Payment method must be COD or KBZ Pay.');
  }
  if (deliveryService === 'Car' && paymentMethod !== 'KBZ Pay') {
    throw new Error('KBZ Pay is required for car delivery.');
  }
  if (paymentMethod === 'COD' && total + deliveryFees >= COD_MAX_TOTAL) {
    throw new Error('COD is not available for orders totaling 150,000 kyats or more.');
  }

  const orderDate = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm:ss'
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_();
    const voucherNo = nextVoucherNo_(sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    const row = new Array(headers.length).fill('');
    const values = {
      'Voucher No': voucherNo,
      'Name': name,
      'Address': address,
      'Phone 1': formatPhone_(phone),
      'Phone 2': formatPhone_(phone2),
      'Ordered Date': orderDate,
      'Total': String(total),
      'Payment Method': paymentMethod,
      'Delivery Service': deliveryService,
      'Delivery Fees': String(deliveryFees),
      'Total KG': String(totalWeight),
      'Cash Collection': String(cashCollection),
      'Delivery Notes': deliveryNotes
    };
    BOOK_ORDER_ITEMS.forEach(function (book) {
      values[book.quantityHeader] = String(quantities[book.id]);
      values[book.amountHeader] = String(
        quantities[book.id] * bookUnitPrice_(book, quantities[book.id])
      );
    });
    headers.forEach(function (header, index) {
      if (Object.prototype.hasOwnProperty.call(values, header)) {
        row[index] = sheetSafeText_(values[header]);
      }
    });
    const nextRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(nextRow, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([row]);
    return jsonResponse_({
      ok: true,
      order: {
        voucherNo: voucherNo,
        name: name,
        address: address,
        phone: formatPhone_(phone),
        phone2: formatPhone_(phone2),
        orderDate: orderDate,
        paymentMethod: paymentMethod,
        total: total,
        deliveryService: deliveryService,
        deliveryFees: deliveryFees,
        totalKg: totalWeight,
        cashCollection: cashCollection,
        deliveryNotes: deliveryNotes,
        items: itemRows
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }
  let sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(ORDERS_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    if (sheet.getMaxColumns() < ORDER_HEADERS.length) {
      sheet.insertColumnsAfter(
        sheet.getMaxColumns(),
        ORDER_HEADERS.length - sheet.getMaxColumns()
      );
    }
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const actualHeaders = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    if (actualHeaders.indexOf('Voucher No') === -1) {
      throw new Error('The first row of the Book Orders sheet must contain a Voucher No column.');
    }
    const migratedHeaders = actualHeaders.map(function (header) {
      return ORDER_HEADER_ALIASES[header] || header;
    });
    const seen = {};
    migratedHeaders.forEach(function (header) {
      if (!header) return;
      if (seen[header]) {
        throw new Error('The Book Orders sheet contains duplicate column headers: ' + header);
      }
      seen[header] = true;
    });
    ORDER_HEADERS.forEach(function (header) {
      if (seen[header]) return;
      migratedHeaders.push(header);
      seen[header] = true;
    });
    if (migratedHeaders.length > sheet.getMaxColumns()) {
      sheet.insertColumnsAfter(
        sheet.getMaxColumns(),
        migratedHeaders.length - sheet.getMaxColumns()
      );
    }
    sheet.getRange(1, 1, 1, migratedHeaders.length).setValues([migratedHeaders]);
  }
  return sheet;
}

function nextVoucherNo_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return '001';
  }
  const currentMaximum = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
    .reduce(function (maximum, row) {
      const number = Number(row[0]);
      return Number.isInteger(number) && number > maximum ? number : maximum;
    }, 0);
  return String(currentMaximum + 1).padStart(3, '0');
}

function sheetSafeText_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function normalizeProfile_(profile) {
  const name = requiredText_(profile.name, 'Name');
  const job = profile.job == null && profile.occupation == null
    ? ''
    : String(profile.job || profile.occupation).trim();
  const email = profile.email == null ? '' : String(profile.email).trim();
  const phone = normalizePhone_(profile.phone);

  if (!phone) throw new Error('Phone is required.');

  return {
    name: name,
    job: job,
    email: email,
    phone: formatPhone_(phone)
  };
}

function requiredText_(value, fieldName) {
  const text = value == null ? '' : String(value).trim();
  if (!text) {
    throw new Error(fieldName + ' is required.');
  }
  return text;
}

function normalizePhone_(value) {
  const phone = value == null ? '' : String(value);
  return phone
    .replace(/[၀-၉]/g, function (digit) {
      return String(digit.charCodeAt(0) - '၀'.charCodeAt(0));
    })
    .replace(/\D/g, '');
}

function formatPhone_(digits) {
  if (!digits || digits.length !== 11 || digits[0] !== '0') return digits;
  return digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' +
    digits.slice(5, 8) + ' ' + digits.slice(8, 11);
}

function getProfilesSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const actualHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
    if (HEADERS.some((header, index) => actualHeaders[index] !== header)) {
      throw new Error('The first row of the Profiles sheet must be: ' + HEADERS.join(', '));
    }
  }

  return sheet;
}

function findPhoneRows_(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues()
    .reduce(function (rows, values, index) {
      if (normalizePhone_(values[0]) === phone) {
        rows.push(index + 2);
      }
      return rows;
    }, []);
}

function appendProfile_(sheet, profile) {
  const row = sheet.getLastRow() + 1;
  writeProfile_(sheet, row, profile);
}

function writeProfile_(sheet, row, profile) {
  const range = sheet.getRange(row, 1, 1, HEADERS.length);
  range.setNumberFormat('@');
  range.setValues([[profile.name, profile.job, profile.email, profile.phone]]);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
