let orders = [];

function renderVoucherMatches(query) {
    const results = document.getElementById('voucher-results');
    results.replaceChildren();
    const matches = orders.filter((order) => orderMatches(order, query))
        .sort((a, b) => String(b['Order Date'] || '').localeCompare(String(a['Order Date'] || '')));
    if (!matches.length) {
        results.innerHTML = '<div class="empty-state">ကိုက်ညီသော အမှာစာ မတွေ့ပါ။</div>';
        return 0;
    }
    matches.slice(0, 50).forEach((order) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'result-choice';
        button.innerHTML = `<span><strong>${escapeText(order['Voucher No'])} · ${escapeText(order.Name)}</strong><br><small>${escapeText(order.Phone)} · ${escapeText(orderDate(order['Order Date']))}</small></span><span>${formatKyats(order.Total)}</span>`;
        button.addEventListener('click', () => displayVoucher(order));
        results.append(button);
    });
    return matches.length;
}

function addReceiptLine(container, label, value) {
    const line = document.createElement('div');
    line.className = 'receipt-line';
    const key = document.createElement('span');
    key.textContent = label;
    const text = document.createElement('strong');
    text.textContent = value || '—';
    line.append(key, text);
    container.append(line);
}

function displayVoucher(order) {
    document.getElementById('receipt-voucher').textContent = `ဘောက်ချာအမှတ် ${order['Voucher No']}`;
    const info = document.getElementById('receipt-info');
    info.replaceChildren();
    [
        ['အမည်', order.Name], ['ဖုန်း', order.Phone], ['လိပ်စာ', order.Address],
        ['မှာယူသည့်ရက်', order['Order Date']], ['ငွေပေးချေမှု', order['Payment Method']],
        ['ငွေလက်ခံရရှိ', formatKyats(order['Amount Received'])],
        ['KPay Account', order['KPay Account']], ['Pay Date', order['Pay Date']],
        ['Royal VOC No', order['Royal VOC No']], ['Delivered Date', order['Delivered Date']],
        ['Delivery', order.Delivery], ['Facebook Account Name', order['Facebook Account Name']]
    ].forEach(([label, value]) => addReceiptLine(info, label, String(value || '')));
    const itemList = document.getElementById('receipt-items');
    itemList.replaceChildren();
    const itemFields = [
        ['Special Qty', 'Special Amount'], ['Practice Qty', 'Practice Amount'],
        ['Old Questions Qty', 'Old Questions Amount'], ['Solution Qty', 'Solution Amount'],
        ['Grade 11 Handbook Qty', 'Grade 11 Handbook Amount'],
        ['Grade 11 Objective Qty', 'Grade 11 Objective Amount'],
        ['Grade 10 Handbook Qty', 'Grade 10 Handbook Amount']
    ];
    const itemNames = AdminBooks.map((book) => book.name);
    itemFields.forEach(([quantityField, amountField], index) => {
        const quantity = Number(order[quantityField] || 0);
        if (quantity > 0) addReceiptLine(itemList, `${itemNames[index]} × ${quantity}`, formatKyats(order[amountField]));
    });
    document.getElementById('receipt-total').textContent = formatKyats(order.Total);
    document.getElementById('receipt').hidden = false;
    document.getElementById('receipt').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('voucher-search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('voucher-status');
    status.className = 'status-message';
    document.getElementById('receipt').hidden = true;
    try {
        const cached = await AdminApi.getCachedOrders();
        if (!cached) {
            status.textContent = 'ဖုန်းတွင်း data မရှိသေးပါ။ refresh ကိုနှိပ်ပါ။';
            return;
        }
        orders = cached.data;
        document.getElementById('voucher-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        const count = renderVoucherMatches(document.getElementById('voucher-query').value);
        status.textContent = count
            ? `${count.toLocaleString('my-MM')} ခုတွေ့သည်။ ဘောက်ချာထုတ်မည့်အမှာကို ရွေးပါ။`
            : 'အမှာစာ မတွေ့ပါ။';
    } catch (error) {
        console.error('Unable to search cached orders for a voucher.', error);
        status.textContent = 'ဖုန်းတွင်း data ကို ဖတ်မရပါ။ refresh ကိုနှိပ်ပါ။';
        status.classList.add('error');
    }
});

document.getElementById('refresh-vouchers').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const status = document.getElementById('voucher-status');
    button.disabled = true;
    status.className = 'status-message';
    status.textContent = 'Google Sheet မှ အမှာစာများ ရယူနေသည်…';
    try {
        const cached = await AdminApi.refreshOrders();
        orders = cached.data;
        document.getElementById('voucher-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        const count = renderVoucherMatches(document.getElementById('voucher-query').value);
        status.textContent = count
            ? `${count.toLocaleString('my-MM')} ခုတွေ့သည်။ ဘောက်ချာထုတ်မည့်အမှာကို ရွေးပါ။`
            : 'ဖုန်းတွင်း search bar တွင် ရှာနိုင်ပါပြီ။';
    } catch (error) {
        console.error('Unable to refresh orders for vouchers.', error);
        status.textContent = 'Google Sheet မှ data မရယူနိုင်ပါ။ Internet/API ကို စစ်ပါ။';
        status.classList.add('error');
    } finally {
        button.disabled = false;
    }
});

document.getElementById('print-voucher').addEventListener('click', () => window.print());
