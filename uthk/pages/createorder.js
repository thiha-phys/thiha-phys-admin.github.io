const form = document.getElementById('create-order-form');
const quantityInputs = new Map();
let submitted = false;

function calculateTotal() {
    return AdminBooks.reduce((sum, book) => sum + book.price * Number(quantityInputs.get(book.id).value || 0), 0);
}

function updateTotal() {
    document.getElementById('order-total').textContent = formatKyats(calculateTotal());
}

AdminBooks.forEach((book) => {
    const label = document.createElement('label');
    label.className = 'field';
    label.append(document.createTextNode(`${book.name} · ${formatKyats(book.price)}`));
    const input = document.createElement('input');
    input.type = 'number';
    input.name = `quantity-${book.id}`;
    input.min = '0';
    input.step = '1';
    input.value = '0';
    input.inputMode = 'numeric';
    input.setAttribute('aria-label', `${book.name} အုပ်ရေ`);
    input.addEventListener('input', updateTotal);
    label.append(input);
    document.getElementById('book-quantities').append(label);
    quantityInputs.set(book.id, input);
});

function receiptRow(label, value) {
    const row = document.createElement('div');
    row.className = 'receipt-line';
    const name = document.createElement('span');
    name.textContent = label;
    const text = document.createElement('strong');
    text.textContent = value;
    row.append(name, text);
    return row;
}

function showReceipt(order) {
    document.getElementById('receipt-voucher').textContent = `ဘောက်ချာအမှတ် ${order.voucherNo}`;
    const content = document.getElementById('receipt-content');
    content.replaceChildren();
    [
        ['အမည်', order.name], ['ဖုန်း', order.phone], ['လိပ်စာ', order.address],
        ['ရက်စွဲ', order.orderDate], ['ငွေပေးချေမှု', order.paymentMethod]
    ].forEach(([label, value]) => content.append(receiptRow(label, value)));
    order.items.filter((item) => item.quantity > 0).forEach((item) =>
        content.append(receiptRow(`${item.name} × ${item.quantity}`, formatKyats(item.amount))));
    document.getElementById('receipt-total').textContent = formatKyats(order.total);
    document.getElementById('created-receipt').hidden = false;
    document.getElementById('created-receipt').scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('order-status');
    status.className = 'status-message';
    status.textContent = '';
    if (!form.reportValidity()) return;
    const items = AdminBooks.map((book) => ({
        id: book.id,
        quantity: Number(quantityInputs.get(book.id).value || 0)
    }));
    if (items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 0)) {
        status.textContent = 'အုပ်ရေကို ၀ နှင့်အထက် ကိန်းပြည့်ဖြင့် ထည့်ပါ။';
        status.classList.add('error');
        return;
    }
    if (!items.some((item) => item.quantity > 0)) {
        status.textContent = 'အနည်းဆုံး စာအုပ်တစ်အုပ်၏ အရေအတွက်ကို ထည့်ပါ။';
        status.classList.add('error');
        return;
    }
    const data = new FormData(form);
    const order = {
        name: String(data.get('name')).trim(),
        phone: String(data.get('phone')).trim(),
        address: String(data.get('address')).trim(),
        paymentMethod: String(data.get('paymentMethod')).trim(),
        items
    };
    const button = document.getElementById('submit-order');
    button.disabled = true;
    status.textContent = 'အမှာစာ သိမ်းဆည်းနေသည်…';
    try {
        const result = await AdminApi.createOrder(order);
        submitted = true;
        form.querySelectorAll('input, textarea, select').forEach((field) => { field.disabled = true; });
        showReceipt(result.order);
        status.textContent = result.localCacheError
            ? 'အမှာစာကို Google Sheet တွင် သိမ်းပြီးပါပြီ။ ဖုန်းတွင်း cache မပြောင်းနိုင်ပါ။ ဘောက်ချာကို Print / Save PDF လုပ်နိုင်ပါသည်။'
            : result.cacheNeedsRefresh
                ? 'အမှာစာကို Google Sheet တွင် သိမ်းပြီးပါပြီ။ ဘောက်ချာကို Print / Save PDF လုပ်နိုင်ပါသည်။ Data အပြည့်အစုံအတွက် home မှ refresh နှိပ်ပါ။'
            : 'အမှာစာ သိမ်းပြီးပါပြီ။ ဘောက်ချာကို Print / Save PDF လုပ်နိုင်ပါသည်။';
        if (!result.localCacheError && !result.cacheNeedsRefresh) status.classList.add('success');
        button.textContent = 'မှာယူပြီးပါပြီ';
    } catch (error) {
        console.error('Unable to create order.', error);
        status.textContent = 'အမှာစာသိမ်းမရပါ။ Internet နှင့် Google Sheet API ကို စစ်ဆေးပါ။';
        status.classList.add('error');
    } finally {
        button.disabled = submitted;
    }
});

document.getElementById('print-created-receipt').addEventListener('click', () => window.print());
