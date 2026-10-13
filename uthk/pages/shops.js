const shopGrid = document.getElementById('shop-grid');
const shopStatus = document.getElementById('shops-status');

async function loadShops(button) {
    if (button) button.disabled = true;
    shopStatus.classList.remove('error');
    shopStatus.textContent = 'ဆိုင်စာရင်းရယူနေသည်…';
    try {
        const shops = await AdminApi.getShops();
        shopGrid.replaceChildren();
        shops.forEach((shop) => {
            const link = document.createElement('a');
            link.className = 'shop-card';
            link.href = `shop.html?id=${encodeURIComponent(shop.id)}`;
            link.innerHTML = `<span class="shop-card-icon"><i class="fa-solid fa-shop" aria-hidden="true"></i></span><strong>${escapeText(shop.name)}</strong>`;
            shopGrid.append(link);
        });
        shopStatus.textContent = `${shops.length.toLocaleString('my-MM')} ဆိုင်`;
    } catch (error) {
        console.error('Unable to load the shop list.', error);
        shopStatus.textContent = 'ဆိုင်စာရင်းကို Google Sheet မှ ရယူမရပါ။ အင်တာနက်/API ကိုစစ်ပြီး ထပ်စမ်းပါ။';
        shopStatus.classList.add('error');
    } finally {
        if (button) button.disabled = false;
    }
}

document.getElementById('refresh-shops').addEventListener('click', (event) =>
    loadShops(event.currentTarget)
);
loadShops();
