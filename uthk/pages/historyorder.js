const listElement = document.getElementById('order-list');
const statusElement = document.getElementById('history-status');
const orderItems = [
    ['Special Qty', 'Special Amount'],
    ['Practice Qty', 'Practice Amount'],
    ['Old Questions Qty', 'Old Questions Amount'],
    ['Solution Qty', 'Solution Amount'],
    ['Grade 11 Handbook Qty', 'Grade 11 Handbook Amount'],
    ['Grade 11 Objective Qty', 'Grade 11 Objective Amount'],
    ['Grade 10 Handbook Qty', 'Grade 10 Handbook Amount']
];
let allOrders = [];
let activeMode = 'search';

function formatOrderDateEnglish(value) {
    const text = String(value || '').trim();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
        ? text || '—'
        : new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(parsed);
}

function renderDetailLine(label, value) {
    return `<div class="order-detail-line"><span>${escapeText(label)}</span><strong>${escapeText(value || '—')}</strong></div>`;
}

function renderPhoneLink(phone) {
    const text = String(phone || '').trim();
    if (!text) return '—';

    const dialNumber = text
        .replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - '၀'.charCodeAt(0)))
        .replace(/[^\d+]/g, '')
        .replace(/(?!^)\+/g, '');
    return dialNumber
        ? `<a class="order-phone-link" href="tel:${escapeText(dialNumber)}">${escapeText(text)}</a>`
        : escapeText(text);
}

function renderOrderDetails(order) {
    const itemDetails = orderItems.map(([quantityField, amountField], index) => {
        const quantity = Number(order[quantityField] || 0);
        if (quantity <= 0) return '';
        return renderDetailLine(
            `${AdminBooks[index].name} × ${quantity}`,
            formatKyats(order[amountField])
        );
    }).filter(Boolean).join('');

    const extraDetails = [
        ['ငွေပေးချေမှု', order['Payment Method']],
        ['KPay Account', order['KPay Account']],
        ['Pay Date', order['Pay Date']],
        ['Royal VOC No', order['Royal VOC No']],
        ['Order Confirm', order['Order Confirm']],
        ['Delivery', order.Delivery],
        ['Facebook Account Name', order['Facebook Account Name']]
    ].filter(([, value]) => value);

    return `<div class="order-details">
        <div class="order-details-section">
            <h4>စာအုပ်အသေးစိတ်</h4>
            <div class="order-detail-list">${itemDetails || renderDetailLine('စာအုပ်စာရင်း', 'မရှိပါ')}</div>
        </div>
        <div class="order-details-section">
            <h4>မှာယူမှုအသေးစိတ်</h4>
            <div class="order-detail-list">
                ${renderDetailLine('မှာယူသူ', order.Name)}
                <div class="order-detail-line"><span>ဖုန်းနံပါတ်</span><strong>${renderPhoneLink(order.Phone)}</strong></div>
                ${renderDetailLine('လိပ်စာ', order.Address)}
                ${renderDetailLine('ပို့ဆောင်သည့်ရက်', order['Delivered Date'] ? formatOrderDateEnglish(order['Delivered Date']) : 'မပို့ရသေး')}
                ${extraDetails.map(([label, value]) => renderDetailLine(label, value)).join('')}
            </div>
        </div>
    </div>`;
}

