const SHEET_NAME = 'Profiles';
const HEADERS = ['Name', 'Job', 'Email', 'Phone'];
const ORDERS_SHEET_NAME = 'Book Orders';
const ORDER_HEADERS = [
  'Voucher No', 'Name', 'Address', 'Phone', 'Order Date',
  'Special Qty', 'Special Amount',
  'Practice Qty', 'Practice Amount',
  'Old Questions Qty', 'Old Questions Amount',
  'Solution Qty', 'Solution Amount',
  'Grade 11 Handbook Qty', 'Grade 11 Handbook Amount',
  'Grade 11 Objective Qty', 'Grade 11 Objective Amount',
  'Grade 10 Handbook Qty', 'Grade 10 Handbook Amount',
  'Total', 'Payment Method', 'Amount Received', 'KPay Account', 'Pay Date',
  'Royal VOC No', 'Delivered Date', 'Delivery', 'Facebook Account Name'
];
const LEGACY_ORDER_HEADERS = [
  'Voucher No', 'Name', 'Address', 'Phone', 'Order Date',
  'Special Qty', 'Special Amount',
  'Practice Qty', 'Practice Amount',
  'Old Questions Qty', 'Old Questions Amount',
  'Solution Qty', 'Solution Amount',
  'Grade 11 Handbook Qty', 'Grade 11 Handbook Amount',
  'Grade 11 Objective Qty', 'Grade 11 Objective Amount',
  'Grade 10 Handbook Qty', 'Grade 10 Handbook Amount',
  'Total', 'Payment Method', 'Amount Received', 'KPay Account', 'Pay Date',
  'Royal VOC No', 'Order Confirm', 'Delivery'
];
const BOOK_ORDER_ITEMS = [
  { id: 'special', name: 'သင်ရိုးကုန် အထူးထုတ်', quantityColumn: 5, price: 20000 },
  { id: 'practice', name: 'Practice Book', quantityColumn: 7, price: 13000 },
  { id: 'old-questions', name: 'မေးခွန်းဟောင်းစာအုပ်', quantityColumn: 9, price: 11000 },
  { id: 'solution', name: 'တွက်စာသီးသန့်စာအုပ်', quantityColumn: 11, price: 5000 },
  { id: 'g11-handbook', name: 'Grade 11 စာသင်ခန်းသုံး စာအုပ်', quantityColumn: 13, price: 10000 },
  { id: 'g11-objective', name: 'Grade 11 တစ်မှတ်တန် သီးသန့်စာအုပ်', quantityColumn: 15, price: 8000 },
  { id: 'g10-handbook', name: 'Grade 10 စာသင်ခန်းသုံး စာအုပ်', quantityColumn: 17, price: 10000 }
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('A JSON request body is required.');
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    if (action === 'createOrder') {
      return createBookOrder_(request.order);
    }
    if (action === 'listOrders') {
      return jsonResponse_({ ok: true, orders: listBookOrders_() });
    }
    if (action === 'updateOrder') {
      return updateBookOrder_(request.order);
    }
    if (action === 'getBookStock') {
      return jsonResponse_({ ok: true, stock: getBookStock_() });
    }
    if (action === 'addBookStock') {
      return addBookStock_(request.stock);
    }

    const profile = request.profile;

    if (action !== 'create' && action !== 'update' && action !== 'lookup') {
      throw new Error('Action must be "create", "update", or "lookup".');
    }
    if (!profile || typeof profile !== 'object') {
      throw new Error('Profile data is required.');
    }

    if (action === 'lookup') {
      const phone = normalizePhone_(profile.phone);
      if (!phone) throw new Error('Phone is required.');

      const sheet = getProfilesSheet_();
      const phoneRows = findPhoneRows_(sheet, phone);
      if (phoneRows.length === 0) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_NOT_FOUND',
          message: 'No profile was found for this phone number.'
        });
      }
      if (phoneRows.length > 1) {
        throw new Error('More than one row has this phone number; lookup was stopped.');
      }

      const values = sheet.getRange(phoneRows[0], 1, 1, HEADERS.length).getDisplayValues()[0];
      return jsonResponse_({
        ok: true,
        action: 'found',
        profile: {
          name: values[0],
          job: values[1],
          email: values[2],
          phone: formatPhone_(normalizePhone_(values[3]))
        }
      });
    }

    const normalizedProfile = normalizeProfile_(profile);
    const lookupPhone = action === 'update' && profile.lookupPhone
      ? normalizePhone_(profile.lookupPhone)
      : normalizedProfile.phone;

    if (action === 'update' && !lookupPhone) {
      throw new Error('A lookup phone is required for profile updates.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const sheet = getProfilesSheet_();
      const phoneRows = findPhoneRows_(sheet, lookupPhone);

      if (action === 'create') {
        if (phoneRows.length > 0) {
          return jsonResponse_({
            ok: false,
            error: 'PHONE_EXISTS',
            message: 'A profile with this phone number already exists.'
          });
        }

        appendProfile_(sheet, normalizedProfile);
        return jsonResponse_({ ok: true, action: 'created', profile: normalizedProfile });
      }

      if (phoneRows.length === 0) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_NOT_FOUND',
          message: 'No profile was found for this phone number.'
        });
      }
      if (phoneRows.length > 1) {
        throw new Error('More than one row has the lookup phone number; update was stopped.');
      }

      const newPhoneRows = findPhoneRows_(sheet, normalizedProfile.phone);
      if (normalizePhone_(normalizedProfile.phone) !== lookupPhone &&
          newPhoneRows.some((row) => row !== phoneRows[0])) {
        return jsonResponse_({
          ok: false,
          error: 'PHONE_EXISTS',
          message: 'Another profile already uses the new phone number.'
        });
      }

      writeProfile_(sheet, phoneRows[0], normalizedProfile);
      return jsonResponse_({ ok: true, action: 'updated', profile: normalizedProfile });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function listBookOrders_() {
  const sheet = getOrdersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, ORDER_HEADERS.length).getDisplayValues()
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) {
      const order = {};
      ORDER_HEADERS.forEach(function (header, index) { order[header] = row[index]; });
      return order;
    });
}

