const fields = [
    'Name', 'Address', 'Phone', 'Order Date',
    'Special Qty', 'Special Amount', 'Practice Qty', 'Practice Amount',
    'Old Questions Qty', 'Old Questions Amount', 'Solution Qty', 'Solution Amount',
    'Grade 11 Handbook Qty', 'Grade 11 Handbook Amount',
    'Grade 11 Objective Qty', 'Grade 11 Objective Amount',
    'Grade 10 Handbook Qty', 'Grade 10 Handbook Amount', 'Total',
    'Payment Method', 'Amount Received', 'KPay Account', 'Pay Date',
    'Royal VOC No', 'Delivered Date', 'Delivery', 'Facebook Account Name'
];
let orders = [];
let selectedOrder = null;

function dateInputValue(value) {
    const text = String(value || '').trim();
    const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
    const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!slashDate) return '';
    const [, month, day, year] = slashDate;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
        ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        : '';
}

function showMatches(query) {
    const matches = orders.filter((order) => orderMatches(order, query));
    const resultList = document.getElementById('lookup-results');
    resultList.replaceChildren();
    if (!matches.length) {
        resultList.innerHTML = '<div class="empty-state">အမှာစာ မတွေ့ပါ။</div>';
        return 0;
    }
    matches.slice(0, 50).forEach((order) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'result-choice';
        button.innerHTML = `<span><strong>${escapeText(order['Voucher No'])} · ${escapeText(order.Name)}</strong><br><small>${escapeText(order.Phone)} · ${escapeText(orderDate(order['Order Date']))}</small></span><span>${formatKyats(order.Total)}</span>`;
        button.addEventListener('click', () => openOrder(order));
        resultList.append(button);
    });
    return matches.length;
}

function openOrder(order) {
    selectedOrder = order;
    document.getElementById('lookup-status').textContent =
        `ဘောက်ချာ ${order['Voucher No']} ကိုရွေးချယ်ထားသည်။`;
    document.getElementById('edit-panel').hidden = false;
    const container = document.getElementById('edit-fields');
    container.replaceChildren();
    const voucherLabel = document.createElement('label');
    voucherLabel.className = 'edit-field';
    voucherLabel.textContent = 'Voucher No (ပြင်မရပါ)';
    const voucherInput = document.createElement('input');
    voucherInput.value = order['Voucher No'];
    voucherInput.disabled = true;
    voucherLabel.append(voucherInput);
    container.append(voucherLabel);
    fields.forEach((field) => {
        const label = document.createElement('label');
        label.className = 'edit-field';
        label.append(document.createTextNode(field));
        const input = document.createElement(field === 'Payment Method' ? 'select' : 'input');
        input.name = field;
        if (field === 'Pay Date' || field === 'Delivered Date') {
            input.type = 'date';
            input.value = dateInputValue(orderField(order, field));
        } else if (field === 'Payment Method') {
            ['COD', 'KBZ Pay'].forEach((method) => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method === 'COD' ? 'COD (ပစ္စည်းရောက်မှ ငွေချေ)' : method;
                input.append(option);
            });
            const currentMethod = orderField(order, field);
            if (currentMethod && !['COD', 'KBZ Pay'].includes(currentMethod)) {
                const existing = document.createElement('option');
                existing.value = currentMethod;
                existing.textContent = `${currentMethod} (လက်ရှိ)`;
                input.append(existing);
            }
            input.value = currentMethod || 'KBZ Pay';
        } else {
            input.value = orderField(order, field);
            input.autocomplete = 'off';
        }
        label.append(input);
        container.append(label);
    });
    document.getElementById('edit-status').textContent = '';
    document.getElementById('edit-panel').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('lookup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('lookup-status');
    status.className = 'status-message';
    document.getElementById('lookup-results').replaceChildren();
    document.getElementById('edit-panel').hidden = true;
    try {
        const cached = await AdminApi.getCachedOrders();
        if (!cached) {
            status.textContent = 'ဖုန်းတွင်း data မရှိသေးပါ။ အပေါ်က refresh ကိုနှိပ်ပါ။';
            return;
        }
        orders = cached.data;
        document.getElementById('lookup-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        const count = showMatches(document.getElementById('lookup-query').value);
        status.textContent = count
            ? `${count.toLocaleString('my-MM')} ခုတွေ့သည်။ ပြင်ဆင်မည့်အမှာကို ရွေးပါ။`
            : 'အမှာစာ မတွေ့ပါ။';
    } catch (error) {
        console.error('Unable to search cached orders for editing.', error);
        status.textContent = 'ဖုန်းတွင်း data ကို ဖတ်မရပါ။ refresh ကိုနှိပ်ပါ။';
        status.classList.add('error');
    }
});

