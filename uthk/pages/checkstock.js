const stockForm = document.getElementById('stock-form');
const stockStatus = document.getElementById('stock-status');
const stockBookSelect = document.getElementById('stock-book');

AdminBooks.forEach((book) => {
    const option = document.createElement('option');
    option.value = book.id;
    option.textContent = book.name;
    stockBookSelect.append(option);
});
const today = new Date();
stockForm.elements.date.value = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
].join('-');

function renderStock(stock) {
    const grid = document.getElementById('stock-grid');
    grid.replaceChildren();
    stock.forEach((book) => {
        const card = document.createElement('article');
        card.className = 'stock-card';
        const title = document.createElement('h3');
        title.textContent = book.name;
        const numbers = document.createElement('div');
        numbers.className = 'stock-numbers';
        [
            ['ထည့်ထား', book.received],
            ['ပို့ပြီးနုတ်', book.delivered],
            ['လက်ကျန်', book.remaining]
        ].forEach(([label, value]) => {
            const item = document.createElement('div');
            item.className = 'stock-number';
            const name = document.createElement('span');
            name.textContent = label;
            const count = document.createElement('strong');
            count.textContent = Number(value).toLocaleString('my-MM');
            item.append(name, count);
            numbers.append(item);
        });
        const entries = document.createElement('div');
        entries.className = 'stock-entries';
        if (book.entries.length) {
            book.entries.slice().reverse().forEach((entry) => {
                const line = document.createElement('p');
                const date = document.createElement('span');
                date.textContent = orderDate(entry.date);
                const quantity = document.createElement('strong');
                quantity.textContent = `${Number(entry.quantity).toLocaleString('my-MM')} အုပ်`;
                line.append(date, quantity);
                entries.append(line);
            });
        } else {
            entries.textContent = 'Stock ထည့်ထားသော မှတ်တမ်း မရှိသေးပါ။';
        }
        card.append(title, numbers, entries);
        grid.append(card);
    });
}

async function loadStock() {
    stockStatus.className = 'status-message';
    try {
        const cached = await AdminApi.getCachedStock();
        if (!cached) {
            stockStatus.textContent = 'ဖုန်းတွင်း stock data မရှိသေးပါ။ refresh ကိုနှိပ်ပါ။';
            return;
        }
        renderStock(cached.data);
        document.getElementById('stock-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        stockStatus.textContent = '';
    } catch (error) {
        console.error('Unable to read cached book stock.', error);
        stockStatus.textContent = 'ဖုန်းတွင်း stock data ကို ဖတ်မရပါ။ refresh ကိုနှိပ်ပါ။';
        stockStatus.classList.add('error');
    }
}

async function refreshStock(button) {
    button.disabled = true;
    stockStatus.className = 'status-message';
    stockStatus.textContent = 'Google Sheet မှ stock data ရယူနေသည်…';
    try {
        const cached = await AdminApi.refreshStock();
        renderStock(cached.data);
        document.getElementById('stock-cache-status').textContent =
            `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(cached.updatedAt).toLocaleString('my-MM')}`;
        stockStatus.textContent = 'Google Sheet မှ stock data အသစ်ရယူပြီးပါပြီ။';
    } catch (error) {
        console.error('Unable to refresh book stock.', error);
        stockStatus.textContent = 'Google Sheet မှ stock data မရယူနိုင်ပါ။ Internet/API ကို စစ်ပါ။';
        stockStatus.classList.add('error');
    } finally {
        button.disabled = false;
    }
}

stockForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!stockForm.reportValidity()) return;
    const data = new FormData(stockForm);
    const button = document.getElementById('add-stock');
    button.disabled = true;
    stockStatus.className = 'status-message';
    stockStatus.textContent = 'Stock မှတ်တမ်း သိမ်းဆည်းနေသည်…';
    try {
        const result = await AdminApi.addStock({
            bookId: data.get('bookId'),
            date: data.get('date'),
            quantity: Number(data.get('quantity'))
        });
        renderStock(result.stock);
        stockForm.elements.quantity.value = '';
        stockStatus.textContent = result.localCacheError
            ? 'Stock ကို Google Sheet တွင် သိမ်းပြီးပါပြီ။ ဖုန်းတွင်း cache ကို refresh လုပ်ပါ။'
            : 'Stock-in မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ။';
        if (!result.localCacheError) stockStatus.classList.add('success');
    } catch (error) {
        console.error('Unable to add book stock.', error);
        stockStatus.textContent = 'Stock မှတ်တမ်းသိမ်းမရပါ။ Google Sheet API ကို စစ်ဆေးပါ။';
        stockStatus.classList.add('error');
    } finally {
        button.disabled = false;
    }
});

document.getElementById('refresh-stock').addEventListener('click', (event) => refreshStock(event.currentTarget));
loadStock();
