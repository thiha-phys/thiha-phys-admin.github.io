const MAX_STATEMENT_ROWS = 1000;
const NORMALIZED_DIGITS = /[၀-၉]/g;
const amountPattern = /^\d+(?:\.0+)?$/;
const STATUS_MESSAGE = 'UTHK_ROYAL_STATEMENT_STATUS';
const IS_TOP_FRAME = window === window.top;
const IS_ACTIVE_STATEMENT_FRAME = (() => {
    if (IS_TOP_FRAME) return location.pathname.startsWith('/statement');
    try {
        return window.top.location.pathname.startsWith('/statement');
    } catch (_error) {
        return document.referrer.startsWith('https://member.royalx.biz/statement');
    }
})();
let syncPanel;
let syncing = false;
let lastAttemptedData = '';
let lastAttemptedAt = 0;
let scanDiagnostics = { tables: 0, rows: 0 };

function normalizeHeader(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDigits(value) {
    return String(value || '').replace(NORMALIZED_DIGITS, (digit) =>
        String(digit.charCodeAt(0) - '၀'.charCodeAt(0)));
}

function getCellElements(row) {
    if (row.cells && row.cells.length) return Array.from(row.cells);
    return Array.from(row.children).filter((cell) =>
        cell.matches('td, th, [role="cell"], [role="gridcell"]') ||
        cell.children.length === 0 || cell.children.length === 1);
}

function getSearchRoots(root) {
    const roots = [root];
    root.querySelectorAll('*').forEach((element) => {
        if (element.shadowRoot) roots.push(element.shadowRoot);
    });
    return roots;
}

function findStatementTable() {
    let roots = [document];
    let rows = Array.from(document.querySelectorAll('tr, [role="row"], .table-row, .data-row'));
    if (!rows.length) {
        roots = getSearchRoots(document);
        rows = roots.slice(1).flatMap((root) =>
            Array.from(root.querySelectorAll('tr, [role="row"], .table-row, .data-row')));
    }
    scanDiagnostics = {
        tables: roots.reduce((count, root) => count + root.querySelectorAll('table').length, 0),
        rows: rows.length
    };

    for (const headerRow of rows) {
        const headers = getCellElements(headerRow).map((cell) =>
            normalizeHeader(cell.innerText || cell.textContent));
        if (headers.length < 7) continue;
        const columnFor = (names) => headers.findIndex((header) =>
            names.some((name) => header === name || header.startsWith(name) || header.includes(name)));
        const columns = {
            waybillNo: columnFor(['royalvoucherno', 'royalvoc', 'vocno', 'waybill', 'trackingno']),
            weight: columnFor(['weight', 'weightkg']),
            codAmount: columnFor(['codamount', 'codmmk', 'cashondelivery']),
            delivery: columnFor(['delivery', 'deliverycharges', 'deliveryfee']),
            codCharges: columnFor(['codcharges', 'codcharge']),
            paidCharges: columnFor(['paidcharges', 'paidcharge']),
            paidDate: columnFor(['paiddate'])
        };
        if (Object.values(columns).every((index) => index >= 0)) {
            const container = headerRow.closest('table, [role="table"], [role="grid"]') ||
                headerRow.parentElement;
            const tableRows = container
                ? Array.from(container.querySelectorAll('tr, [role="row"], .table-row, .data-row'))
                : [];
            return { table: container, columns, rows: tableRows };
        }
    }

    const waybillPattern = /^[A-Z]{2,5}\d{6,}[A-Z0-9]*$/i;
    const dataRows = rows.filter((row) => {
        const cells = getCellElements(row);
        return cells.length > 13 &&
            waybillPattern.test(normalizeDigits(cells[4].innerText || cells[4].textContent).trim());
    });
    if (dataRows.length) {
        const container = dataRows[0].closest('table, [role="table"], [role="grid"]') ||
            dataRows[0].parentElement;
        const tableRows = container
            ? Array.from(container.querySelectorAll('tr, [role="row"], .table-row, .data-row'))
            : dataRows;
        const matchingRows = tableRows.filter((row) => {
            const cells = getCellElements(row);
            return cells.length > 13 &&
                waybillPattern.test(normalizeDigits(cells[4].innerText || cells[4].textContent).trim());
        });
        return {
            table: container || dataRows[0],
            rows: matchingRows,
            columns: {
                waybillNo: 4,
                weight: 8,
                codAmount: 9,
                delivery: 10,
                codCharges: 11,
                paidCharges: 12,
                paidDate: 13
            }
        };
    }

    return null;
}

function getStatementRows(match) {
    const { table, columns } = match;
    const rows = match.rows || Array.from(table.querySelectorAll('tbody tr'));
    const entries = rows.map((row) => {
        const cells = getCellElements(row).map((cell) =>
            (cell.innerText || cell.textContent || '').trim().replace(/\s+/g, ' '));
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

    if (entries.length > MAX_STATEMENT_ROWS) {
        throw new Error(`Statement row ${MAX_STATEMENT_ROWS} ခုထက်များနေပါသည်။`);
    }
    if (!entries.length) throw new Error('Statement detail မှ waybill row မတွေ့ပါ။');
    return entries;
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

function setupPanel() {
    if (!IS_TOP_FRAME || !IS_ACTIVE_STATEMENT_FRAME) return;
    const host = document.createElement('div');
    host.id = 'uthk-royal-statement-sync';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
        :host { all: initial; position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; font: 13px/1.45 Arial, sans-serif; }
        .card { width: min(340px, calc(100vw - 48px)); padding: 12px 14px; border: 1px solid #d9e1ed; border-radius: 12px; color: #17243b; background: #fff; box-shadow: 0 8px 28px #17243b26; }
        strong { display: block; margin-bottom: 4px; }
        #status { max-height: 150px; margin-bottom: 9px; overflow: auto; color: #596981; white-space: pre-wrap; }
        #status.error { color: #b42336; }
    </style><div class="card"><strong>UTHK · Royal statement</strong><div id="status">Statement detail ကို စောင့်နေသည်…</div></div>`;
    document.documentElement.append(host);
    syncPanel = shadow.getElementById('status');
}

function setPanelStatus(message, isError) {
    if (IS_TOP_FRAME) {
        if (!syncPanel) return;
        syncPanel.textContent = message;
        syncPanel.classList.toggle('error', Boolean(isError));
        return;
    }
    window.top.postMessage({
        type: STATUS_MESSAGE,
        message,
        isError: Boolean(isError)
    }, 'https://member.royalx.biz');
}

async function syncStatement() {
    if (syncing) return;
    const match = findStatementTable();
    if (!match) {
        if (IS_TOP_FRAME && Date.now() - lastChildStatusAt > 5000) {
            setPanelStatus('Statement detail ကို စောင့်နေသည်…', false);
        }
        return;
    }
    syncing = true;
    try {
        await ensureAllRowsVisible(match.table);
        const entries = getStatementRows(match);
        const payloadKey = JSON.stringify(entries);
        if (payloadKey === lastAttemptedData && Date.now() - lastAttemptedAt < 30000) return;
        lastAttemptedData = payloadKey;
        lastAttemptedAt = Date.now();
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
    }
}

function scanStatement() {
    if (!IS_ACTIVE_STATEMENT_FRAME) return;
    if (syncing) return;
    if (!findStatementTable()) {
        setPanelStatus(
            `Statement row ရှာနေသည်… (table ${scanDiagnostics.tables}, row ${scanDiagnostics.rows})`,
            false
        );
        return;
    }
    syncStatement();
}

setupPanel();
if (IS_TOP_FRAME && IS_ACTIVE_STATEMENT_FRAME) {
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (event.origin !== 'https://member.royalx.biz' ||
            event.source === window || !data || data.type !== STATUS_MESSAGE) return;
        setPanelStatus(data.message, data.isError);
    });
}
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
setInterval(scanStatement, 2000);
