const MAX_STATEMENT_ROWS = 1000;
const NORMALIZED_DIGITS = /[၀-၉]/g;
const amountPattern = /^\d+(?:\.0+)?$/;
let syncPanel;
let syncing = false;
let lastAttemptedData = '';

function normalizeHeader(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDigits(value) {
    return String(value || '').replace(NORMALIZED_DIGITS, (digit) =>
        String(digit.charCodeAt(0) - '၀'.charCodeAt(0)));
}

function findStatementTable() {
    for (const table of document.querySelectorAll('table')) {
        if (!table.getClientRects().length) continue;
        for (const headerRow of table.querySelectorAll('tr')) {
            const headers = Array.from(headerRow.cells).map((cell) =>
                normalizeHeader(cell.innerText || cell.textContent));
            const columnFor = (names) => headers.findIndex((header) => names.includes(header));
            const columns = {
                waybillNo: columnFor(['waybill', 'waybillno', 'waybillnumber', 'trackingno']),
                weight: columnFor(['weight', 'weightkg']),
                codAmount: columnFor(['codamount', 'codmmk', 'cashondelivery']),
                delivery: columnFor(['delivery', 'deliverycharges', 'deliveryfee']),
                codCharges: columnFor(['codcharges', 'codcharge']),
                paidCharges: columnFor(['paidcharges', 'paidcharge']),
                paidDate: columnFor(['paiddate'])
            };
            if (Object.values(columns).every((index) => index >= 0)) {
                return { table, columns };
            }
        };
    }
    return null;
}

function parseAmount(value, fieldName, allowNegative = false) {
    const normalized = normalizeDigits(value)
        .replace(/(?:MMK|ကျပ်)/gi, '')
        .replace(/[,\s]/g, '')
        .trim();
    if (!(allowNegative ? /^-?\d+(?:\.0+)?$/ : amountPattern).test(normalized)) {
        throw new Error(`${fieldName} ပမာဏကို ဖတ်မရပါ။`);
    }
    const amount = Number(normalized);
    if (!Number.isSafeInteger(amount)) {
        throw new Error(`${fieldName} ပမာဏ မမှန်ပါ။`);
    }
    return amount;
}

function parseWeight(value) {
    const normalized = normalizeDigits(value)
        .replace(/(?:kg|kgs)/gi, '')
        .replace(/[,\s]/g, '')
        .trim();
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
        throw new Error('Weight ကို ဖတ်မရပါ။');
    }
    const weight = Number(normalized);
    if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error('Weight တန်ဖိုး မမှန်ပါ။');
    }
    return weight;
}

async function ensureAllRowsVisible(table) {
    const wrapper = table.closest('.dataTables_wrapper');
    if (!wrapper) return;
    const search = wrapper.querySelector('input[type="search"]');
    if (search && search.value.trim()) {
        throw new Error('Statement table Search ကိုရှင်းပြီးမှ sync လုပ်ပါ။');
    }
    const select = wrapper.querySelector('.dataTables_length select');
    if (select) {
        const allOption = Array.from(select.options).find((option) =>
            option.text.trim().toLocaleLowerCase() === 'all' || option.value === '-1');
        if (allOption && select.value !== allOption.value) {
            select.value = allOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    const infoElement = wrapper.querySelector('.dataTables_info');
    const info = infoElement ? infoElement.innerText : '';
    const count = /Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i.exec(info);
    if (count && Number(count[2]) - Number(count[1]) + 1 !== Number(count[3])) {
        throw new Error('Statement စာမျက်နှာရှိ row အားလုံး မမြင်ရပါ။ Page length ကို All ထားပါ။');
    }
}

function getStatementRows(table, columns) {
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
            cell.innerText.trim().replace(/\s+/g, ' '));
        const waybillNo = normalizeDigits(cells[columns.waybillNo] || '').trim();
        if (!waybillNo) return null;
        const paidDate = normalizeDigits(cells[columns.paidDate] || '').trim();
        if (!paidDate) throw new Error(`${waybillNo} အတွက် Paid Date မတွေ့ပါ။`);
        return {
            waybillNo,
            weight: parseWeight(cells[columns.weight] || ''),
            codAmount: parseAmount(cells[columns.codAmount] || '', 'COD Amount'),
            delivery: parseAmount(cells[columns.delivery] || '', 'Delivery'),
            codCharges: parseAmount(cells[columns.codCharges] || '', 'COD Charges'),
            paidCharges: parseAmount(cells[columns.paidCharges] || '', 'Paid Charges', true),
            paidDate
        };
    }).filter(Boolean);

    if (rows.length > MAX_STATEMENT_ROWS) {
        throw new Error(`Statement row ${MAX_STATEMENT_ROWS} ခုထက်များနေပါသည်။`);
    }
    if (!rows.length) throw new Error('Statement detail မှ waybill row မတွေ့ပါ။');
    return rows;
}

