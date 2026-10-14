(function () {
    const API_URL = 'https://script.google.com/macros/s/AKfycbxWcDQ_ue9hZPawB-svH9bkusQelPCdXyjXilzLgklfSxXFd74fOi3ydCoCpg0ZuEXg/exec';
    const DB_NAME = 'uthk-admin-cache';
    const DB_VERSION = 1;
    const CACHE_STORE = 'snapshots';
    const APP_SCRIPT = document.currentScript.src;
    const BOOK_SHOPS = [
        { id: 'ko-htun', name: 'ကိုထွန်းစာပေ', discountRate: 25, address: 'အမှတ် (၂၃၇)၊ (၃၆) လမ်း၊ အထက်ဘလောက်၊ ကျောက်တံတား။ ရန်ကုန်', phone1: '09-421 060 654', phone2: '09-269 433 200' },
        { id: 'bhone-myint-moe', name: 'ဘုန်းမြင့်မိုရ်စာပေ', address: 'အမှတ်(၈၂)ဝင်ပေါက်(စ)၊ ဗိုလ်ချုပ်ဈေးသစ်၊ ရန်ကုန်', phone1: '09-793 618 094', phone2: '09-269 433 200' },
        { id: 'shwe-linn-eain', name: 'ရွှေလင်းအိမ်စာပေ', address: 'အမှတ် ၈ ဖို့မြေလမ်းမကြီး (ဖို့မြေမှတ်တိုင်) ရမ္မာဝတီမုန့်တီဆိုင်အကျော်၊ သန်လျင်မြို့နယ်၊ ရန်ကုန်', phone1: '09-799 190 042' },
        { id: 'phyo-min-zaw', name: 'ဦးဖြိုးမင်းဇော်', address: '၃၂/၃၃ လမ်းကြား၊ ၈၆ လမ်း၊ မန္တလေး', phone1: '09-202 873 4' },
        { id: 'daw-way-way-htun', name: 'ဒေါ်ဝေဝေထွန်း', address: 'မန္တလေးမြို့' },
        { id: 'pyone-cho', name: 'ပြုံးချို', address: 'ပုသိမ်မြို့', phone1: '09-520 015 9' },
        { id: 'khet-mi', name: 'ခေတ်မီ', address: '၂၉ လမ်း၊ ၈၃ လမ်းနှင့် ၈၄ လမ်းကြား၊ တောင်ဆင်ကျုံးဝင်း၊ မန္တလေးမြို့', phone1: '02-406 813 1', phone2: '02-402 303 6' },
        { id: 'zin-yaw', name: 'ဇင်ယော်', address: 'မန္တလေး-လားရှိုးလမ်း၊ ရတနာဆွယ်တာဘေး၊ MMHK ဓာတ်ဆီဆိုင်အနီး၊ ပြင်ဦးလွင်မြို့', phone1: '09-442 046 095' },
        { id: 'kyaw-kyaw', name: 'ကျော်ကျော်စာပေ' },
        { id: 'kyaw-thein', name: 'ကျော်သိန်းစာပေ' },
        { id: 'setana', name: 'စေတနာစာပေ' },
        { id: 'wint-nadi-aung', name: 'ဝင့်နဒီအောင်စာပေ', address: 'အ.ထ.က (၁) ကျောင်းရှေ့၊ မြိတ်မြို့', phone1: '09-422 203 796' },
        { id: 'shwe-moe', name: 'ရွှေမိုးစာပေ', discountRate: 25, address: 'မန္တလေး', phone1: '09-756 276 027' },
        { id: 'ma-ei', name: 'မအိစာပေ', address: 'ရွှေစည်းခုံဘုရားတိုက်တန်း၊ ဝန်ဇင်းရပ်၊ မိတ္ထီလာ', phone1: '09-421 766 008', phone2: '09-988 315 429' },
        { id: 'htet-htet', name: 'ထက်ထက်စာပေ', address: 'အမှတ် ၁၄၂၊ ဝေပုလ္လ (၄) လမ်း၊ (ဃ) ရပ်ကွက်၊ မြောက်ဥက္ကလာပမြို့နယ်၊ အဝိုင်းအနီး၊ ရန်ကုန်', phone1: '09967775456', phone2: '09441382818' },
        { id: 'aung-thu', name: 'အောင်သူစာပေ', address: 'အမှတ် ၃၈၅/၃၈၇ ဗိုလ်ချုပ်လမ်းမပေါ်၊ ရွှေဘုံသာလမ်းနှင့် ၂၉ လမ်းကြား၊ ပန်းဘဲတန်း၊ ရန်ကုန်', phone1: '09-791 255 810', phone2: '09-694 441 169' },
        { id: 'naga', name: 'နဂါးစာပေ', address: 'အမှတ် (၂၉၀) (ခ)၊ ၈၃ လမ်း၊ ၂၉ လမ်းနှင့် ၃၀ လမ်းကြား၊ မန္တလေးမြို့', phone1: '02-403 526 7', phone2: '02-403 986 9' },
        { id: 'sayarchit', name: 'ဆရာချစ်', address: 'မင်းရာဇာဘာသာရပ်သင်ကိုယ်သင်တန်း၊ ပုသိမ်', phone1: '09-794 502 970' },
        { id: 'aung-naing', name: 'အောင်နိုင်စာပေ', address: 'အမှတ် (၁၁၅) လမ်းမတော်လမ်း၊ ပြည်', phone1: '09-260 986 075' },
        { id: 'myo-set-thit', name: 'မျိုးဆက်သစ်စာပေ', address: 'မကွေးမြို့', phone1: '09-259 887 188' },
        { id: 'kmk-shwe-pyinya', name: 'KMKရွှေပညာစာအုပ်တိုက်', address: '၂၀ ကုန်တိုက် City Mart နှင့် ရုပ်ရှင်ရုံအနီး၊ ၂၀ စျေးအရှေ့တည့်တည့်၊ မြိတ်လမ်းမ၊ ဒဂုံမြို့သစ်တောင်ပိုင်း၊ ရန်ကုန်', phone1: '09-269 433 200', phone2: '09-269 433 200' },
        { id: 'yaung-yin', name: 'ရောင်းရင်းစာပေ', address: 'ဘားအံမြို့', phone1: '09-566 197 2' }
    ];
    // Keep aligned with Code.gs, which validates the city and calculates authoritative fees.
    const DELIVERY_CITY_ROWS = [
        ["Hinthada","ဟင်္သာတ",4500,1350],
        ["Maubin","မအူပင်",4500,1350],
        ["Mawlamyinegyun","မော်လမြိုင်ကျွန်း",4950,1350],
        ["Myaungmya","မြောင်းမြ",4500,1350],
        ["Nyaungtone","ညောင်တုန်း",4500,1350],
        ["Pathein","ပုသိမ်",4500,1350],
        ["Pyapon","ဖျာပုံ",4500,1350],
        ["Wakema","ဝါးခယ်မ",4500,1350],
        ["Kyaiklat","ကျိုက်လတ်",4500,1350],
        ["Pantanaw","ပန်းတနော်",4500,1350],
        ["Zalun","ဇလွန်",4500,1350],
        ["Bogale","ဘိုကလေး",4950,1350],
        ["Labutta","လပွတ္တာ",4950,1350],
        ["Danubyu","ဓနုဖြူ",4500,1350],
        ["Ngathaingchaung","ငသိုင်းချောင်း",4500,1350],
        ["Yegyi","ရေကြည်",4500,1350],
        ["Kyonpyaw","ကျုံပျော်",4500,1350],
        ["Ahtaung","အထောင်",4500,1350],
        ["Kyaunggon","ကျောင်းကုန်း",4500,1350],
        ["Thabaung","သာပေါင်း",4950,1350],
        ["Chaung Thar","ချောင်းသာ",4950,1350],
        ["Myanaung","မြန်အောင်",4950,1350],
        ["Kyangin","ကြံခင်း",4950,1350],
        ["Paungde","ပေါင်းတည်",4050,1350],
        ["Einme","အိမ်မဲ",4500,1350],
        ["Dedaye","ဒေးဒရဲ",4500,1350],
        ["Kangyidaunt","ကန်ကြီးထောင့်",4500,1350],
        ["Ngapudaw","ငပုတော",4950,1350],
        ["Ingapu","အင်္ဂပူ",4950,1350],
        ["Lemyethna","လေးမျက်နှာ",4950,1350],
        ["Kyonemangay","ကျုံမငေး",4950,1350],
        ["Htugyi","ထူးကြီး",4950,1350],
        ["Darka","ဒါးက",4500,1350],
        ["Ngwesaung","ငွေဆောင်",4950,1350],
        ["Atthoke","အသုတ်",4500,1350],
        ["Sar Ma Lauk","ဆားမလောက်",4500,1350],
        ["Bago","ပဲခူး",4050,1350],
        ["Nyaunglebin","ညောင်လေးပင်",4050,1350],
        ["Daik-U","ဒိုက်ဦး",4050,1350],
        ["Phyu","ဖြူး",4050,1350],
        ["Pyay","ပြည်",4050,1350],
        ["Taungoo","တောင်ငူ",4050,1350],
        ["Tharyarwaddy","သာယာဝတီ",4050,1350],
        ["Thonese","သုံးဆယ်",4050,1350],
        ["Gyobingauk","ကြို့ပင်ကောက်",4050,1350],
        ["Nattalin","နတ်တလင်း",4050,1350],
        ["Yae Ni","ရေနီ",4050,1350],
        ["Letpadan","လက်ပံတန်း",4050,1350],
        ["Thanatpin","သနပ်ပင်",4500,1350],
        ["Lower MinHla","အောက်မင်းလှ",4050,1350],
        ["Kaytumaddy","ကေတုမတီ",4050,1350],
        ["ShweDaung","ရွှေတောင်",4050,1350],
        ["Inntakaw","အင်းတကော်",4050,1350],
        ["Waw","ဝေါ",4050,1350],
        ["Kyauktaga","ကျောက်တံခါး",4050,1350],
        ["Yedashay","ရေတာရှည်",4050,1350],
        ["Zigon","ဇီးကုန်း",4050,1350],
        ["Oktwin","အုတ်တွင်း",4050,1350],
        ["OkeShitPin","ဥရှစ်ပင်",4500,1350],
        ["Penwegon","ပဲနွယ်ကုန်း",4050,1350],
        ["HpaYarGyi","ဘုရားကြီး",4050,1350],
        ["Monyo","မိုးညို",4500,1350],
        ["Paungtale","ပေါင်းတလည်",4500,1350],
        ["Okpho","အုတ်ဖို",4050,1350],
        ["Thegon","သဲကုန်း",4500,1350],
        ["Shwegyin","ရွှေကျင်",4500,1350],
        ["Pyuntasa","ပြွန်တန်ဆာ",4050,1350],
        ["Innma","အင်းမ",4050,1350],
        ["Kanyutkwin","ကညွတ်ကွင်း",4050,1350],
        ["Tharkaya","သာဂရ",4050,1350],
        ["Myohla","မြို့လှ",4050,1350],
        ["Kawa","ကဝ",4500,1350],
        ["Sitkwin","စစ်ကွင်း",4050,1350],
        ["Oaethaekone","အိုးသည်ကုန်း",4050,1350],
        ["Shwelaung","ရွှေတောင်",4500,1350],
        ["NyaungChayHtauk","ညောင်ခြေထောက်",4500,1350],
        ["Swar","ဆွာ",4050,1350],
        ["Padaung","ပန်းတောင်း",4500,1350],
        ["Hakha","ဟားခါး",6750,1800],
        ["Myitkyina","မြစ်ကြီးနား",5850,1800],
        ["Mogaung","မိုးကောင်း",4950,1350],
        ["Mohnyin","မိုးညှင်း",4950,1350],
        ["Hpakan","ဖားကန့်",5850,1800],
        ["Bhamaw","ဗန်းမော်",4950,1350],
        ["Waingmaw","ဝိုင်းမော်",4950,1350],
        ["Danai","တနိုင်း",5850,1800],
        ["Namti","နမ္မတီး",4950,1350],
        ["Momauk","မိုးမောက်",4950,1350],
        ["Loikaw","လွိုင်ကော်",5850,1800],
        ["Hpa-An","ဘားအံ",4500,1350],
        ["Myawaddy","မြဝတီ",8100,2250],
        ["Kawkareik","ကော့ကရိတ်",6750,1800],
        ["Hlaingbwe","လှိုင်းဘွဲ့",4500,1350],
        ["Myaingkalay","မြိုင်ကလေး",4500,1350],
        ["Bagan","ပုဂံ",4050,1350],
        ["Nyaung-U","ညောင်ဦး",4050,1350],
        ["Kyaukse","ကျောက်ဆည်",3600,1350],
        ["Mandalay","မန္တလေး",3600,1350],
        ["Meiktila","မိတ္ထီလာ",3600,1350],
        ["Wundwin","ဝမ်းတွင်း",3600,1350],
        ["Mahlaing","မလှိုင်",3600,1350],
        ["Mogok","မိုးကုတ်",4500,1350],
        ["Myingyan","မြင်းခြံ",4050,1350],
        ["Pyawbwe","ပျော်ဘွယ်",3600,1350],
        ["Pyin Oo Lwin","ပြင်ဦးလွင်",2975,1275],
        ["Yamethin","ရမည်းသင်း",3600,1350],
        ["Kyaukpadaung","ကျောက်ပန်းတောင်း",4050,1350],
        ["Sintgaing","စဉ့်ကိုင်",3600,1350],
        ["Kume","ကူမဲ",3600,1350],
        ["Thazi","သာစည်",4050,1350],
        ["Madaya","မတ္တရာ",4050,1350],
        ["Myitthar","မြစ်သား",3600,1350],
        ["Paukkhaung","ပေါက်ခေါင်း",4500,1350],
        ["Ohn Chaw","အုန်းချော",3600,1350],
        ["Taungtha","တောင်သာ",4050,1350],
        ["Anesakhan","အနီးစခန်း",3600,1350],
        ["Amarapura","အမရပူရ",3600,1350],
        ["Myintnge","မြင့်ငယ်",3600,1350],
        ["Natoegyi","နွားထိုးကြီး",4050,1350],
        ["Han Myint Mo","ဟန်မြင့်မိုရ်",3600,1350],
        ["Tada-U","တံတားဦး",3600,1350],
        ["Zeepingyi","ဇီးပင်ကြီး",3600,1350],
        ["Patheingyi","ပုသိမ်ကြီး",3600,1350],
        ["Aunglan","အောင်လံ",4050,1350],
        ["Chauk","ချောက်",4050,1350],
        ["Magway","မကွေး",4050,1350],
        ["Minbu","မင်းဘူး",4050,1350],
        ["Pakokku","ပခုက္ကူ",4050,1350],
        ["Yesagyo","ရေစကြို",3600,1350],
        ["Taungtwingyi","တောင်တွင်းကြီး",4050,1350],
        ["Thayed","သရက်",4050,1350],
        ["Yenanchaung","ရေနံချောင်း",4050,1350],
        ["Pwintbyu","ပွင့်ဖြူ",4050,1350],
        ["NatMauk","နတ်မောက်",4050,1350],
        ["Salin","စလင်း",4050,1350],
        ["SinHpyuKyun","ဆင်ဖြူကျွန်း",4050,1350],
        ["Satthwar","ဆတ်သွား",4050,1350],
        ["Myothit","မြို့သစ်",4050,1350],
        ["Kamma","ကံမ (သရက်)",4050,1350],
        ["Mindone","မင်းတုန်း",4050,1350],
        ["Ngape","ငဖဲ",4050,1350],
        ["Upper Minhla","အထက်မင်းလှ",4050,1350],
        ["Saku","စကု",4050,1350],
        ["Salay","စလေ",4050,1350],
        ["Seik Phyu","ဆိပ်ဖြူ",4050,1350],
        ["Kamma (Pakokku)","ကံမ (ပခုက္ကူ)",4050,1350],
        ["SinBaungWe","ဆင်ပေါင်ဝဲ",4050,1350],
        ["Mawlamyine","မော်လမြိုင်",4500,1350],
        ["Bilin","ဘီးလင်း",4500,1350],
        ["Mudon","မုဒုံ",4950,1350],
        ["Thaton","သထုံ",4500,1350],
        ["Ye","ရေး",4950,1350],
        ["Thanbyuzayat","သံဖြူဇရပ်",4950,1350],
        ["Kyaikto","ကျိုက်ထို",4500,1350],
        ["Paung","ပေါင်",4500,1350],
        ["Mottama","မုတ္တမ",4500,1350],
        ["Kyaikmaraw","ကျိုက်မရော",4950,1350],
        ["Kyaikkhami","ကျိုက္ခမီ",4950,1350],
        ["Kyaikkaw","ကျိုက်ကော်",4500,1350],
        ["Chaungzone","ချောင်းဆုံ",4950,1350],
        ["Thein Za Yat","သိမ်ဇရပ်",4950,1350],
        ["ZinKyaik","ဇင်းကျိုက်",4500,1350],
        ["Naypyidaw","နေပြည်တော်",3600,1350],
        ["Tatkon","တပ်ကုန်း",3600,1350],
        ["Tharwuthti","သာဝတ္ထိ",3600,1350],
        ["Zeyawaddy","ဇေယျဝတီ",4050,1350],
        ["Sittwe","စစ်တွေ",6750,1800],
        ["Toungup","တောင်ကုတ်",6750,1800],
        ["Thandwe","သံတွဲ",6750,1800],
        ["Kyaukpyu","ကျောက်ဖြူ",6750,1800],
        ["Min Pyar","မင်းပြား",6750,1800],
        ["Ann","အန်း",6750,1800],
        ["Kyauktaw","ကျောက်တော်",6750,1800],
        ["Mrauk-U","မြောက်ဦး",6750,1800],
        ["Ramree","ရမ်းဗြဲ",6750,1800],
        ["Kalay","ကလေး",4950,1350],
        ["Monywa","မုံရွာ",4050,1350],
        ["Sagaing","စစ်ကိုင်း",3600,1350],
        ["Shwebo","ရွှေဘို",4050,1350],
        ["Tamu","တမူး",4950,1350],
        ["Katha","ကသာ",4950,1350],
        ["Kawlin","ကောလင်း",4950,1350],
        ["Tigyaing","ထီးချိုင့်",4950,1350],
        ["Myinmu","မြင်းမူ",4050,1350],
        ["Seikkhun","ဆိပ်ခွန်",4050,1350],
        ["Pyinywa","ပြင်ရွာ",4500,1350],
        ["Indaw","အင်းတော်",4950,1350],
        ["Aungpan","အောင်ပန်း",4050,1350],
        ["Kalaw","ကလော",4050,1350],
        ["Lashio","လားရှိုး",5850,1800],
        ["Kyaukme","ကျောက်မဲ",4950,1350],
        ["Hsipaw","သီပေါ",4950,1350],
        ["Muse","မူဆယ်",6750,1800],
        ["Taunggyi","တောင်ကြီး",4050,1350],
        ["Yatsauk","ရပ်စောက်",4500,1350],
        ["Pinlaung","ပင်လောင်း",4500,1350],
        ["Kengtung","ကျိုင်းတုံ",8550,2250],
        ["Tachileik","တာချီလိတ်",8550,2250],
        ["Nyaungshwe","ညောင်ရွှေ",4500,1350],
        ["Ayetharyar","အေးသာယာ",4050,1350],
        ["Hopong","ဟိုပုံး",4500,1350],
        ["Nawnghkio","နောင်ချို",4950,1350],
        ["Pindaya","ပင်းတယ",4500,1350],
        ["Loilem","လွိုင်လင်",4500,1350],
        ["HeHoe","ဟဲဟိုး",4050,1350],
        ["Ywangan","ရွာငံ",4500,1350],
        ["Namhkam","နမ့်ခမ်း",3600,1350],
        ["Namtu","နမ္မတူ",4950,1350],
        ["Kutkai","ကွတ်ခိုင်",3600,1350],
        ["Shwenyaung","ရွှေညောင်",4050,1350],
        ["Dawei","ထားဝယ်",6750,1800],
        ["Myeik","မြိတ်",8100,2250],
        ["Kawthoung","ကော့သောင်း",8550,2250],
        ["Yangon","ရန်ကုန်",4050,1350],
        ["Hlegu","လှည်းကူး",4050,1350],
        ["Thongwa","သုံးခွ",4050,1350],
        ["Hmawbi","မှော်ဘီ",4050,1350],
        ["Taikkyi","တိုက်ကြီး",4050,1350],
        ["Twantay","တွံတေး",4050,1350],
        ["Kyauktan","ကျောက်တန်း",4050,1350],
        ["Kungyangone","ကွမ်းခြံကုန်း",4050,1350],
        ["Ahpyauk","အဖျောက်",4050,1350],
        ["Kawhmu","ကော့မှူး",4050,1350]
    ];
    const ORDER_FIELD_ALIASES = {
        Phone: 'Phone 1',
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
        Delivery: 'Delivery Service',
        'Facebook Account Name': 'Facebook Name'
    };

    function normalizeOrder(order) {
        const normalized = { ...order };
        Object.entries(ORDER_FIELD_ALIASES).forEach(([alias, canonical]) => {
            if (!Object.prototype.hasOwnProperty.call(normalized, canonical) &&
                Object.prototype.hasOwnProperty.call(normalized, alias)) {
                normalized[canonical] = normalized[alias];
            }
            if (Object.prototype.hasOwnProperty.call(normalized, canonical)) {
                normalized[alias] = normalized[canonical];
            }
        });
        return normalized;
    }

    function openCache() {
        return new Promise((resolve, reject) => {
            const opening = indexedDB.open(DB_NAME, DB_VERSION);
            opening.onupgradeneeded = () => {
                if (!opening.result.objectStoreNames.contains(CACHE_STORE)) {
                    opening.result.createObjectStore(CACHE_STORE);
                }
            };
            opening.onsuccess = () => resolve(opening.result);
            opening.onerror = () => reject(opening.error || new Error('Unable to open the local cache.'));
        });
    }

    async function readCache(key) {
        const database = await openCache();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(CACHE_STORE, 'readonly');
            const request = transaction.objectStore(CACHE_STORE).get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('Unable to read the local cache.'));
            transaction.oncomplete = () => database.close();
            transaction.onerror = () => {
                database.close();
                reject(transaction.error || new Error('Unable to read the local cache.'));
            };
        });
    }

    async function writeCache(key, value) {
        const database = await openCache();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(CACHE_STORE, 'readwrite');
            transaction.objectStore(CACHE_STORE).put(value, key);
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error || new Error('Unable to save the local cache.'));
            };
            transaction.onabort = () => {
                database.close();
                reject(transaction.error || new Error('The local cache update was cancelled.'));
            };
        });
    }

    async function request(action, payload = {}) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ action, ...payload })
        });
        if (!response.ok) throw new Error(`Google Sheet request failed (${response.status}).`);
        const result = await response.json();
        if (!result.ok) throw new Error(result.message || result.error || 'Google Sheet rejected the request.');
        return result;
    }

    async function getDeliveryCities() {
        return DELIVERY_CITY_ROWS.map(([english, myanmar, upTo2Kg, nextKg]) => ({
            english,
            myanmar,
            label: `${english} (${myanmar})`,
            upTo2Kg,
            nextKg
        }));
    }

    async function refreshOrders() {
        const result = await request('listOrders');
        const snapshot = {
            data: result.orders.map(normalizeOrder),
            updatedAt: new Date().toISOString()
        };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    async function getCachedOrders() {
        const snapshot = await readCache('orders');
        return snapshot
            ? { ...snapshot, data: snapshot.data.map(normalizeOrder) }
            : null;
    }

    async function saveOrders(orders) {
        const snapshot = {
            data: orders.map(normalizeOrder),
            updatedAt: new Date().toISOString()
        };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    function createSheetOrder(resultOrder) {
        const row = {
            'Voucher No': resultOrder.voucherNo,
            Name: resultOrder.name,
            Address: resultOrder.address,
            'Phone 1': resultOrder.phone,
            'Phone 2': resultOrder.phone2 || '',
            'Ordered Date': resultOrder.orderDate,
            Total: String(resultOrder.total),
            'Payment Method': resultOrder.paymentMethod,
            Received: '',
            'Deliver Date': '',
            'Delivery Service': resultOrder.deliveryService || '',
            'Delivery Fees': String(resultOrder.deliveryFees || 0),
            'Total KG': String(resultOrder.totalKg || 0),
            'Cash Collection': String(resultOrder.cashCollection || 0),
            'Delivery Notes': resultOrder.deliveryNotes || ''
        };
        const quantityFields = [
            'Special Qty', 'Practice Qty', 'OQ Qty', 'Solution Qty',
            'G11 Handbook Qty', 'G11 Objective Qty', 'G10 Handbook Qty'
        ];
        const amountFields = [
            'Special Amount', 'Practice Amount', 'OQ Amount', 'Solution Amount',
            'G11 Handbook Amount', 'G11 Objective Amount', 'G10 Handbook Amount'
        ];
        const itemById = new Map(resultOrder.items.map((item) => [item.id, item]));
        AdminBooks.forEach((book, index) => {
            const item = itemById.get(book.id);
            if (!item) throw new Error(`The saved order is missing ${book.id}.`);
            row[quantityFields[index]] = String(item.quantity);
            row[amountFields[index]] = String(item.amount);
        });
        return normalizeOrder(row);
    }

    async function createOrder(order) {
        const result = await request('createOrder', { order });
        try {
            const cached = await getCachedOrders();
            if (!cached) {
                result.cacheNeedsRefresh = true;
            } else {
                const orders = cached.data.slice();
                orders.unshift(createSheetOrder(result.order));
                await saveOrders(orders);
            }
        } catch (error) {
            console.error('Order was saved to Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    async function updateOrder(order) {
        const result = await request('updateOrder', { order });
        result.order = normalizeOrder(result.order);
        try {
            const cached = await getCachedOrders();
            if (!cached) {
                result.cacheNeedsRefresh = true;
            } else {
                const orders = cached.data.slice();
                const index = orders.findIndex((item) => item['Voucher No'] === order.voucherNo);
                if (index < 0) orders.unshift(result.order);
                else orders[index] = result.order;
                await saveOrders(orders);
            }
        } catch (error) {
            console.error('Order was updated in Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    async function getShops() {
        return BOOK_SHOPS.map((shop) => ({ ...shop }));
    }

    async function getShopOrders(shopId) {
        const result = await request('listShopOrders', { shopId });
        if (!Array.isArray(result.orders)) {
            throw new Error('The shop order list returned by Google Sheets is invalid.');
        }
        return result.orders;
    }

    async function createShopOrder(shopId, order) {
        return request('createShopOrder', { shopId, order });
    }

    async function updateShopOrder(shopId, order) {
        return request('updateShopOrder', { shopId, order });
    }

    async function refreshStock() {
        const result = await request('getBookStock');
        const snapshot = { data: result.stock, updatedAt: new Date().toISOString() };
        await writeCache('stock', snapshot);
        return snapshot;
    }

    async function getCachedStock() {
        return readCache('stock');
    }

    async function addStock(stock) {
        const result = await request('addBookStock', { stock });
        try {
            const snapshot = { data: result.stock, updatedAt: new Date().toISOString() };
            await writeCache('stock', snapshot);
        } catch (error) {
            console.error('Stock was saved to Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    window.AdminApi = {
        getDeliveryCities,
        getCachedOrders,
        refreshOrders,
        createOrder,
        updateOrder,
        getShops,
        getShopOrders,
        createShopOrder,
        updateShopOrder,
        getCachedStock,
        refreshStock,
        addStock
    };
    window.AdminBooks = [
        { id: 'special', name: 'သင်ရိုးကုန် အထူးထုတ်', price: 20000, prices: [20000, 19000, 18000, 17000, 16000], weight: 0.7 },
        { id: 'practice', name: 'Practice Book', price: 13000, prices: [13000, 12000, 11500, 11000, 10500], weight: 0.44925 },
        { id: 'old-questions', name: 'မေးခွန်းဟောင်းစာအုပ်', price: 11000, prices: [11000, 10000, 9500, 9000, 8800], weight: 0.4668 },
        { id: 'solution', name: 'တွက်စာသီးသန့်စာအုပ်', price: 5000, prices: [5000, 4500, 4000, 4000, 3800], weight: 0.10437 },
        { id: 'g11-handbook', name: 'Grade 11 handbook', price: 10000, prices: [10000, 9000, 8500, 8000, 8000], weight: 0.3 },
        { id: 'g11-objective', name: 'Grade 11 တစ်မှတ်တန် သီးသန့်စာအုပ်', price: 8000, prices: [8000, 7000, 6500, 6500, 6500], weight: 0.25 },
        { id: 'g10-handbook', name: 'Grade 10 handbook', price: 10000, prices: [10000, 9000, 8500, 8000, 8000], weight: 0.2 }
    ];
    window.formatKyats = (value) => `${Number(value || 0).toLocaleString('my-MM')} ကျပ်`;
    window.escapeText = (value) => String(value == null ? '' : value)
        .replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    window.orderField = (order, field) => String(order[field] == null ? '' : order[field]);
    window.orderMatches = (order, query) => {
        const needle = query.trim().toLocaleLowerCase();
        const textMatches = ['Voucher No', 'Name', 'Phone'].some((field) =>
            window.orderField(order, field).toLocaleLowerCase().includes(needle)
        );
        const phoneQuery = query.replace(/[၀-၉]/g, (digit) =>
            String(digit.charCodeAt(0) - '၀'.charCodeAt(0))).trim();
        const normalizedNeedle = phoneQuery.replace(/\D/g, '');
        const normalizedPhone = window.orderField(order, 'Phone')
            .replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - '၀'.charCodeAt(0)))
            .replace(/\D/g, '');
        const isPhoneQuery = /^[0-9\s()+-]+$/.test(phoneQuery);
        return !needle || textMatches ||
            (isPhoneQuery && normalizedNeedle.length > 0 && normalizedPhone.includes(normalizedNeedle));
    };
    window.orderDate = (value) => {
        const text = String(value || '').trim();
        const parsed = new Date(text.replace(' ', 'T'));
        return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString('my-MM');
    };
    window.orderItemSummary = (order) => {
        const fields = [
            'Special Qty', 'Practice Qty', 'Old Questions Qty', 'Solution Qty',
            'Grade 11 Handbook Qty', 'Grade 11 Objective Qty', 'Grade 10 Handbook Qty'
        ];
        return window.AdminBooks.map((book, index) => {
            const quantity = Number(order[fields[index]] || 0);
            return quantity > 0 ? `${book.name} × ${quantity}` : '';
        }).filter(Boolean).join('၊ ');
    };

    if ('serviceWorker' in navigator && window.isSecureContext) {
        const workerUrl = new URL('../service-worker.js', APP_SCRIPT);
        navigator.serviceWorker.register(workerUrl, { scope: new URL('../', APP_SCRIPT).pathname })
            .catch((error) => console.error('Unable to register the offline app shell.', error));
    }
})();
