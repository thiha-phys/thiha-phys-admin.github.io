const shopHistoryId = new URLSearchParams(window.location.search).get('shop') || '';
const shopOrdersList = document.getElementById('shop-order-list');
const shopHistoryStatus = document.getElementById('shop-history-message');
let shopOrders = [];
let historyShop = null;

function renderShopOrderDetails(order) {
    const rows = Object.entries(order).map(([key, value]) =>
        `<div class="shop-order-detail"><span>${escapeText(key)}</span><strong>${escapeText(value || '—')}</strong></div>`
    ).join('');
    const editHref = `shop-order.html?shop=${encodeURIComponent(historyShop.id)}&voucher=${encodeURIComponent(order['Voucher No'])}`;
    const receiptHref = `${editHref}&receipt=1`;
    return `<div class="shop-order-details">
        <div>${rows}</div>
        <div class="button-row no-print">
            <a class="secondary-button" href="${escapeText(receiptHref)}"><i class="fa-solid fa-receipt"></i> ဘောက်ချာပြန်ထုတ်ရန်</a>
            <a class="primary-button" href="${escapeText(editHref)}"><i class="fa-solid fa-pen-to-square"></i> အချက်အလက်ပြင်ဆင်ရန်</a>
        </div>
    </div>`;
}

function renderShopOrders() {
    const query = document.getElementById('shop-search').value.trim().toLocaleLowerCase();
    const totalOrdered = shopOrders.reduce((sum, order) => sum + Number(order.Total || 0), 0);
    const totalReceived = shopOrders.reduce((sum, order) => sum + Number(order.Received || 0), 0);
    const outstanding = shopOrders.reduce((sum, order) =>
        sum + Math.max(0, Number(order.Total || 0) - Number(order.Received || 0)), 0);
    document.getElementById('shop-total-ordered').textContent = formatKyats(totalOrdered);
    document.getElementById('shop-total-received').textContent = formatKyats(totalReceived);
    document.getElementById('shop-total-outstanding').textContent = formatKyats(outstanding);

    const matching = shopOrders.filter((order) =>
        !query || String(order['Voucher No'] || '').toLocaleLowerCase().includes(query)
    ).sort((a, b) => String(b['Order Date'] || '').localeCompare(String(a['Order Date'] || '')));
    shopOrdersList.replaceChildren();
    if (!matching.length) {
        shopOrdersList.innerHTML = '<div class="empty-state">ကိုက်ညီသော အမှာစာ မတွေ့ပါ။</div>';
        shopHistoryStatus.textContent = 'အမှာစာ 0 ခု';
        return;
    }
    matching.forEach((order) => {
        const card = document.createElement('details');
        card.className = 'shop-order-card';
        const delivered = Boolean(String(order['Delivered Date'] || '').trim());
        const paid = Number(order.Received || 0) === Number(order.Total || 0);
        card.innerHTML = `<summary>
            <span class="shop-order-heading">
                <strong>${escapeText(order['Voucher No'])}</strong>
                <span class="shop-order-statuses">
                    <span class="badge ${delivered ? 'good' : 'warning'}">${delivered ? 'ပို့ပြီး' : 'မပို့ရသေး'}</span>
                    <span class="badge ${paid ? 'good' : 'warning'}">${paid ? 'ငွေရှင်းပြီး' : 'ငွေမရှင်းရသေး'}</span>
                </span>
            </span>
            <span class="order-card-info">Order Date · ${escapeText(order['Order Date'] || '—')}</span>
            <span class="order-card-totals"><span>Total <strong>${formatKyats(order.Total)}</strong></span><span>Received <strong>${formatKyats(order.Received)}</strong></span></span>
            <span class="order-card-expand"><span>အသေးစိတ်ကြည့်ရန်</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
        </summary>${renderShopOrderDetails(order)}`;
        shopOrdersList.append(card);
    });
    shopHistoryStatus.textContent = `${matching.length.toLocaleString('my-MM')} ခု ပြထားသည်`;
}

async function loadShopOrders(button) {
    if (button) button.disabled = true;
    shopHistoryStatus.className = 'status-message';
    shopHistoryStatus.textContent = 'Google Sheet မှ အမှာစာများရယူနေသည်…';
    try {
        const shops = await AdminApi.getShops();
        historyShop = shops.find((shop) => shop.id === shopHistoryId);
        if (!historyShop) throw new Error('ဆိုင်ကို ရှာမတွေ့ပါ။');
        document.title = `${historyShop.name} · အမှာစာမှတ်တမ်း | UTHK Admin`;
        document.getElementById('shop-history-title').textContent = `${historyShop.name} · အမှာစာမှတ်တမ်း`;
        document.getElementById('shop-history-back').href =
            `shop.html?id=${encodeURIComponent(historyShop.id)}`;
        shopOrders = await AdminApi.getShopOrders(historyShop.id);
        renderShopOrders();
        shopHistoryStatus.textContent = `${shopOrders.length.toLocaleString('my-MM')} ခု ရယူပြီးပါပြီ`;
    } catch (error) {
        console.error('Unable to load shop order history.', error);
        shopHistoryStatus.textContent = error.message || 'Google Sheet မှ အမှာစာများရယူမရပါ။';
        shopHistoryStatus.classList.add('error');
    } finally {
        if (button) button.disabled = false;
    }
}

document.getElementById('shop-search').addEventListener('input', renderShopOrders);
document.getElementById('refresh-shop-history').addEventListener('click', (event) =>
    loadShopOrders(event.currentTarget)
);
loadShopOrders();
