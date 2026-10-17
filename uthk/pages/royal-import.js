(function () {
    const MAX_FILE_BYTES = 20 * 1024 * 1024;
    const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
    const MAX_IMPORT_ROWS = 1000;
    const shipmentInput = document.getElementById('shipment-export');
    const statementInput = document.getElementById('statement-export');
    const shipmentImportButton = document.getElementById('import-shipment');
    const statementImportButton = document.getElementById('import-statement');
    const shipmentStatus = document.getElementById('shipment-status');
    const statementStatus = document.getElementById('statement-status');
    let shipmentEntries = null;
    let statementEntries = null;

    function normalizeHeader(value) {
        return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function textValue(value) {
        return value == null ? '' : String(value).trim();
    }

    async function readZip(file) {
        if (file.size > MAX_FILE_BYTES) throw new Error('Excel ဖိုင်သည် 20 MB ထက်ကြီးနေပါသည်။');
        const bytes = new Uint8Array(await file.arrayBuffer());
        const view = new DataView(bytes.buffer);
        const minOffset = Math.max(0, bytes.length - 65557);
        let endOffset = -1;
        for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
            if (view.getUint32(offset, true) === 0x06054b50) {
                endOffset = offset;
                break;
            }
        }
        if (endOffset < 0) throw new Error('XLSX ဖိုင်ပုံစံ မမှန်ပါ။');

        const entryCount = view.getUint16(endOffset + 10, true);
        const centralOffset = view.getUint32(endOffset + 16, true);
        const files = new Map();
        let offset = centralOffset;
        let totalSize = 0;
        for (let index = 0; index < entryCount; index += 1) {
            if (view.getUint32(offset, true) !== 0x02014b50) {
                throw new Error('XLSX ဖိုင်အတွင်း directory မဖတ်နိုင်ပါ။');
            }
            const flags = view.getUint16(offset + 8, true);
            const method = view.getUint16(offset + 10, true);
            const compressedSize = view.getUint32(offset + 20, true);
            const uncompressedSize = view.getUint32(offset + 24, true);
            const nameLength = view.getUint16(offset + 28, true);
            const extraLength = view.getUint16(offset + 30, true);
            const commentLength = view.getUint16(offset + 32, true);
            const localOffset = view.getUint32(offset + 42, true);
            const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
            if (flags & 1) throw new Error('Password ဖြင့်ကာကွယ်ထားသော Excel ဖိုင်ကို မဖတ်နိုင်ပါ။');
            totalSize += uncompressedSize;
            if (totalSize > MAX_UNCOMPRESSED_BYTES) {
                throw new Error('Excel ဖိုင်၏ ဖြည်ပြီးအရွယ်အစားသည် ကန့်သတ်ချက်ထက်ကြီးနေပါသည်။');
            }
            if (name && !name.endsWith('/')) {
                files.set(name, { method, compressedSize, uncompressedSize, localOffset });
            }
            offset += 46 + nameLength + extraLength + commentLength;
        }

        async function readFile(name) {
            const entry = files.get(name);
            if (!entry) return null;
            const localNameLength = view.getUint16(entry.localOffset + 26, true);
            const localExtraLength = view.getUint16(entry.localOffset + 28, true);
            const dataStart = entry.localOffset + 30 + localNameLength + localExtraLength;
            const compressed = bytes.subarray(dataStart, dataStart + entry.compressedSize);
            if (entry.method === 0) return compressed;
            if (entry.method !== 8 || typeof DecompressionStream !== 'function') {
                throw new Error('Энэ XLSX шахалтын хэлбэрийг энэ browser дэмжихгүй байна.');
            }
            const stream = new Blob([compressed]).stream()
                .pipeThrough(new DecompressionStream('deflate-raw'));
            const result = new Uint8Array(await new Response(stream).arrayBuffer());
            if (result.length !== entry.uncompressedSize) {
                throw new Error('XLSX файл бүрэн задлагдсангүй.');
            }
            return result;
        }
        return { files, readFile };
    }

    function parseXml(bytes) {
        const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('Excel XML хэсгийг уншиж чадсангүй။');
        return xml;
    }

    function childElements(element, localName) {
        return Array.from(element.children).filter((child) => child.localName === localName);
    }

    function columnIndex(reference) {
        const letters = /^[A-Z]+/i.exec(reference || '')?.[0];
        if (!letters) return -1;
        return letters.toLocaleUpperCase().split('').reduce((value, letter) =>
            value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
    }

    async function readFirstWorksheet(file) {
        const zip = await readZip(file);
        const workbookBytes = await zip.readFile('xl/workbook.xml');
        const relationsBytes = await zip.readFile('xl/_rels/workbook.xml.rels');
        if (!workbookBytes || !relationsBytes) throw new Error('Excel workbook мэдээлэл дутуу байна။');
        const workbook = parseXml(workbookBytes);
        const relations = parseXml(relationsBytes);
        const firstSheet = workbook.getElementsByTagNameNS('*', 'sheet')[0];
        if (!firstSheet) throw new Error('Excel sheet မတွေ့ပါ။');
        const relationId = firstSheet.getAttributeNS(
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'
        );
        const relation = Array.from(relations.getElementsByTagNameNS('*', 'Relationship'))
            .find((item) => item.getAttribute('Id') === relationId);
        if (!relation) throw new Error('Excel worksheet link မတွေ့ပါ။');
        const target = relation.getAttribute('Target');
        const worksheetPath = target.startsWith('/')
            ? target.slice(1)
            : (target.startsWith('xl/') ? target : `xl/${target}`).split('/').reduce((parts, part) => {
                if (part === '..') parts.pop();
                else if (part !== '.') parts.push(part);
                return parts;
            }, []).join('/');
        const worksheetBytes = await zip.readFile(worksheetPath);
        if (!worksheetBytes) throw new Error('Excel worksheet ကို မဖတ်နိုင်ပါ။');

        const sharedStringsBytes = await zip.readFile('xl/sharedStrings.xml');
        const sharedStrings = sharedStringsBytes
            ? Array.from(parseXml(sharedStringsBytes).getElementsByTagNameNS('*', 'si'))
                .map((item) => Array.from(item.getElementsByTagNameNS('*', 't'))
                    .map((text) => text.textContent || '').join(''))
            : [];
        const worksheet = parseXml(worksheetBytes);
        const sheetData = worksheet.getElementsByTagNameNS('*', 'sheetData')[0];
        if (!sheetData) throw new Error('Excel data rows олдсонгүй.');
        return childElements(sheetData, 'row').map((row) => {
            const values = [];
            childElements(row, 'c').forEach((cell) => {
                const index = columnIndex(cell.getAttribute('r'));
                if (index < 0) return;
                const type = cell.getAttribute('t');
                const valueElement = childElements(cell, 'v')[0];
                let value = valueElement ? valueElement.textContent || '' : '';
                if (type === 's') value = sharedStrings[Number(value)] || '';
                else if (type === 'inlineStr') {
                    value = Array.from(cell.getElementsByTagNameNS('*', 't'))
                        .map((text) => text.textContent || '').join('');
                } else if (type === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
                values[index] = value;
            });
            return values.map(textValue);
        });
    }

    function findHeaderRow(rows, requiredHeaders) {
        const limit = Math.min(rows.length, 20);
        for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
            const headers = rows[rowIndex].map(normalizeHeader);
            if (requiredHeaders.every((header) => headers.includes(header))) {
                return { rowIndex, headers };
            }
        }
        throw new Error('Excel header များသည် Royal export ပုံစံနှင့် မကိုက်ညီပါ။');
    }

    function field(row, headers, name) {
        const index = headers.indexOf(name);
        return index < 0 ? '' : textValue(row[index]);
    }

    function parseShipmentRows(rows) {
        const required = [
            'waybillno', 'receiver', 'weightkg', 'servicechargesmmk',
            'codmmk', 'waybilldate', 'state'
        ];
        const { rowIndex, headers } = findHeaderRow(rows, required);
        const entries = rows.slice(rowIndex + 1).map((row) => ({
            waybillNo: field(row, headers, 'waybillno'),
            receiver: field(row, headers, 'receiver'),
            weight: field(row, headers, 'weightkg'),
            serviceCharge: field(row, headers, 'servicechargesmmk'),
            cod: field(row, headers, 'codmmk'),
            waybillDate: field(row, headers, 'waybilldate'),
            state: field(row, headers, 'state')
        })).filter((entry) => entry.waybillNo);
        if (!entries.length || entries.length > MAX_IMPORT_ROWS) {
            throw new Error(`Waybill ${MAX_IMPORT_ROWS} ခုအထိပါသော data ဖိုင်ကို ရွေးပါ။`);
        }
        return entries;
    }

    function parseStatementRows(rows) {
        const required = ['waybill', 'codcharges', 'paidamount', 'paiddate'];
        const { rowIndex, headers } = findHeaderRow(rows, required);
        const entries = rows.slice(rowIndex + 1).map((row) => ({
            waybillNo: field(row, headers, 'waybill'),
            codCharges: field(row, headers, 'codcharges'),
            paidCharges: field(row, headers, 'paidamount'),
            paidDate: field(row, headers, 'paiddate')
        })).filter((entry) => entry.waybillNo);
        if (!entries.length || entries.length > MAX_IMPORT_ROWS) {
            throw new Error(`Waybill ${MAX_IMPORT_ROWS} ခုအထိပါသော statement ဖိုင်ကို ရွေးပါ။`);
        }
        return entries;
    }

    function setStatus(element, message, isError) {
        element.textContent = message;
        element.classList.toggle('error', Boolean(isError));
    }

    async function prepareFile(input, status, parser, kind) {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
            const rows = await readFirstWorksheet(file);
            const entries = parser(rows);
            const preview = entries.slice(0, 3).map((entry) => entry.waybillNo).join(', ');
            if (kind === 'shipment') {
                shipmentEntries = entries;
                shipmentImportButton.disabled = false;
            } else {
                statementEntries = entries;
                statementImportButton.disabled = false;
            }
            setStatus(status,
                `${file.name} · ${entries.length} rows · ${preview}${entries.length > 3 ? ', …' : ''}`,
                false);
        } catch (error) {
            if (kind === 'shipment') {
                shipmentEntries = null;
                shipmentImportButton.disabled = true;
            } else {
                statementEntries = null;
                statementImportButton.disabled = true;
            }
            setStatus(status, error.message || 'Excel ဖိုင်ဖတ်မရပါ။', true);
        }
    }

    function summarizeResult(result) {
        const updated = result.updatedCount || 0;
        const unmatched = result.unmatchedCount || 0;
        const duplicates = result.duplicateCount || 0;
        const unmatchedWaybills = result.results
            .filter((item) => item.result === 'unmatched' || item.result === 'phone-mismatch')
            .slice(0, 8)
            .map((item) => item.waybillNo);
        const duplicateWaybills = result.results
            .filter((item) => item.result === 'duplicate')
            .slice(0, 8)
            .map((item) => item.waybillNo);
        return [
            `Sheet row ${updated} ခု update လုပ်ပြီး`,
            unmatched ? `မကိုက်ညီ ${unmatched} ခု${unmatchedWaybills.length ? `: ${unmatchedWaybills.join(', ')}` : ''}` : '',
            duplicates ? `Sheet ထဲတွင် duplicate ${duplicates} ခု${duplicateWaybills.length ? `: ${duplicateWaybills.join(', ')}` : ''}` : ''
        ].filter(Boolean).join(' · ');
    }

    async function importFile(kind) {
        const isShipment = kind === 'shipment';
        const entries = isShipment ? shipmentEntries : statementEntries;
        const button = isShipment ? shipmentImportButton : statementImportButton;
        const status = isShipment ? shipmentStatus : statementStatus;
        const importMethod = isShipment
            ? window.AdminApi.importRoyalShipmentExport
            : window.AdminApi.importRoyalStatementExport;
        if (!entries) return;
        if (!window.confirm(`${entries.length} rows ကို Royal Voucher/Waybill အလိုက် Book Orders ထဲ import လုပ်မလား? မကိုက်သော row များကို မရေးပါ။`)) {
            return;
        }
        button.disabled = true;
        setStatus(status, 'Google Sheet သို့ import လုပ်နေသည်…', false);
        try {
            const result = await importMethod(entries);
            await window.AdminApi.refreshOrders();
            setStatus(status, summarizeResult(result), result.unmatchedCount > 0 || result.duplicateCount > 0);
            if (isShipment) shipmentEntries = null;
            else statementEntries = null;
            (isShipment ? shipmentInput : statementInput).value = '';
        } catch (error) {
            setStatus(status, error.message || 'Royal export import မအောင်မြင်ပါ။', true);
            button.disabled = false;
        }
    }

    shipmentInput.addEventListener('change', () =>
        prepareFile(shipmentInput, shipmentStatus, parseShipmentRows, 'shipment'));
    statementInput.addEventListener('change', () =>
        prepareFile(statementInput, statementStatus, parseStatementRows, 'statement'));
    shipmentImportButton.addEventListener('click', () => importFile('shipment'));
    statementImportButton.addEventListener('click', () => importFile('statement'));
})();
