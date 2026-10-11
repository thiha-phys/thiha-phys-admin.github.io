(function () {
    const API_URL = 'https://script.google.com/macros/s/AKfycbxWcDQ_ue9hZPawB-svH9bkusQelPCdXyjXilzLgklfSxXFd74fOi3ydCoCpg0ZuEXg/exec';
    const DB_NAME = 'uthk-admin-cache';
    const DB_VERSION = 1;
    const CACHE_STORE = 'snapshots';
    const APP_SCRIPT = document.currentScript.src;
    const ORDER_FIELD_ALIASES = {
        Phone: 'Phone 1',
        'Order Date': 'Ordered Date',
        'Delivered Date': 'Deliver Date',
        'Order Confirm': 'Deliver Date',
        'Old Questions Qty': 'OQ Qty',
        'Old Questions Amount': 'OQ Amount',
        'Grade 11 Handbook Qty': 'G11 Handbook Qty',
        'Grade 11 Handbook Amount': 'G11 Handbook Amount',
        'Grade 11 Objective Qty': 'G11 Objective Qty',
        'Grade 11 Objective Amount': 'G11 Objective Amount',
        'Grade 10 Handbook Qty': 'G10 Handbook Qty',
        'Grade 10 Handbook Amount': 'G10 Handbook Amount',
        'Amount Received': 'Received',
        'Royal VOC No': 'Royal Voucher',
        Delivery: 'Delivery Service',
        'Facebook Account Name': 'Facebook Name'
    };

    function normalizeOrder(order) {
        const normalized = { ...order };
        Object.entries(ORDER_FIELD_ALIASES).forEach(([alias, canonical]) => {
            if (!Object.prototype.hasOwnProperty.call(normalized, canonical) &&
                Object.prototype.hasOwnProperty.call(normalized, alias)) {
                normalized[canonical] = normalized[alias];
            }
            if (Object.prototype.hasOwnProperty.call(normalized, canonical)) {
                normalized[alias] = normalized[canonical];
            }
        });
        return normalized;
    }

    function openCache() {
        return new Promise((resolve, reject) => {
            const opening = indexedDB.open(DB_NAME, DB_VERSION);
            opening.onupgradeneeded = () => {
                if (!opening.result.objectStoreNames.contains(CACHE_STORE)) {
                    opening.result.createObjectStore(CACHE_STORE);
                }
            };
            opening.onsuccess = () => resolve(opening.result);
            opening.onerror = () => reject(opening.error || new Error('Unable to open the local cache.'));
        });
    }

    async function readCache(key) {
        const database = await openCache();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(CACHE_STORE, 'readonly');
            const request = transaction.objectStore(CACHE_STORE).get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('Unable to read the local cache.'));
            transaction.oncomplete = () => database.close();
            transaction.onerror = () => {
                database.close();
                reject(transaction.error || new Error('Unable to read the local cache.'));
            };
        });
    }

    async function writeCache(key, value) {
        const database = await openCache();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(CACHE_STORE, 'readwrite');
            transaction.objectStore(CACHE_STORE).put(value, key);
            transaction.oncomplete = () => {
                database.close();
                resolve();
            };
            transaction.onerror = () => {
                database.close();
                reject(transaction.error || new Error('Unable to save the local cache.'));
            };
            transaction.onabort = () => {
                database.close();
                reject(transaction.error || new Error('The local cache update was cancelled.'));
            };
        });
    }

    async function request(action, payload = {}) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ action, ...payload })
        });
        if (!response.ok) throw new Error(`Google Sheet request failed (${response.status}).`);
        const result = await response.json();
        if (!result.ok) throw new Error(result.message || result.error || 'Google Sheet rejected the request.');
        return result;
    }

    async function getDeliveryCities() {
        const result = await request('getDeliveryCities');
        if (!Array.isArray(result.cities) || result.cities.some((city) =>
            !city || typeof city.english !== 'string' ||
            typeof city.myanmar !== 'string' ||
            !Number.isFinite(Number(city.upTo2Kg)) ||
            !Number.isFinite(Number(city.nextKg))
        )) {
            throw new Error('The delivery city list returned by Google Sheets is invalid.');
        }
        return result.cities;
    }

    async function refreshOrders() {
        const result = await request('listOrders');
        const snapshot = {
            data: result.orders.map(normalizeOrder),
            updatedAt: new Date().toISOString()
        };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    async function getCachedOrders() {
        const snapshot = await readCache('orders');
        return snapshot
            ? { ...snapshot, data: snapshot.data.map(normalizeOrder) }
            : null;
    }

    async function saveOrders(orders) {
        const snapshot = {
            data: orders.map(normalizeOrder),
            updatedAt: new Date().toISOString()
        };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    function createSheetOrder(resultOrder) {
        const row = {
            'Voucher No': resultOrder.voucherNo,
            Name: resultOrder.name,
            Address: resultOrder.address,
            'Phone 1': resultOrder.phone,
            'Phone 2': resultOrder.phone2 || '',
            'Ordered Date': resultOrder.orderDate,
            Total: String(resultOrder.total),
            'Payment Method': resultOrder.paymentMethod,
            Received: '',
            'Deliver Date': '',
            'Delivery Service': resultOrder.deliveryService || '',
            'Delivery Fees': String(resultOrder.deliveryFees || 0),
            'Total KG': String(resultOrder.totalKg || 0),
            'Cash Collection': String(resultOrder.cashCollection || 0),
            'Delivery Notes': resultOrder.deliveryNotes || ''
        };
        const quantityFields = [
            'Special Qty', 'Practice Qty', 'OQ Qty', 'Solution Qty',
            'G11 Handbook Qty', 'G11 Objective Qty', 'G10 Handbook Qty'
        ];
        const amountFields = [
            'Special Amount', 'Practice Amount', 'OQ Amount', 'Solution Amount',
            'G11 Handbook Amount', 'G11 Objective Amount', 'G10 Handbook Amount'
        ];
        const itemById = new Map(resultOrder.items.map((item) => [item.id, item]));
        AdminBooks.forEach((book, index) => {
            const item = itemById.get(book.id);
            if (!item) throw new Error(`The saved order is missing ${book.id}.`);
            row[quantityFields[index]] = String(item.quantity);
            row[amountFields[index]] = String(item.amount);
        });
        return normalizeOrder(row);
    }

    async function createOrder(order) {
        const result = await request('createOrder', { order });
        try {
            const cached = await getCachedOrders();
            if (!cached) {
                result.cacheNeedsRefresh = true;
            } else {
                const orders = cached.data.slice();
                orders.unshift(createSheetOrder(result.order));
                await saveOrders(orders);
            }
        } catch (error) {
            console.error('Order was saved to Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    async function updateOrder(order) {
        const result = await request('updateOrder', { order });
        result.order = normalizeOrder(result.order);
        try {
            const cached = await getCachedOrders();
            if (!cached) {
                result.cacheNeedsRefresh = true;
            } else {
                const orders = cached.data.slice();
                const index = orders.findIndex((item) => item['Voucher No'] === order.voucherNo);
                if (index < 0) orders.unshift(result.order);
                else orders[index] = result.order;
                await saveOrders(orders);
            }
        } catch (error) {
            console.error('Order was updated in Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    async function refreshStock() {
        const result = await request('getBookStock');
        const snapshot = { data: result.stock, updatedAt: new Date().toISOString() };
        await writeCache('stock', snapshot);
        return snapshot;
    }

    async function getCachedStock() {
        return readCache('stock');
    }

    async function addStock(stock) {
        const result = await request('addBookStock', { stock });
        try {
            const snapshot = { data: result.stock, updatedAt: new Date().toISOString() };
            await writeCache('stock', snapshot);
        } catch (error) {
            console.error('Stock was saved to Google Sheets but the local cache could not be updated.', error);
            result.localCacheError = true;
        }
        return result;
    }

    window.AdminApi = {
        getDeliveryCities,
        getCachedOrders,
        refreshOrders,
        createOrder,
        updateOrder,
        getCachedStock,
        refreshStock,
        addStock
    };
    window.AdminBooks = [
        { id: 'special', name: 'သင်ရိုးကုန် အထူးထုတ်', price: 20000, prices: [20000, 19000, 18000, 17000, 16000], weight: 0.7 },
        { id: 'practice', name: 'Practice Book', price: 13000, prices: [13000, 12000, 11500, 11000, 10500], weight: 0.44925 },
        { id: 'old-questions', name: 'မေးခွန်းဟောင်းစာအုပ်', price: 11000, prices: [11000, 10000, 9500, 9000, 8800], weight: 0.4668 },
        { id: 'solution', name: 'တွက်စာသီးသန့်စာအုပ်', price: 5000, prices: [5000, 4500, 4000, 4000, 3800], weight: 0.10437 },
        { id: 'g11-handbook', name: 'Grade 11 စာသင်ခန်းသုံး စာအုပ်', price: 10000, prices: [10000, 9000, 8500, 8000, 8000], weight: 0.3 },
        { id: 'g11-objective', name: 'Grade 11 တစ်မှတ်တန် သီးသန့်စာအုပ်', price: 8000, prices: [8000, 7000, 6500, 6500, 6500], weight: 0.25 },
        { id: 'g10-handbook', name: 'Grade 10 စာသင်ခန်းသုံး စာအုပ်', price: 10000, prices: [10000, 9000, 8500, 8000, 8000], weight: 0.2 }
    ];
    window.formatKyats = (value) => `${Number(value || 0).toLocaleString('my-MM')} ကျပ်`;
    window.escapeText = (value) => String(value == null ? '' : value)
        .replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    window.orderField = (order, field) => String(order[field] == null ? '' : order[field]);
    window.orderMatches = (order, query) => {
        const needle = query.trim().toLocaleLowerCase();
        const textMatches = ['Voucher No', 'Name', 'Phone'].some((field) =>
            window.orderField(order, field).toLocaleLowerCase().includes(needle)
        );
        const phoneQuery = query.replace(/[၀-၉]/g, (digit) =>
            String(digit.charCodeAt(0) - '၀'.charCodeAt(0))).trim();
        const normalizedNeedle = phoneQuery.replace(/\D/g, '');
        const normalizedPhone = window.orderField(order, 'Phone')
            .replace(/[၀-၉]/g, (digit) => String(digit.charCodeAt(0) - '၀'.charCodeAt(0)))
            .replace(/\D/g, '');
        const isPhoneQuery = /^[0-9\s()+-]+$/.test(phoneQuery);
        return !needle || textMatches ||
            (isPhoneQuery && normalizedNeedle.length > 0 && normalizedPhone.includes(normalizedNeedle));
    };
    window.orderDate = (value) => {
        const text = String(value || '').trim();
        const parsed = new Date(text.replace(' ', 'T'));
        return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleDateString('my-MM');
    };
    window.orderItemSummary = (order) => {
        const fields = [
            'Special Qty', 'Practice Qty', 'Old Questions Qty', 'Solution Qty',
            'Grade 11 Handbook Qty', 'Grade 11 Objective Qty', 'Grade 10 Handbook Qty'
        ];
        return window.AdminBooks.map((book, index) => {
            const quantity = Number(order[fields[index]] || 0);
            return quantity > 0 ? `${book.name} × ${quantity}` : '';
        }).filter(Boolean).join('၊ ');
    };

    if ('serviceWorker' in navigator && window.isSecureContext) {
        const workerUrl = new URL('../service-worker.js', APP_SCRIPT);
        navigator.serviceWorker.register(workerUrl, { scope: new URL('../', APP_SCRIPT).pathname })
            .catch((error) => console.error('Unable to register the offline app shell.', error));
    }
})();
