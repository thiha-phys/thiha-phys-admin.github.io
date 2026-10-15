function attachReceiptActions({ receiptId, shareButtonId, statusId }) {
    const receipt = document.getElementById(receiptId);
    const status = document.getElementById(statusId);
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

    shareButton.addEventListener('click', () => runAction(shareButton, async (file) => {
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
            await navigator.share({ files: [file], title: 'ဘောက်ချာပုံ' });
            status.textContent = 'ဘောက်ချာပုံကို မျှဝေပြီးပါပြီ။';
        } else {
            status.textContent = 'ဤ browser တွင် image share မရနိုင်ပါ။ HTTPS အသုံးပြုသော ဖုန်း browser မှ ပြန်စမ်းပါ။';
            status.classList.add('error');
        }
    }));
}