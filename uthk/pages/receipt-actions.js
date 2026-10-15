function attachReceiptActions({ receiptId, saveButtonId, shareButtonId, statusId }) {
    const receipt = document.getElementById(receiptId);
    const status = document.getElementById(statusId);
    const saveButton = document.getElementById(saveButtonId);
    const shareButton = document.getElementById(shareButtonId);

    function getFileName() {
        const voucher = receipt.querySelector('#receipt-voucher')?.textContent || 'voucher';
        const safeVoucher = voucher.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
        return `${safeVoucher || 'voucher'}.png`;
    }

    async function createImageFile() {
        if (typeof html2canvas !== 'function') {
            throw new Error('ဘောက်ချာပုံထုတ်ရန် Internet လိုအပ်ပါသည်။');
        }
        const canvas = await html2canvas(receipt, {
            backgroundColor: '#ffffff',
            scale: Math.min(window.devicePixelRatio || 1, 2),
            useCORS: true,
            ignoreElements: (element) => element.classList?.contains('no-print')
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('ဘောက်ချာပုံကို ဖန်တီးမရပါ။');
        return new File([blob], getFileName(), { type: 'image/png' });
    }

    function downloadImage(file) {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function runAction(button, action) {
        button.disabled = true;
        status.className = 'status-message no-print';
        status.textContent = 'ဘောက်ချာပုံ ဖန်တီးနေသည်…';
        try {
            const file = await createImageFile();
            await action(file);
        } catch (error) {
            if (error.name === 'AbortError') {
                status.textContent = 'မျှဝေမှုကို ပယ်ဖျက်လိုက်ပါသည်။';
            } else {
                console.error('Unable to create or share the voucher image.', error);
                status.textContent = error.message || 'ဘောက်ချာပုံကို ဖန်တီးမရပါ။';
                status.classList.add('error');
            }
        } finally {
            button.disabled = false;
        }
    }

    saveButton.addEventListener('click', () => runAction(saveButton, async (file) => {
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
            await navigator.share({ files: [file], title: 'ဘောက်ချာပုံ' });
            status.textContent = 'Photos / Gallery ထဲသိမ်းရန် ဖုန်း၏ Share menu မှ ရွေးပါ။';
        } else {
            downloadImage(file);
            status.textContent = 'ဘောက်ချာ PNG ကို Download လုပ်ပြီးပါပြီ။ ဖုန်း၏ Downloads မှ Gallery ထဲသိမ်းနိုင်ပါသည်။';
        }
    }));

    shareButton.addEventListener('click', () => runAction(shareButton, async (file) => {
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
            await navigator.share({ files: [file], title: 'ဘောက်ချာပုံ' });
            status.textContent = 'ဘောက်ချာပုံကို မျှဝေပြီးပါပြီ။';
        } else {
            downloadImage(file);
            status.textContent = 'ဤ browser တွင် image share မရနိုင်ပါ။ PNG ကို Download လုပ်ထားပါသည်။';
        }
    }));
}