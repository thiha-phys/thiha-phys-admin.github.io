const form = document.getElementById('create-order-form');
const quantityInputs = new Map();
const deliveryCities = [];
let submitted = false;
const priceThresholds = [0, 10, 30, 50, 100];
const codMaxTotal = 150000;
const royalServiceFee = 300;

function selectedDeliveryService() {
    return form.querySelector('input[name="deliveryService"]:checked')?.value || '';
}

function selectedCity() {
    const value = document.getElementById('delivery-city').value.trim().toLocaleLowerCase();
    return deliveryCities.find((city) =>
        city.label.toLocaleLowerCase() === value ||
        city.english.toLocaleLowerCase() === value ||
        city.myanmar.toLocaleLowerCase() === value
    ) || null;
}

function bookPricing(book, quantity) {
    const tier = priceThresholds.reduce((selected, threshold, index) =>
        quantity >= threshold ? index : selected, 0);
    return book.prices[tier];
}

function roundDeliveryWeight(weight) {
    if (weight <= 0) return 0;
    const weightUnits = Math.round(weight * 100000);
    const wholeKg = Math.floor(weightUnits / 100000);
    const fractionalUnits = weightUnits - wholeKg * 100000;
    if (fractionalUnits < 60000) return wholeKg + 0.5;
    return wholeKg + 1;
}

function getRoyalDeliveryFee(weight, city) {
    const packages = Math.max(1, Math.ceil(weight / 5 - 0.000000001));
    const fullPackageFee = Number(city.upTo2Kg) + 3 * Number(city.nextKg);
    const lastPackageWeight = weight - 5 * (packages - 1);
    const extraKg = Math.ceil(Math.max(0, lastPackageWeight - 2) - 0.000000001);
    return (packages - 1) * fullPackageFee +
        Number(city.upTo2Kg) + extraKg * Number(city.nextKg) + royalServiceFee;
}

function getPricing() {
    const quantities = AdminBooks.map((book) => Number(quantityInputs.get(book.id).value || 0));
    const amounts = quantities.map((quantity, index) =>
        quantity * bookPricing(AdminBooks[index], quantity));
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const actualWeight = Math.round(quantities.reduce((sum, quantity, index) =>
        sum + quantity * AdminBooks[index].weight, 0) * 100000) / 100000;
    const weight = roundDeliveryWeight(actualWeight);
    return { quantities, amounts, total, weight };
}

function getRoundingAdjustment(total) {
    return total % 100 === 50 ? 50 : 0;
}

function roundDeliveryFeeTo500(fee) {
    return Math.ceil(fee / 500 - 0.000000001) * 500;
}

function updatePaymentOptions(totalWithDelivery) {
    const cod = form.querySelector('input[name="paymentMethod"][value="COD"]');
    const kbzPay = form.querySelector('input[name="paymentMethod"][value="KBZ Pay"]');
    const carDelivery = selectedDeliveryService() === 'Car';
    const unavailable = carDelivery || totalWithDelivery >= codMaxTotal;
    cod.disabled = unavailable;
    cod.closest('.payment-option').hidden = carDelivery;
    document.getElementById('cod-hint').hidden = !unavailable || carDelivery;
    if (unavailable && cod.checked) kbzPay.checked = true;
}

function updateSummary() {
    const pricing = getPricing();
    const city = selectedCity();
    const service = selectedDeliveryService();
    const totalElement = document.getElementById('order-total');
    const weightElement = document.getElementById('order-weight');
    const feeElement = document.getElementById('delivery-fee');
    const payableElement = document.getElementById('payable-total');
    const deliveryNote = document.getElementById('delivery-note');
    let deliveryFee = 0;
    let feeIsKnown = false;

    AdminBooks.forEach((book, index) => {
        const price = document.querySelector(`[data-book-price="${book.id}"]`);
        const amount = document.querySelector(`[data-book-amount="${book.id}"]`);
        price.textContent = formatKyats(bookPricing(book, pricing.quantities[index]));
        amount.textContent = formatKyats(pricing.amounts[index]);
    });
    totalElement.textContent = formatKyats(pricing.total);
    weightElement.textContent = `စုစုပေါင်းအလေးချိန်: ${pricing.weight} kg`;

    if (service === 'Car') {
        feeElement.textContent = 'ကားဂိတ်တွင် သီးခြားပေးချေရန်';
        feeIsKnown = true;
        deliveryNote.textContent = 'ကားတင်ပြီးပါက ကားတင်ဘောက်ချာ ပြန်ပို့ပေးပါမည်။';
    } else if (service === 'Royal' && city) {
        deliveryFee = getRoyalDeliveryFee(pricing.weight, city);
        feeIsKnown = true;
        deliveryNote.textContent = 'Royal delivery service အပ်ပြီးပါက ဘောက်ချာ ပို့ပေးပါမည်။';
    } else {
        feeElement.textContent = 'မြို့နှင့်ဝန်ဆောင်မှု ရွေးပါ';
        deliveryNote.textContent = '';
    }
    deliveryNote.hidden = !deliveryNote.textContent;
    deliveryFee = feeIsKnown ? roundDeliveryFeeTo500(deliveryFee) : deliveryFee;
    if (service === 'Royal' && city) feeElement.textContent = formatKyats(deliveryFee);
    const totalPayable = pricing.total + deliveryFee;
    payableElement.textContent = feeIsKnown
        ? formatKyats(totalPayable)
        : 'တွက်ချက်ရန်လိုအပ်သည်';
    updatePaymentOptions(feeIsKnown ? totalPayable : pricing.total);
}

