const shopId = new URLSearchParams(window.location.search).get('id') || '';
const shopStatusElement = document.getElementById('shop-status');

async function loadShop() {
    try {
        const shops = await AdminApi.getShops();
        const shop = shops.find((candidate) => candidate.id === shopId);
        if (!shop) throw new Error('ဆိုင်ကို ရှာမတွေ့ပါ။');
        document.title = `${shop.name} | UTHK Admin`;
        document.getElementById('shop-name').textContent = shop.name;
        document.getElementById('shop-back').href = 'shops.html';
        document.getElementById('shop-create-link').href =
            `shop-order.html?shop=${encodeURIComponent(shop.id)}`;
        document.getElementById('shop-history-link').href =
            `shop-history.html?shop=${encodeURIComponent(shop.id)}`;
        document.getElementById('shop-actions').hidden = false;
        shopStatusElement.textContent = '';
    } catch (error) {
        console.error('Unable to load the selected shop.', error);
        shopStatusElement.textContent = error.message || 'ဆိုင်အချက်အလက်ကို ရယူမရပါ။';
        shopStatusElement.classList.add('error');
    }
}

loadShop();