function updateBookOrder_(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Order data is required.');
  }
  const voucherNo = requiredText_(order.voucherNo, 'Voucher No');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('No orders were found.');
    const voucherRows = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
      .reduce(function (rows, values, index) {
        if (String(values[0]).trim() === voucherNo) rows.push(index + 2);
        return rows;
      }, []);
    if (voucherRows.length === 0) throw new Error('No order was found for this voucher number.');
    if (voucherRows.length > 1) throw new Error('Duplicate voucher numbers were found; update was stopped.');

    const rowNumber = voucherRows[0];
    const range = sheet.getRange(rowNumber, 1, 1, ORDER_HEADERS.length);
    const values = range.getDisplayValues()[0];
    ORDER_HEADERS.forEach(function (header, index) {
      if (index === 0 || !Object.prototype.hasOwnProperty.call(order, header)) return;
      const value = order[header] == null ? '' : String(order[header]);
      values[index] = sheetSafeText_(value);
    });
    range.setNumberFormat('@');
    range.setValues([values]);
    const updated = {};
    ORDER_HEADERS.forEach(function (header, index) { updated[header] = values[index]; });
    return jsonResponse_({ ok: true, order: updated });
  } finally {
    lock.releaseLock();
  }
}

function getBookStock_() {
  const stockSheet = getBookStockSheet_();
  const stockLastRow = stockSheet.getLastRow();
  const orders = listBookOrders_();
  return BOOK_ORDER_ITEMS.map(function (book, bookIndex) {
    const column = bookIndex * 2 + 1;
    const incoming = [];
    if (stockLastRow >= 3) {
      const values = stockSheet.getRange(3, column, stockLastRow - 2, 2).getDisplayValues();
      values.forEach(function (row) {
        const quantity = Number(row[1]);
        if (row[0] && Number.isSafeInteger(quantity) && quantity > 0) {
          incoming.push({ date: row[0], quantity: quantity });
        }
      });
    }
    const received = incoming.reduce(function (sum, entry) { return sum + entry.quantity; }, 0);
    const delivered = orders.reduce(function (sum, order) {
      if (!order['Delivered Date']) return sum;
      return sum + Number(order[ORDER_HEADERS[book.quantityColumn]] || 0);
    }, 0);
    return {
      id: book.id,
      name: book.name,
      received: received,
      delivered: delivered,
      remaining: received - delivered,
      entries: incoming
    };
  });
}