AdminBooks.forEach((book) => {
    const label = document.createElement('label');
    label.className = 'field order-book-field';
    label.append(document.createTextNode(book.name));
    const price = document.createElement('strong');
    price.className = 'book-unit-price';
    price.dataset.bookPrice = book.id;
    const input = document.createElement('input');
    input.type = 'number';
    input.name = `quantity-${book.id}`;
    input.min = '0';
    input.step = '1';
    input.value = '0';
    input.inputMode = 'numeric';
    input.setAttribute('aria-label', `${book.name} အုပ်ရေ`);
    const amount = document.createElement('small');
    amount.className = 'book-amount';
    amount.dataset.bookAmount = book.id;
    amount.textContent = formatKyats(0);
    input.addEventListener('input', updateSummary);
    label.append(price, input, amount);
    document.getElementById('book-quantities').append(label);
    quantityInputs.set(book.id, input);
});

function receiptRow(label, value) {
    const row = document.createElement('div');
    row.className = 'receipt-line';
    const name = document.createElement('span');
    name.textContent = label;
    const text = document.createElement('strong');
    text.textContent = value || '—';
    row.append(name, text);
    return row;
}

function showReceipt(order) {
    document.getElementById('receipt-voucher').textContent = `ဘောက်ချာအမှတ် ${order.voucherNo}`;
    const content = document.getElementById('receipt-content');
    content.replaceChildren();
    const receiptRows = [
        ['အမည်', order.name],
        ['ဖုန်းနံပါတ် ၁', order.phone],
        ['ဖုန်းနံပါတ် ၂', order.phone2],
        ['လိပ်စာ', order.address],
        ['မှာယူသည့်ရက်', order.orderDate],
        ['ပို့ဆောင်ရေး', order.deliveryService === 'Car' ? 'ကားတင်ရန်' : 'Royal Delivery Service'],
        ['ငွေပေးချေမှု', order.paymentMethod]
    ];
    if (order.deliveryService === 'Car') {
        receiptRows.push(['ကားဂိတ် / ကားအမည်', order.carInfo || order.deliveryNotes]);
    }
    receiptRows.forEach(([label, value]) => content.append(receiptRow(label, value)));
    order.items.filter((item) => item.quantity > 0).forEach((item) =>
        content.append(receiptRow(`${item.name} × ${item.quantity}`, formatKyats(item.amount))));
    const totals = document.getElementById('receipt-totals');
    totals.replaceChildren();
    totals.append(receiptRow('စုစုပေါင်းအလေးချိန်', `${order.totalKg} kg`));
    totals.append(receiptRow('စာအုပ်ဖိုးစုစုပေါင်း', formatKyats(order.total)));
    totals.append(receiptRow('ပို့ခ', order.deliveryService === 'Car'
        ? 'ကားဂိတ်တွင် သီးခြားပေးချေရန်'
        : formatKyats(order.deliveryFees)));
    totals.append(receiptRow('ငွေကောက်', formatKyats(order.cashCollection)));
    document.getElementById('receipt-total').textContent = formatKyats(order.payableTotal);
    document.getElementById('created-receipt').hidden = false;
    document.getElementById('created-receipt').scrollIntoView({ behavior: 'smooth' });
}

form.querySelectorAll('input[name="deliveryService"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        const isCar = selectedDeliveryService() === 'Car';
        document.getElementById('car-details-field').hidden = !isCar;
        form.elements.carDetails.required = isCar;
        updateSummary();
    });
});
form.querySelectorAll('input[name="paymentMethod"]').forEach((radio) =>
    radio.addEventListener('change', updateSummary)
);
document.getElementById('delivery-city').addEventListener('input', updateSummary);