function setupPanel() {
    const host = document.createElement('div');
    host.id = 'uthk-royal-statement-sync';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
        :host { all: initial; position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; font: 13px/1.45 Arial, sans-serif; }
        .card { width: min(340px, calc(100vw - 48px)); padding: 12px 14px; border: 1px solid #d9e1ed; border-radius: 12px; color: #17243b; background: #fff; box-shadow: 0 8px 28px #17243b26; }
        strong { display: block; margin-bottom: 4px; }
        #status { max-height: 150px; margin-bottom: 9px; overflow: auto; color: #596981; white-space: pre-wrap; }
        #status.error { color: #b42336; }
        button { border: 0; border-radius: 7px; padding: 7px 10px; color: #fff; background: #3978e8; font: inherit; cursor: pointer; }
        button:disabled { opacity: .6; cursor: wait; }
    </style><div class="card"><strong>UTHK · Royal statement</strong><div id="status">Statement detail ကိုဖွင့်ပြီး data ကို စစ်ဆေးပါမည်။</div><button type="button">Sheet သို့ sync လုပ်ရန်</button></div>`;
    document.documentElement.append(host);
    syncPanel = {
        status: shadow.getElementById('status'),
        button: shadow.querySelector('button')
    };
    syncPanel.button.disabled = true;
    syncPanel.button.addEventListener('click', () => syncStatement(true));
}

function setPanelStatus(message, isError) {
    syncPanel.status.textContent = message;
    syncPanel.status.classList.toggle('error', Boolean(isError));
}

async function syncStatement(force) {
    if (syncing) return;
    const match = findStatementTable();
    if (!match) {
        setPanelStatus('Statement စာရင်းမှ Action ကိုနှိပ်ပြီး detail ကိုဖွင့်ပါ။', false);
        syncPanel.button.disabled = true;
        return;
    }
    syncPanel.button.disabled = false;
    syncing = true;
    syncPanel.button.disabled = true;
    try {
        await ensureAllRowsVisible(match.table);
        const entries = getStatementRows(match.table, match.columns);
        const payloadKey = JSON.stringify(entries);
        if (!force && payloadKey === lastAttemptedData) return;
        lastAttemptedData = payloadKey;
        setPanelStatus(`${entries.length} waybill ကို Royal VOC ဖြင့် Sheet မှာစစ်နေသည်…`, false);
        const result = await chrome.runtime.sendMessage({
            type: 'SYNC_ROYAL_STATEMENT',
            entries
        });
        if (!result || !result.ok) {
            throw new Error((result && result.message) || 'Google Sheet မှ statement sync တုံ့ပြန်ချက် မရပါ။');
        }
        const unmatched = result.results.filter((item) => item.result === 'unmatched');
        const duplicates = result.results.filter((item) => item.result === 'duplicate');
        const details = [
            `${result.updatedCount} ခုဖြည့်ပြီး၊ ${result.unmatchedCount} ခုမတွေ့၊ ${result.duplicateCount} ခု duplicate`,
            unmatched.length ? `မတွေ့သော VOC: ${unmatched.slice(0, 5).map((item) => item.waybillNo).join(', ')}` : '',
            duplicates.length ? `Sheet ထဲ duplicate ဖြစ်နေသော VOC: ${duplicates.slice(0, 5).map((item) => item.waybillNo).join(', ')}` : ''
        ].filter(Boolean).join('\n');
        setPanelStatus(details, unmatched.length > 0 || duplicates.length > 0);
    } catch (error) {
        console.error('Royal statement sync failed.', error);
        setPanelStatus(error.message || 'Royal statement sync မအောင်မြင်ပါ။', true);
    } finally {
        syncing = false;
        syncPanel.button.disabled = false;
    }
}

function scanStatement() {
    if (syncing) return;
    if (!findStatementTable()) {
        setPanelStatus('Statement စာရင်းမှ Action ကိုနှိပ်ပြီး detail ကိုဖွင့်ပါ။', false);
        syncPanel.button.disabled = true;
        return;
    }
    syncPanel.button.disabled = false;
    syncStatement(false);
}

setupPanel();
let scanScheduled = false;
const observer = new MutationObserver((mutations) => {
    const affectsTable = mutations.some((mutation) => {
        const target = mutation.target.nodeType === Node.ELEMENT_NODE
            ? mutation.target
            : mutation.target.parentElement;
        if (target && (target.closest('table') || target.querySelector('table'))) return true;
        return Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
            .some((node) => node.nodeType === Node.ELEMENT_NODE &&
                (node.matches('table') || node.querySelector('table')));
    });
    if (!affectsTable) return;
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
        scanScheduled = false;
        scanStatement();
    }, 500);
});
observer.observe(document.documentElement, { childList: true, subtree: true });
scanStatement();
