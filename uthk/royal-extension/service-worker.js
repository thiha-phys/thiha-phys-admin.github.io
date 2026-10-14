const API_URL = 'https://script.google.com/macros/s/AKfycbxWcDQ_ue9hZPawB-svH9bkusQelPCdXyjXilzLgklfSxXFd74fOi3ydCoCpg0ZuEXg/exec';
const ALARM_NAME = 'uthk-royal-sync';
const RETRY_DELAY_MS = 5 * 60 * 1000;
const MAX_WAYBILLS = 1000;

async function initializeExtension() {
    const values = await chrome.storage.local.get({ syncEnabled: true });
    if (typeof values.syncEnabled !== 'boolean') {
        await chrome.storage.local.set({ syncEnabled: true });
    }
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => {
    initializeExtension().catch((error) => console.error('Unable to initialize Royal sync.', error));
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_NAME) return;
    chrome.tabs.query({ url: 'https://member.royalx.biz/shipment*' }).then((tabs) => {
        tabs.forEach((tab) => {
            if (tab.id == null) return;
            chrome.tabs.sendMessage(tab.id, { type: 'SYNC_ROYAL_SHIPMENTS' })
                .catch(() => {});
        });
    }).catch((error) => console.error('Unable to locate the Royal shipment tab.', error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_SYNC_STATE') {
        chrome.storage.local.get({
            syncEnabled: true,
            syncState: { message: 'Royal Shipments စာမျက်နှာကို ဖွင့်ပါ။' }
        }).then(sendResponse).catch((error) => {
            sendResponse({ error: error.message || 'Sync အခြေအနေ ဖတ်မရပါ။' });
        });
        return true;
    }

    if (message.type === 'SET_SYNC_ENABLED') {
        const syncEnabled = Boolean(message.enabled);
        chrome.storage.local.set({ syncEnabled }).then(() => {
            sendResponse({ syncEnabled });
        }).catch((error) => {
            sendResponse({ error: error.message || 'Sync setting မသိမ်းနိုင်ပါ။' });
        });
        return true;
    }

    if (message.type === 'SYNC_ROYAL_SHIPMENTS') {
        syncRoyalShipments_(message.waybills).then(sendResponse).catch((error) => {
            const failure = {
                ok: false,
                error: true,
                message: error.message || 'Royal shipment sync မအောင်မြင်ပါ။'
            };
            saveSyncState_(failure).finally(() => sendResponse(failure));
        });
        return true;
    }

    return false;
});

async function syncRoyalShipments_(waybills) {
    const now = Date.now();
    const settings = await chrome.storage.local.get({
        syncEnabled: true,
        waybillFingerprints: {},
        syncState: {}
    });
    if (!settings.syncEnabled) {
        return { ok: false, paused: true, message: 'Royal sync ကို pause လုပ်ထားသည်။' };
    }
    if (!Array.isArray(waybills) || waybills.length === 0 || waybills.length > MAX_WAYBILLS) {
        throw new Error('Royal shipment စာရင်းမမှန်ပါ သို့မဟုတ် 1,000 ခုထက်များနေသည်။');
    }

    const fingerprints = {};
    const changed = [];
    const pending = [];
    for (const waybill of waybills) {
        const fingerprint = await fingerprintWaybill_(waybill);
        const saved = settings.waybillFingerprints[waybill.waybillNo];
        const shouldRetry = saved && saved.fingerprint === fingerprint &&
            saved.result !== 'linked' && saved.result !== 'already-linked' &&
            Number(saved.retryAt || 0) <= now;
        if (!saved || saved.fingerprint !== fingerprint || shouldRetry) {
            changed.push(waybill);
            fingerprints[waybill.waybillNo] = fingerprint;
        }
        if (saved && saved.fingerprint === fingerprint &&
            saved.result !== 'linked' && saved.result !== 'already-linked') {
            pending.push(waybill.waybillNo);
        }
    }

    if (!changed.length) {
        const state = {
            ok: true,
            message: pending.length
                ? `${pending.length} ခုမှာ ကိုက်ညီသော order မရှိသေးပါ။ နောက်တစ်ကြိမ် ပြန်စစ်ပါမည်။`
                : 'Royal စာရင်း ပြောင်းလဲမှုမရှိပါ။',
            lastSyncAt: new Date(now).toISOString(),
            shipmentCount: waybills.length,
            pendingCount: pending.length,
            updatedCount: 0
        };
        await saveSyncState_(state);
        return state;
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ action: 'syncRoyalShipments', waybills: changed })
    });
    if (!response.ok) {
        throw new Error(`Google Sheet request failed (${response.status}).`);
    }
    const result = await response.json();
    if (!result.ok || !Array.isArray(result.results)) {
        throw new Error(result.error || result.message || 'Google Sheet မှ Royal sync ကို လက်မခံပါ။');
    }

    const nextFingerprints = { ...settings.waybillFingerprints };
    let matchedCount = 0;
    let pendingCount = 0;
    result.results.forEach((item) => {
        const fingerprint = fingerprints[item.waybillNo];
        const matched = item.result === 'linked' || item.result === 'already-linked';
        if (matched) matchedCount += 1;
        else pendingCount += 1;
        nextFingerprints[item.waybillNo] = {
            fingerprint,
            result: item.result,
            retryAt: matched ? 0 : now + RETRY_DELAY_MS
        };
    });
    const state = {
        ok: true,
        message: `${matchedCount} ခု update လုပ်ပြီး၊ ${pendingCount} ခုမှာ order ကို စောင့်နေသည်။`,
        lastSyncAt: new Date(now).toISOString(),
        shipmentCount: waybills.length,
        updatedCount: matchedCount,
        pendingCount
    };
    await chrome.storage.local.set({
        waybillFingerprints: nextFingerprints,
        syncState: state
    });
    return state;
}

async function fingerprintWaybill_(waybill) {
    const text = JSON.stringify([
        waybill.receiver,
        waybill.serviceCharge,
        waybill.cod,
        waybill.state,
        waybill.waybillDate
    ]);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function saveSyncState_(state) {
    await chrome.storage.local.set({ syncState: state });
}