function addBookStock_(stock) {
  if (!stock || typeof stock !== 'object') {
    throw new Error('Stock entry is required.');
  }
  const bookIndex = BOOK_ORDER_ITEMS.findIndex(function (book) { return book.id === stock.bookId; });
  const quantity = Number(stock.quantity);
  const date = requiredText_(stock.date, 'Stock date');
  if (bookIndex < 0) throw new Error('Book type is invalid.');
  const parsedDate = new Date(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error('Stock date must be a valid date in YYYY-MM-DD format.');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Stock quantity must be a positive whole number.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getBookStockSheet_();
    const column = bookIndex * 2 + 1;
    const lastRow = Math.max(sheet.getLastRow(), 2);
    const dates = lastRow > 2
      ? sheet.getRange(3, column, lastRow - 2, 1).getDisplayValues()
      : [];
    const entryRow = dates.reduce(function (last, values, index) {
      return values[0] ? index + 3 : last;
    }, 2) + 1;
    const range = sheet.getRange(entryRow, column, 1, 2);
    range.setNumberFormat('@');
    range.setValues([[date, String(quantity)]]);
    return jsonResponse_({
      ok: true,
      entry: { bookId: stock.bookId, date: date, quantity: quantity },
      stock: getBookStock_()
    });
  } finally {
    lock.releaseLock();
  }
}

function getBookStockSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }
  let sheet = spreadsheet.getSheetByName('Book Stock');
  if (!sheet) sheet = spreadsheet.insertSheet('Book Stock');

  const requiredColumns = BOOK_ORDER_ITEMS.length * 2;
  if (sheet.getLastRow() === 0) {
    const headers = new Array(requiredColumns);
    BOOK_ORDER_ITEMS.forEach(function (book, index) {
      headers[index * 2] = book.name;
      headers[index * 2 + 1] = '';
    });
    sheet.getRange(1, 1, 1, requiredColumns).setValues([headers]);
    const subheaders = new Array(requiredColumns).fill('');
    BOOK_ORDER_ITEMS.forEach(function (_book, index) {
      subheaders[index * 2] = 'Stock Date';
      subheaders[index * 2 + 1] = 'Quantity';
    });
    sheet.getRange(2, 1, 1, requiredColumns).setValues([subheaders]);
    sheet.setFrozenRows(2);
  } else {
    const actual = sheet.getRange(1, 1, 2, requiredColumns).getDisplayValues();
    const isValid = BOOK_ORDER_ITEMS.every(function (book, index) {
      return actual[0][index * 2] === book.name &&
        actual[1][index * 2] === 'Stock Date' &&
        actual[1][index * 2 + 1] === 'Quantity';
    });
    if (!isValid) {
      throw new Error('The Book Stock sheet must contain the expected seven book tables.');
    }
  }
  return sheet;
}