function renderOrders() {
    const query = document.getElementById('search').value;
    const from = document.getElementById('date-from').value;
    const to = document.getElementById('date-to').value;
    const matches = allOrders.filter((order) => {
        const date = String(order['Order Date'] || '').slice(0, 10);
        const total = Number(order.Total || 0);
        const received = Number(order['Amount Received'] || 0);
        if (activeMode === 'search') return orderMatches(order, query);
        if (activeMode === 'date') {
            return Boolean(date) && (!from || date >= from) && (!to || date <= to);
        }
        if (activeMode === 'undelivered') return !order['Delivered Date'];
        return received < total;
    }).sort((a, b) => String(b['Order Date'] || '').localeCompare(String(a['Order Date'] || '')));

    listElement.replaceChildren();
    if (!matches.length) {
        listElement.innerHTML = '<div class="empty-state">ကိုက်ညီသော အမှာစာ မတွေ့ပါ။</div>';
        statusElement.textContent = 'ကိုက်ညီသော အမှာစာ 0 ခု';
        return;
    }
    matches.forEach((order) => {
        const card = document.createElement('details');
        card.className = 'order-card';
        const delivered = Boolean(order['Delivered Date']);
        const paid = Number(order['Amount Received'] || 0) >= Number(order.Total || 0);
        card.innerHTML = `
            <summary class="order-card-summary">
                <span class="order-card-heading">
                    <strong>${escapeText(order['Voucher No'])}</strong>
                    <span class="order-card-statuses">
                        <span class="badge ${delivered ? 'good' : 'warning'}">${delivered ? 'ပို့ပြီး' : 'မပို့ရသေး'}</span>
                        <span class="badge ${paid ? 'good' : 'warning'}">${paid ? 'ငွေရှင်းပြီး' : 'ငွေမရှင်းရသေး'}</span>
                    </span>
                </span>
                <span class="order-card-divider"></span>
                <span class="order-card-info">${escapeText(formatOrderDateEnglish(order['Order Date']))}</span>
                <span class="order-card-info order-customer">${escapeText(order.Name || '—')} · ${renderPhoneLink(order.Phone)} · ${escapeText(order.Address || '—')}</span>
                <span class="order-card-totals">
                    <span>စုစုပေါင်း <strong>${formatKyats(order.Total)}</strong></span>
                    <span>လက်ခံရရှိ <strong>${formatKyats(order['Amount Received'])}</strong></span>
                </span>
                <span class="order-card-expand"><span>အသေးစိတ်ကြည့်ရန်</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
            </summary>
            ${renderOrderDetails(order)}`;
        listElement.append(card);
    });
    statusElement.textContent = `${matches.length.toLocaleString('my-MM')} ခု ပြထားသည်`;
}

function setMode(mode) {
    activeMode = mode;
    document.querySelectorAll('.history-mode').forEach((button) => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
    document.getElementById('search-tools').hidden = mode !== 'search';
    document.getElementById('date-tools').hidden = mode !== 'date';
    document.getElementById('mode-description').textContent = {
        search: 'ဘောက်ချာနံပါတ်၊ အမည် သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် ရှာပါ။',
        date: 'စတင်ရက်နှင့် နောက်ဆုံးရက်ကို ရွေးပြီး ထိုကာလအတွင်း မှာယူမှုများကို ကြည့်ပါ။',
        undelivered: 'Delivered Date မရှိသေးသော အမှာစာများကို ပြထားသည်။',
        unpaid: 'လက်ခံရရှိငွေသည် စုစုပေါင်းထက် နည်းနေသေးသော အမှာစာများကို ပြထားသည်။'
    }[mode];
    renderOrders();
}

async function loadOrders() {
    try {
        const cached = await AdminApi.getCachedOrders();
        if (!cached) {
            statusElement.textContent = 'ဖုန်းတွင်း data မရှိသေးပါ။ ညာဘက် refresh ကိုနှိပ်ပါ။';
            return;
        }
        allOrders = cached.data;
        document.getElementById('history-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        renderOrders();
    } catch (error) {
        console.error('Unable to read cached order history.', error);
        statusElement.textContent = 'ဖုန်းတွင်း data ကို ဖတ်မရပါ။ refresh ကိုနှိပ်၍ ထပ်စမ်းပါ။';
        statusElement.classList.add('error');
    }
}

document.getElementById('refresh-history').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const cacheStatus = document.getElementById('history-cache-status');
    button.disabled = true;
    statusElement.className = 'status-message';
    statusElement.textContent = 'Google Sheet မှ အမှာစာများ ရယူနေသည်…';
    try {
        const cached = await AdminApi.refreshOrders();
        allOrders = cached.data;
        cacheStatus.textContent = `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        renderOrders();
    } catch (error) {
        console.error('Unable to refresh order history.', error);
        statusElement.textContent = 'Google Sheet မှ data မရယူနိုင်ပါ။ Internet/API ကို စစ်ပါ။';
        statusElement.classList.add('error');
    } finally {
        button.disabled = false;
    }
});

['search', 'date-from', 'date-to'].forEach((id) =>
    document.getElementById(id).addEventListener('input', renderOrders)
);
document.querySelectorAll('.history-mode').forEach((button) =>
    button.addEventListener('click', () => setMode(button.dataset.mode))
);
loadOrders();
