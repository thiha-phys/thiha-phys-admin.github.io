const shopOrderParams = new URLSearchParams(window.location.search);
const selectedShopId = shopOrderParams.get('shop') || '';
const editingVoucher = shopOrderParams.get('voucher') || '';
const reprintingVoucher = shopOrderParams.get('receipt') === '1';
const shopOrderForm = document.getElementById('shop-order-form');
const itemFields = [
    ['Special Qty', 'Special Amount'],
    ['Practice Qty', 'Practice Amount'],
    ['OQ Qty', 'OQ Amount'],
    ['Solution Qty', 'Solution Amount'],
    ['G11 handbook Qty', 'G11 handbook amount'],
    ['G11 Objective Qty', 'G11 Objective amount'],
    ['G10 handbook Qty', 'G10 handbook amount']
];
const orderDetailFields = [
    ['Received', 'ငွေလက်ခံရရှိ'],
    ['Kpay acc', 'KPay account'],
    ['pay date', 'ငွေပေးချေသည့်ရက်'],
    ['delivery service', 'ပို့ဆောင်ရေးဝန်ဆောင်မှု'],
    ['car infrom', 'ကားအချက်အလက်'],
    ['address', 'လိပ်စာ'],
    ['phone 1', 'ဖုန်းနံပါတ် ၁'],
    ['phone 2', 'ဖုန်းနံပါတ် ၂']
];
let selectedShop = null;
let saved = false;

function todayAsIsoDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function addShopField(container, name, labelText, type, value, options = {}) {
    const label = document.createElement('label');
    label.className = 'field';
    label.append(document.createTextNode(labelText));
    const input = document.createElement('input');
    input.name = name;
    input.type = type;
    input.value = value == null ? '' : String(value);
    input.autocomplete = 'off';
    if (type === 'number') {
        input.min = '0';
        input.step = '1';
        input.inputMode = 'numeric';
    }
    if (options.required) input.required = true;
    if (options.readOnly) input.readOnly = true;
    if (options.placeholder) input.placeholder = options.placeholder;
    label.append(input);
    if (options.note) {
        const note = document.createElement('small');
        note.textContent = options.note;
        label.append(note);
    }
    container.append(label);
    return input;
}

function renderFields(order = {}) {
    const dates = document.getElementById('order-dates');
    const books = document.getElementById('book-quantities');
    const details = document.getElementById('order-details');
    const discountRate = selectedShop.discountRate || 20;
    const discountPercent = discountRate.toLocaleString('my-MM');
    dates.replaceChildren();
    books.replaceChildren();
    details.replaceChildren();
    addShopField(dates, 'Order Date', 'Order Date', 'date',
        order['Order Date'] || todayAsIsoDate(), { required: true });
    addShopField(dates, 'Delivered Date', 'Delivered Date', 'date', order['Delivered Date']);
    itemFields.forEach(([quantityField, amountField], index) => {
        const book = AdminBooks[index];
        const unitPrice = book.price * (100 - discountRate) / 100;
        const priceNote = `မူလ ${formatKyats(book.price)} · ${discountPercent}% လျှော့ပြီး တစ်အုပ် ${formatKyats(unitPrice)}`;
        addShopField(books, quantityField, `${book.name} · အုပ်ရေ`, 'number',
            order[quantityField] || '0');
        addShopField(books, amountField, `${book.name} · ကျသင့်ငွေ`, 'number',
            order[amountField] || '0', { readOnly: true, note: priceNote });
    });
    orderDetailFields.forEach(([field, label]) => {
        const type = field === 'Received' ? 'number' : field === 'pay date' ? 'date' : 'text';
        const profileField = field === 'address' ? 'address'
            : field === 'phone 1' ? 'phone1'
                : field === 'phone 2' ? 'phone2'
                    : '';
        const profileValue = profileField ? selectedShop[profileField] : '';
        addShopField(details, field, label, type,
            order[field] !== undefined ? order[field] : profileValue || '');
    });
    if (editingVoucher) {
        const voucherLabel = document.createElement('label');
        voucherLabel.className = 'field';
        voucherLabel.append(document.createTextNode('Voucher No'));
        const voucherInput = document.createElement('input');
        voucherInput.value = editingVoucher;
        voucherInput.readOnly = true;
        voucherLabel.append(voucherInput);
        dates.append(voucherLabel);
    }
    updateShopTotal();
}

function updateShopTotal() {
    const discountRate = selectedShop ? selectedShop.discountRate || 20 : 20;
    let total = 0;
    let hasInvalidQuantity = false;
    itemFields.forEach(([quantityField, amountField], index) => {
        const quantityInput = shopOrderForm.elements.namedItem(quantityField);
        const amountInput = shopOrderForm.elements.namedItem(amountField);
        if (!quantityInput || !amountInput) return;
        const rawQuantity = quantityInput.value.trim();
        const quantity = rawQuantity === '' ? 0 : Number(rawQuantity);
        if (!Number.isSafeInteger(quantity) || quantity < 0) {
            amountInput.value = '';
            hasInvalidQuantity = true;
            return;
        }
        const unitPrice = AdminBooks[index].price * (100 - discountRate) / 100;
        const amount = quantity * unitPrice;
        amountInput.value = Number.isSafeInteger(amount) ? String(amount) : '';
        if (!Number.isSafeInteger(amount)) {
            hasInvalidQuantity = true;
            return;
        }
        total += amount;
    });
    document.getElementById('shop-order-total').textContent = hasInvalidQuantity
        ? 'အုပ်ရေကို စစ်ဆေးပါ'
        : formatKyats(total);
}

