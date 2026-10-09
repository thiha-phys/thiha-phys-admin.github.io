const listElement = document.getElementById('order-list');
const statusElement = document.getElementById('history-status');
let allOrders = [];
let activeMode = 'search';

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
        const card = document.createElement('article');
        card.className = 'order-card';
        const delivered = Boolean(order['Delivered Date']);
        const paid = Number(order['Amount Received'] || 0) >= Number(order.Total || 0);
        const summary = orderItemSummary(order) || 'စာအုပ်စာရင်း မရှိပါ';
        card.innerHTML = `
            <div class="order-card-top">
                <div><h3>ဘောက်ချာ ${escapeText(order['Voucher No'])} · ${escapeText(order.Name)}</h3>
                <p>${escapeText(order.Phone)} · ${escapeText(orderDate(order['Order Date']))}</p></div>
                <span class="badge ${delivered ? 'good' : 'warning'}">${delivered ? 'ပို့ပြီး' : 'မပို့ရသေး'}</span>
            </div>
            <div class="order-meta"><span>${escapeText(summary)}</span>
            <span>စုစုပေါင်း <strong>${formatKyats(order.Total)}</strong></span>
            <span>လက်ခံရရှိ ${formatKyats(order['Amount Received'])}</span>
            <span class="badge ${paid ? 'good' : 'warning'}">${paid ? 'ငွေရှင်းပြီး' : `ကျန် ${formatKyats(Math.max(0, Number(order.Total || 0) - Number(order['Amount Received'] || 0)))}`}</span>
            <span>${escapeText(order.Address)}</span></div>`;
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