document.getElementById('refresh-orders').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const status = document.getElementById('lookup-status');
    button.disabled = true;
    status.className = 'status-message';
    status.textContent = 'Google Sheet မှ အမှာစာများ ရယူနေသည်…';
    try {
        const cached = await AdminApi.refreshOrders();
        orders = cached.data;
        document.getElementById('lookup-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        const query = document.getElementById('lookup-query').value;
        if (query.trim()) {
            const count = showMatches(query);
            status.textContent = count
                ? `${count.toLocaleString('my-MM')} ခုတွေ့သည်။ ပြင်ဆင်မည့်အမှာကို ရွေးပါ။`
                : 'အမှာစာ မတွေ့ပါ။';
        } else {
            document.getElementById('lookup-results').replaceChildren();
            status.textContent = 'Data အသစ်သိမ်းပြီးပါပြီ။ ရှာဖွေရန်အချက်အလက် ထည့်ပါ။';
        }
    } catch (error) {
        console.error('Unable to refresh orders for editing.', error);
        status.textContent = 'Google Sheet မှ data မရယူနိုင်ပါ။ Internet/API ကို စစ်ပါ။';
        status.classList.add('error');
    } finally {
        button.disabled = false;
    }
});

document.getElementById('edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedOrder) return;
    if (!window.confirm(`ဘောက်ချာ ${selectedOrder['Voucher No']} အမှာစာကို ရှိပြီးသား row ထဲတွင် ပြင်ဆင်သိမ်းမလား?`)) return;
    const status = document.getElementById('edit-status');
    const button = document.getElementById('save-order');
    const updated = { voucherNo: selectedOrder['Voucher No'] };
    new FormData(event.currentTarget).forEach((value, key) => { updated[key] = String(value).trim(); });
    status.className = 'status-message';
    status.textContent = 'ပြင်ဆင်ချက် သိမ်းဆည်းနေသည်…';
    button.disabled = true;
    try {
        const result = await AdminApi.updateOrder(updated);
        selectedOrder = result.order;
        const index = orders.findIndex((order) => order['Voucher No'] === updated.voucherNo);
        if (index >= 0) orders[index] = result.order;
        status.textContent = result.localCacheError
            ? 'အမှာစာကို Sheet ထဲတွင် ပြင်ဆင်သိမ်းပြီးပါပြီ။ ဖုန်းတွင်း cache မပြောင်းနိုင်ပါ။ Refresh လုပ်ပါ။'
            : result.cacheNeedsRefresh
                ? 'အမှာစာကို Sheet ထဲတွင် ပြင်ဆင်သိမ်းပြီးပါပြီ။ အပြည့်အစုံ data အတွက် refresh လုပ်ပါ။'
                : 'အမှာစာကို Sheet ထဲနှင့် ဖုန်းတွင်း data တွင် ပြင်ဆင်သိမ်းပြီးပါပြီ။';
        status.classList.add('success');
    } catch (error) {
        console.error('Unable to update the order.', error);
        status.textContent = 'ပြင်ဆင်ချက် မသိမ်းနိုင်ပါ။ Google Sheet API ကို စစ်ဆေးပါ။';
        status.classList.add('error');
    } finally {
        button.disabled = false;
    }
});