function appendReceiptLine(container, label, value) {
    const line = document.createElement('div');
    line.className = 'order-detail-line';
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    const valueElement = document.createElement('strong');
    valueElement.textContent = value || '—';
    line.append(labelElement, valueElement);
    container.append(line);
}

function showShopReceipt(order) {
    document.getElementById('receipt-voucher').textContent = `ဘောက်ချာအမှတ် ${order['Voucher No']}`;
    document.getElementById('receipt-shop').textContent = selectedShop.name;
    document.getElementById('receipt-total').textContent = formatKyats(order.Total);
    const content = document.getElementById('receipt-content');
    content.replaceChildren();
    [
        ['Order Date', order['Order Date']],
        ['Delivered Date', order['Delivered Date']],
        ['Address', order.address],
        ['Phone 1', order['phone 1']],
        ['Phone 2', order['phone 2']],
        ['လျှော့ဈေး', `${(selectedShop.discountRate || 20).toLocaleString('my-MM')}%`],
        ...itemFields.map(([quantityField, amountField], index) => {
            const quantity = Number(order[quantityField] || 0);
            const book = AdminBooks[index];
            const unitPrice = book.price * (100 - (selectedShop.discountRate || 20)) / 100;
            return [`${book.name} · ${quantity} × ${formatKyats(unitPrice)}`, formatKyats(order[amountField])];
        }),
        ['Received', formatKyats(order.Received)],
        ['KPay account', order['Kpay acc']],
        ['pay date', order['pay date']],
        ['delivery service', order['delivery service']],
        ['car infrom', order['car infrom']]
    ].forEach(([label, value]) => appendReceiptLine(content, label, value));
    document.getElementById('shop-receipt').hidden = false;
    document.getElementById('shop-receipt').scrollIntoView({ behavior: 'smooth' });
}

async function loadShopOrderForm() {
    const status = document.getElementById('shop-order-status');
    try {
        const shops = await AdminApi.getShops();
        selectedShop = shops.find((shop) => shop.id === selectedShopId);
        if (!selectedShop) throw new Error('ဆိုင်ကို ရှာမတွေ့ပါ။');
        document.title = `${selectedShop.name} · အမှာစာ | UTHK Admin`;
        document.getElementById('shop-order-title').textContent =
            reprintingVoucher
                ? `${selectedShop.name} · ဘောက်ချာပြန်ထုတ်ရန်`
                : editingVoucher ? `${selectedShop.name} · အချက်အလက်ပြင်ဆင်ရန်` : `${selectedShop.name} · အမှာစာအသစ်`;
        document.getElementById('shop-order-back').href =
            editingVoucher
                ? `shop-history.html?shop=${encodeURIComponent(selectedShop.id)}`
                : `shop.html?id=${encodeURIComponent(selectedShop.id)}`;
        if (editingVoucher) {
            const orders = await AdminApi.getShopOrders(selectedShop.id);
            const order = orders.find((candidate) => candidate['Voucher No'] === editingVoucher);
            if (!order) throw new Error('ဤဘောက်ချာနံပါတ်ဖြင့် အမှာစာမတွေ့ပါ။');
            renderFields(order);
            if (reprintingVoucher) {
                shopOrderForm.hidden = true;
                showShopReceipt(order);
            }
        } else {
            renderFields();
        }
    } catch (error) {
        console.error('Unable to prepare the shop order form.', error);
        status.textContent = error.message || 'ဆိုင်အမှာစာကို ရယူမရပါ။';
        status.classList.add('error');
        document.getElementById('save-shop-order').disabled = true;
    }
}

document.getElementById('book-quantities').addEventListener('input', (event) => {
    if (event.target.name && event.target.name.endsWith('Qty')) updateShopTotal();
});
shopOrderForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('shop-order-status');
    if (!shopOrderForm.reportValidity() || !selectedShop) return;
    const order = {};
    new FormData(shopOrderForm).forEach((value, key) => { order[key] = String(value).trim(); });
    if (editingVoucher) order['Voucher No'] = editingVoucher;
    const button = document.getElementById('save-shop-order');
    button.disabled = true;
    status.className = 'status-message';
    status.textContent = editingVoucher ? 'ပြင်ဆင်ချက် သိမ်းဆည်းနေသည်…' : 'အမှာစာ သိမ်းဆည်းနေသည်…';
    try {
        const result = editingVoucher
            ? await AdminApi.updateShopOrder(selectedShop.id, order)
            : await AdminApi.createShopOrder(selectedShop.id, order);
        if (editingVoucher) {
            status.textContent = 'အမှာစာအချက်အလက်များကို ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ။';
            status.classList.add('success');
        } else {
            saved = true;
            showShopReceipt(result.order);
            shopOrderForm.querySelectorAll('input, button').forEach((field) => { field.disabled = true; });
            status.textContent = 'အမှာစာသိမ်းပြီးပါပြီ။ ဘောက်ချာကို Print / Save PDF လုပ်နိုင်ပါသည်။';
            status.classList.add('success');
        }
    } catch (error) {
        console.error('Unable to save the shop order.', error);
        status.textContent = error.message || 'အမှာစာကို သိမ်းဆည်းမရပါ။ Google Sheet API ကို စစ်ဆေးပါ။';
        status.classList.add('error');
    } finally {
        button.disabled = saved;
    }
});

document.getElementById('print-shop-receipt').addEventListener('click', () => window.print());
attachReceiptActions({
    receiptId: 'shop-receipt',
    shareButtonId: 'share-shop-receipt',
    statusId: 'shop-receipt-action-status'
});
loadShopOrderForm();
