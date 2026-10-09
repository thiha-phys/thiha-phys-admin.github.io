function renderOrdersChart(orders) {
    const chart = document.getElementById('orders-chart');
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        days.push({ iso, label: date.toLocaleDateString('my-MM', { day: 'numeric' }), count: 0 });
    }
    orders.forEach((order) => {
        const date = String(order['Order Date'] || '').slice(0, 10);
        const day = days.find((item) => item.iso === date);
        if (day) day.count += 1;
    });
    const max = Math.max(1, ...days.map((day) => day.count));
    chart.replaceChildren();
    days.forEach((day) => {
        const column = document.createElement('div');
        column.className = 'chart-day';
        const count = document.createElement('span');
        count.className = 'chart-value';
        count.textContent = String(day.count);
        const barWrap = document.createElement('span');
        barWrap.className = 'chart-bar-wrap';
        const bar = document.createElement('span');
        bar.className = 'chart-bar';
        bar.style.height = `${Math.max(5, day.count / max * 75)}px`;
        barWrap.append(bar);
        const label = document.createElement('span');
        label.textContent = day.label;
        column.append(count, barWrap, label);
        chart.append(column);
    });
}

function renderDashboard(orders) {
    const received = orders.reduce((sum, order) => sum + Number(order['Amount Received'] || 0), 0);
    const outstanding = orders.reduce((sum, order) =>
        sum + Math.max(0, Number(order.Total || 0) - Number(order['Amount Received'] || 0)), 0);
    document.getElementById('stat-orders').textContent = Number(orders.length).toLocaleString('my-MM');
    document.getElementById('stat-received').textContent = formatKyats(received);
    document.getElementById('stat-outstanding').textContent = formatKyats(outstanding);
    document.getElementById('stat-delivered').textContent =
        Number(orders.filter((order) => order['Delivered Date']).length).toLocaleString('my-MM');
    renderOrdersChart(orders);
}

function formatCacheTime(updatedAt) {
    return `ဖုန်းတွင်းသိမ်းထားသည် · ${new Date(updatedAt).toLocaleString('my-MM')}`;
}

async function loadDashboard() {
    const update = document.getElementById('dashboard-updated');
    try {
        const cached = await AdminApi.getCachedOrders();
        if (!cached) {
            update.textContent = 'Data ရယူရန် refresh ကိုနှိပ်ပါ။';
            return;
        }
        renderDashboard(cached.data);
        update.textContent = formatCacheTime(cached.updatedAt);
    } catch (error) {
        console.error('Unable to read cached dashboard data.', error);
        update.textContent = 'ဖုန်းတွင်း data ကို ဖတ်မရပါ။ refresh နှိပ်ပါ။';
        update.classList.add('error');
    }
}

document.getElementById('refresh-dashboard').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const update = document.getElementById('dashboard-updated');
    button.disabled = true;
    update.classList.remove('error');
    update.textContent = 'Google Sheet မှ data ရယူနေသည်…';
    try {
        const cached = await AdminApi.refreshOrders();
        renderDashboard(cached.data);
        update.textContent = formatCacheTime(cached.updatedAt);
    } catch (error) {
        console.error('Unable to refresh dashboard data.', error);
        update.textContent = 'Google Sheet မှ data မရယူနိုင်ပါ။ Internet/API ကို စစ်ပါ။';
        update.classList.add('error');
    } finally {
        button.disabled = false;
    }
});

loadDashboard();
