(function () {
    const API_URL = 'https://script.google.com/macros/s/AKfycbxWcDQ_ue9hZPawB-svH9bkusQelPCdXyjXilzLgklfSxXFd74fOi3ydCoCpg0ZuEXg/exec';
    const DB_NAME = 'uthk-admin-cache';
    const DB_VERSION = 1;
    const CACHE_STORE = 'snapshots';
    const APP_SCRIPT = document.currentScript.src;

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

    async function refreshOrders() {
        const result = await request('listOrders');
        const snapshot = { data: result.orders, updatedAt: new Date().toISOString() };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    async function getCachedOrders() {
        return readCache('orders');
    }

    async function saveOrders(orders) {
        const snapshot = { data: orders, updatedAt: new Date().toISOString() };
        await writeCache('orders', snapshot);
        return snapshot;
    }

    function createSheetOrder(order, resultOrder) {
        const row = {
            'Voucher No': resultOrder.voucherNo,
            Name: resultOrder.name,
            Address: resultOrder.address,
            Phone: resultOrder.phone,
            'Order Date': resultOrder.orderDate,
            'Total': String(resultOrder.total),
            'Payment Method': resultOrder.paymentMethod,
            'Amount Received': '0',
            'Delivered Date': ''
        };
        const quantityFields = [
            'Special Qty', 'Practice Qty', 'Old Questions Qty', 'Solution Qty',
            'Grade 11 Handbook Qty', 'Grade 11 Objective Qty', 'Grade 10 Handbook Qty'
        ];
        const amountFields = [
            'Special Amount', 'Practice Amount', 'Old Questions Amount', 'Solution Amount',
            'Grade 11 Handbook Amount', 'Grade 11 Objective Amount', 'Grade 10 Handbook Amount'
        ];
        const itemById = new Map(order.items.map((item) => [item.id, item.quantity]));
        AdminBooks.forEach((book, index) => {
            const quantity = itemById.get(book.id) || 0;
            row[quantityFields[index]] = String(quantity);
            row[amountFields[index]] = String(quantity * book.price);
        });
        return row;
    }

    async function createOrder(order) {
        const result = await request('createOrder', { order });
        try {
            const cached = await getCachedOrders();
            if (!cached) {
                result.cacheNeedsRefresh = true;
            } else {
                const orders = cached.data.slice();
                orders.unshift(createSheetOrder(order, result.order));
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
        getCachedOrders,
        refreshOrders,
        createOrder,
        updateOrder,
        getCachedStock,
        refreshStock,
        addStock
    };
    window.AdminBooks = [
        { id: 'special', name: 'သင်ရိုးကုန် အထူးထုတ်', price: 20000 },
        { id: 'practice', name: 'Practice Book', price: 13000 },
        { id: 'old-questions', name: 'မေးခွန်းဟောင်းစာအုပ်', price: 11000 },
        { id: 'solution', name: 'တွက်စာသီးသန့်စာအုပ်', price: 5000 },
        { id: 'g11-handbook', name: 'Grade 11 စာသင်ခန်းသုံး စာအုပ်', price: 10000 },
        { id: 'g11-objective', name: 'Grade 11 တစ်မှတ်တန် သီးသန့်စာအုပ်', price: 8000 },
        { id: 'g10-handbook', name: 'Grade 10 စာသင်ခန်းသုံး စာအုပ်', price: 10000 }
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