function createBookOrder_(order) {
  if (!order || typeof order !== 'object') {
    throw new Error('Order data is required.');
  }

  const name = requiredText_(order.name, 'Name');
  const address = requiredText_(order.address, 'Address');
  const phone = normalizePhone_(order.phone);
  if (!phone) throw new Error('Phone is required.');
  const paymentMethod = order.paymentMethod == null ? '' : String(order.paymentMethod).trim();
  if (!Array.isArray(order.items)) {
    throw new Error('A list of book quantities is required.');
  }

  const quantities = {};
  order.items.forEach(function (item) {
    if (!item || typeof item.id !== 'string' || quantities[item.id] !== undefined) {
      throw new Error('Book item is invalid or repeated.');
    }
    const book = BOOK_ORDER_ITEMS.find(function (candidate) {
      return candidate.id === item.id;
    });
    const quantity = Number(item.quantity);
    if (!book || !Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error('Book quantity is invalid.');
    }
    quantities[item.id] = quantity;
  });
  if (BOOK_ORDER_ITEMS.some(function (book) { return quantities[book.id] === undefined; })) {
    throw new Error('All book quantities must be provided.');
  }

  let total = 0;
  const row = new Array(ORDER_HEADERS.length).fill('');
  row[1] = sheetSafeText_(name);
  row[2] = sheetSafeText_(address);
  row[3] = formatPhone_(phone);
  row[4] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  row[27] = sheetSafeText_(order.facebookAccountName == null ? '' : order.facebookAccountName);
  BOOK_ORDER_ITEMS.forEach(function (book) {
    const quantity = quantities[book.id];
    const amount = quantity * book.price;
    row[book.quantityColumn] = String(quantity);
    row[book.quantityColumn + 1] = String(amount);
    total += amount;
  });
  if (total <= 0) {
    throw new Error('At least one book must be ordered.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_();
    const voucherNo = nextVoucherNo_(sheet);
    row[0] = voucherNo;
    row[19] = String(total);
    row[20] = sheetSafeText_(paymentMethod);
    const nextRow = sheet.getLastRow() + 1;
    const range = sheet.getRange(nextRow, 1, 1, ORDER_HEADERS.length);
    range.setNumberFormat('@');
    range.setValues([row]);
    const items = BOOK_ORDER_ITEMS.map(function (book) {
      return {
        id: book.id,
        name: book.name,
        quantity: quantities[book.id],
        amount: quantities[book.id] * book.price
      };
    });
    return jsonResponse_({
      ok: true,
      order: {
        voucherNo: voucherNo,
        name: name,
        address: address,
        phone: formatPhone_(phone),
        orderDate: row[4],
        paymentMethod: paymentMethod,
        total: total,
        items: items
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }
  let sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(ORDERS_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const legacyHeaders = sheet.getRange(1, 1, 1, LEGACY_ORDER_HEADERS.length).getDisplayValues()[0];
    const isLegacySchema = LEGACY_ORDER_HEADERS.every(function (header, index) {
      return legacyHeaders[index] === header;
    });
    if (isLegacySchema) {
      sheet.getRange(1, 26).setValue('Delivered Date');
      sheet.insertColumnAfter(27);
      sheet.getRange(1, 28).setValue('Facebook Account Name');
    }
    if (sheet.getMaxColumns() < ORDER_HEADERS.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), ORDER_HEADERS.length - sheet.getMaxColumns());
    }
    const actualHeaders = sheet.getRange(1, 1, 1, ORDER_HEADERS.length).getDisplayValues()[0];
    if (ORDER_HEADERS.some(function (header, index) { return actualHeaders[index] !== header; })) {
      throw new Error('The first row of the Book Orders sheet does not match the expected order columns.');
    }
  }
  return sheet;
}

function nextVoucherNo_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return '001';
  }
  const currentMaximum = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues()
    .reduce(function (maximum, row) {
      const number = Number(row[0]);
      return Number.isInteger(number) && number > maximum ? number : maximum;
    }, 0);
  return String(currentMaximum + 1).padStart(3, '0');
}

function sheetSafeText_(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function normalizeProfile_(profile) {
  const name = requiredText_(profile.name, 'Name');
  const job = profile.job == null && profile.occupation == null
    ? ''
    : String(profile.job || profile.occupation).trim();
  const email = profile.email == null ? '' : String(profile.email).trim();
  const phone = normalizePhone_(profile.phone);

  if (!phone) throw new Error('Phone is required.');

  return {
    name: name,
    job: job,
    email: email,
    phone: formatPhone_(phone)
  };
}

function requiredText_(value, fieldName) {
  const text = value == null ? '' : String(value).trim();
  if (!text) {
    throw new Error(fieldName + ' is required.');
  }
  return text;
}

function normalizePhone_(value) {
  const phone = value == null ? '' : String(value);
  return phone
    .replace(/[၀-၉]/g, function (digit) {
      return String(digit.charCodeAt(0) - '၀'.charCodeAt(0));
    })
    .replace(/\D/g, '');
}

function formatPhone_(digits) {
  if (!digits || digits.length !== 11 || digits[0] !== '0') return digits;
  return digits.slice(0, 2) + ' ' + digits.slice(2, 5) + ' ' +
    digits.slice(5, 8) + ' ' + digits.slice(8, 11);
}

function getProfilesSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Bind this Apps Script project to the target Google Sheet.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    const actualHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
    if (HEADERS.some((header, index) => actualHeaders[index] !== header)) {
      throw new Error('The first row of the Profiles sheet must be: ' + HEADERS.join(', '));
    }
  }

  return sheet;
}

function findPhoneRows_(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  return sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues()
    .reduce(function (rows, values, index) {
      if (normalizePhone_(values[0]) === phone) {
        rows.push(index + 2);
      }
      return rows;
    }, []);
}

function appendProfile_(sheet, profile) {
  const row = sheet.getLastRow() + 1;
  writeProfile_(sheet, row, profile);
}

function writeProfile_(sheet, row, profile) {
  const range = sheet.getRange(row, 1, 1, HEADERS.length);
  range.setNumberFormat('@');
  range.setValues([[profile.name, profile.job, profile.email, profile.phone]]);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