AdminApi.getDeliveryCities()
    .then((cities) => {
        deliveryCities.push(...cities);
        const options = document.getElementById('delivery-city-options');
        cities.forEach((city) => {
            const option = document.createElement('option');
            option.value = city.label;
            options.append(option);
        });
        document.getElementById('delivery-city').disabled = false;
        document.getElementById('city-status').textContent =
            `${cities.length} မြို့ ရှိပါသည်။ English သို့မဟုတ် မြန်မာအမည်ဖြင့် ရှာပါ။`;
    })
    .catch((error) => {
        console.error('Unable to load delivery cities.', error);
        document.getElementById('city-status').textContent =
            'မြို့စာရင်းကို ရယူမရပါ။ အင်တာနက်နှင့် Google Sheet API ကို စစ်ဆေးပါ။';
        document.getElementById('submit-order').disabled = true;
    });

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('order-status');
    status.className = 'status-message';
    status.textContent = '';
    if (!form.reportValidity()) return;
    const pricing = getPricing();
    if (pricing.quantities.some((quantity) => !Number.isSafeInteger(quantity) || quantity < 0)) {
        status.textContent = 'အုပ်ရေကို ၀ နှင့်အထက် ကိန်းပြည့်ဖြင့် ထည့်ပါ။';
        status.classList.add('error');
        return;
    }
    if (pricing.total <= 0) {
        status.textContent = 'အနည်းဆုံး စာအုပ်တစ်အုပ်၏ အရေအတွက်ကို ထည့်ပါ။';
        status.classList.add('error');
        return;
    }
    const city = selectedCity();
    if (!city) {
        status.textContent = 'မြို့စာရင်းမှ ပို့ဆောင်မည့်မြို့ကို ရွေးပါ။';
        status.classList.add('error');
        return;
    }
    const service = selectedDeliveryService();
    const baseDeliveryFee = service === 'Royal' ? getRoyalDeliveryFee(pricing.weight, city) : 0;
    const deliveryFee = roundDeliveryFeeTo500(baseDeliveryFee);
    const totalPayable = pricing.total + deliveryFee;
    const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || '';
    if (service === 'Car' && paymentMethod !== 'KBZ Pay') {
        status.textContent = 'ကားတင်ရန်အတွက် KBZ Pay တစ်မျိုးတည်းသာ ရွေးချယ်နိုင်ပါသည်။';
        status.classList.add('error');
        return;
    }
    if (paymentMethod === 'COD' && totalPayable >= codMaxTotal) {
        status.textContent = 'စုစုပေါင်း ၁၅၀,၀၀၀ ကျပ်နှင့်အထက်ဖြစ်သဖြင့် COD ရွေး၍မရပါ။';
        status.classList.add('error');
        return;
    }
    const data = new FormData(form);
    const order = {
        name: String(data.get('name')).trim(),
        phone: String(data.get('phone')).trim(),
        phone2: String(data.get('phone2')).trim(),
        deliveryCity: city.english,
        address: String(data.get('address')).trim(),
        deliveryService: service,
        carDetails: String(data.get('carDetails')).trim(),
        paymentMethod,
        items: AdminBooks.map((book, index) => ({
            id: book.id,
            quantity: pricing.quantities[index]
        }))
    };
    const button = document.getElementById('submit-order');
    button.disabled = true;
    status.textContent = 'အမှာစာ သိမ်းဆည်းနေသည်…';
    try {
        const result = await AdminApi.createOrder(order);
        submitted = true;
        form.querySelectorAll('input, textarea, select, button').forEach((field) => {
            field.disabled = true;
        });
        showReceipt(result.order);
        status.textContent = result.localCacheError
            ? 'အမှာစာကို Google Sheet တွင် သိမ်းပြီးပါပြီ။ ဖုန်းတွင်း cache မပြောင်းနိုင်ပါ။'
            : result.cacheNeedsRefresh
                ? 'အမှာစာကို Google Sheet တွင် သိမ်းပြီးပါပြီ။ Data အပြည့်အစုံအတွက် refresh လုပ်ပါ။'
                : 'အမှာစာသိမ်းပြီးပါပြီ။ ဘောက်ချာကို ပုံအဖြစ်သိမ်း၊ မျှဝေ သို့မဟုတ် Print / Save PDF လုပ်နိုင်ပါသည်။';
        status.classList.add(result.localCacheError || result.cacheNeedsRefresh ? 'error' : 'success');
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
attachReceiptActions({
    receiptId: 'created-receipt',
    saveButtonId: 'save-created-receipt-image',
    shareButtonId: 'share-created-receipt',
    statusId: 'created-receipt-action-status'
});
updateSummary();
