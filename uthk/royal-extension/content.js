const MAX_WAYBILLS = 1000;
const POLL_INTERVAL_MS = 60 * 1000;
const TABLE_ID = 'my-data-table';
let syncing = false;
let syncPanel;

function setupSyncPanel() {
    const host = document.createElement('div');
    host.id = 'uthk-royal-sync-panel';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
        :host { all: initial; position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; font: 13px/1.45 Arial, sans-serif; }
        .card { width: min(340px, calc(100vw - 48px)); padding: 12px 14px; border: 1px solid #d9e1ed; border-radius: 12px; color: #17243b; background: #fff; box-shadow: 0 8px 28px #17243b26; }
        strong { display: block; margin-bottom: 4px; }
        #status { color: #596981; }
        #status.error { color: #b42336; }
    </style><div class="card"><strong>UTHK · Royal auto-sync</strong><div id="status">စာရင်းကို စစ်ဆေးနေသည်…</div></div>`;
    document.documentElement.append(host);
    syncPanel = shadow.getElementById('status');
}

function setPanelStatus(message, isError) {
    if (!syncPanel) return;
    syncPanel.textContent = message;
    syncPanel.classList.toggle('error', Boolean(isError));
}

function normalizeHeader(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDigits(value) {
    return String(value || '').replace(/[၀-၉]/g, (digit) =>
        String(digit.charCodeAt(0) - '၀'.charCodeAt(0)));
}

function parseAmount(value, columnName) {
    const normalized = normalizeDigits(value)
        .replace(/(?:MMK|ကျပ်)/gi, '')
        .replace(/[,\s]/g, '')
        .trim();
    if (!/^\d+(?:\.0+)?$/.test(normalized)) {
        throw new Error(`${columnName} ပမာဏကို ဖတ်မရပါ။`);
    }
    const amount = Number(normalized);
    if (!Number.isSafeInteger(amount)) throw new Error(`${columnName} ပမာဏ မမှန်ပါ။`);
    return amount;
}

function getShipmentRows() {
    const table = document.getElementById(TABLE_ID);
    if (!table) throw new Error('Royal Shipment table မတွေ့ပါ။');
    const headers = Array.from(table.querySelectorAll('thead th')).map((cell) =>
        normalizeHeader(cell.innerText));
    const columnFor = (names) => headers.findIndex((header) => names.includes(header));
    const columns = {
        waybillNo: columnFor(['waybillno', 'waybillnumber']),
        receiver: columnFor(['receiver', 'recipient']),
        serviceCharge: columnFor(['servicechargesmmk', 'servicecharges', 'servicecharge']),
        cod: columnFor(['codmmk', 'cod', 'cashondelivery']),
        waybillDate: columnFor(['waybilldate', 'shipmentdate']),
        state: columnFor(['state', 'status'])
    };
    const missing = Object.keys(columns).filter((key) => columns[key] < 0);
    if (missing.length) throw new Error('Royal စာရင်း column များကို မဖတ်နိုင်ပါ။');

    const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr, index) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((cell) =>
            cell.innerText.trim().replace(/\s+/g, ' '));
        if (!cells[columns.waybillNo]) return null;
        return {
            waybillNo: cells[columns.waybillNo],
            receiver: cells[columns.receiver],
            serviceCharge: parseAmount(cells[columns.serviceCharge], 'Service Charges'),
            cod: parseAmount(cells[columns.cod], 'COD'),
            waybillDate: normalizeDigits(cells[columns.waybillDate]),
            state: cells[columns.state]
        };
    }).filter(Boolean);

    const info = document.getElementById(`${TABLE_ID}_info`)?.innerText || '';
    const count = /Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i.exec(info);
    if (count && Number(count[2]) - Number(count[1]) + 1 !== Number(count[3])) {
        throw new Error('စာမျက်နှာပြထားသော waybill အားလုံး မဟုတ်ပါ။ Page length ကို All ထားပါ။');
    }
    if (rows.length > MAX_WAYBILLS) {
        throw new Error(`Waybill ${MAX_WAYBILLS} ခုထက်များနေပါသည်။`);
    }
    if (!rows.length) throw new Error('Royal Shipment စာရင်းတွင် waybill မတွေ့ပါ။');
    return rows;
}

async function ensureAllRowsVisible() {
    const wrapper = document.getElementById(`${TABLE_ID}_wrapper`);
    if (!wrapper) throw new Error('Royal table controls မတွေ့ပါ။');
    const search = wrapper.querySelector('input[type="search"]');
    if (search && search.value.trim()) {
        throw new Error('Royal table Search ကိုရှင်းပြီးမှ auto-sync လုပ်ပါ။');
    }
    const select = wrapper.querySelector('.dataTables_length select');
    if (select) {
        const allOption = Array.from(select.options).find((option) =>
            option.text.trim().toLocaleLowerCase() === 'all' || option.value === '-1');
        if (!allOption) throw new Error('Royal table မှာ All page length option မရှိပါ။');
        if (select.value !== allOption.value) {
            select.value = allOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 1200));
        }
    }
}

async function requestSync() {
    if (syncing) return;
    syncing = true;
    try {
        const settings = await chrome.storage.local.get({ syncEnabled: true });
        if (!settings.syncEnabled) {
            setPanelStatus('Paused · extension icon မှ Resume လုပ်ပါ။', false);
            return;
        }
        await ensureAllRowsVisible();
        const waybills = getShipmentRows();
        setPanelStatus(`${waybills.length} waybill ကို Sheet နှင့် စစ်နေသည်…`, false);
        const result = await chrome.runtime.sendMessage({
            type: 'SYNC_ROYAL_SHIPMENTS',
            waybills
        });
        if (!result || !result.ok) throw new Error(result?.message || 'Sync တုံ့ပြန်ချက် မရရှိပါ။');
        setPanelStatus(`${result.message} · ${new Date(result.lastSyncAt).toLocaleTimeString()}`, false);
    } catch (error) {
        console.error('Royal shipment sync failed.', error);
        setPanelStatus(error.message || 'Royal shipment sync မအောင်မြင်ပါ။', true);
    } finally {
        syncing = false;
    }
}

setupSyncPanel();
requestSync();
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_ROYAL_SHIPMENTS') requestSync();
});
setInterval(requestSync, POLL_INTERVAL_MS);
