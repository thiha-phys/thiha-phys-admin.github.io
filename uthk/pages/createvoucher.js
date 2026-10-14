let orders = [];

function renderVoucherMatches(query) {
    const results = document.getElementById('voucher-results');
    results.replaceChildren();
    const matches = orders.filter((order) => orderMatches(order, query))
        .sort((a, b) => String(b['Ordered Date'] || b['Order Date'] || '')
            .localeCompare(String(a['Ordered Date'] || a['Order Date'] || '')));
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
    return line;
}

function displayVoucher(order) {
    document.getElementById('receipt-voucher').textContent = `ဘောက်ချာအမှတ် ${order['Voucher No']}`;
    const info = document.getElementById('receipt-info');
    info.replaceChildren();
    const deliveryService = order['Delivery Service'] || order.Delivery;
    const orderedDate = order['Ordered Date'] || order['Order Date'];
    const deliveredDate = order['Deliver Date'] || order['Delivered Date'] || order['Order Confirm'];
    [
        ['အမည်', order.Name],
        ['ဖုန်းနံပါတ် ၁', order['Phone 1'] || order.Phone],
        ['ဖုန်းနံပါတ် ၂', order['Phone 2']],
        ['လိပ်စာ', order.Address],
        ['မှာယူသည့်ရက်', orderedDate],
        ['ပို့ဆောင်ရေး', deliveryService === 'Car' ? 'ကားတင်ရန်' : deliveryService],
        ['ပို့ဆောင်မည့်ရက်', deliveredDate],
        ['ကားဂိတ် / ကားအမည်', order['Delivery Notes']],
        ['ငွေပေးချေမှု', order['Payment Method']]
    ].forEach(([label, value]) => addReceiptLine(info, label, String(value || '')));
    const itemList = document.getElementById('receipt-items');
    itemList.replaceChildren();
    const itemFields = [
        ['Special Qty', 'Special Amount'], ['Practice Qty', 'Practice Amount'],
        ['OQ Qty', 'OQ Amount'], ['Solution Qty', 'Solution Amount'],
        ['G11 Handbook Qty', 'G11 Handbook Amount'],
        ['G11 Objective Qty', 'G11 Objective Amount'],
        ['G10 Handbook Qty', 'G10 Handbook Amount']
    ];
    const itemNames = AdminBooks.map((book) => book.name);
    itemFields.forEach(([quantityField, amountField], index) => {
        const quantity = Number(order[quantityField] || 0);
        if (quantity > 0) addReceiptLine(itemList, `${itemNames[index]} × ${quantity}`, formatKyats(order[amountField]));
    });
    const totals = document.getElementById('receipt-totals');
    totals.replaceChildren();
    const deliveryFee = Number(order['Delivery Fees'] || 0);
    const totalKg = Number(order['Total KG'] || 0);
    if (Number.isFinite(totalKg) && totalKg > 0) {
        addReceiptLine(totals, 'စုစုပေါင်းအလေးချိန်', `${totalKg} kg`);
    }
    if (deliveryService) {
        const feeLine = addReceiptLine(totals, 'ပို့ခ', deliveryService === 'Car'
            ? 'ကားဂိတ်တွင် သီးခြားပေးချေရန်'
            : formatKyats(deliveryFee));
        feeLine.classList.add('receipt-delivery-line');
    }
    const bookTotal = Number(order.Total || 0);
    addReceiptLine(totals, 'စာအုပ်ဖိုးစုစုပေါင်း', formatKyats(bookTotal));
    addReceiptLine(totals, 'ငွေကောက် COD', formatKyats(order['Cash Collection']))
        .classList.add('receipt-cash-line');
    document.getElementById('receipt-total').textContent =
        formatKyats(bookTotal + deliveryFee);
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
