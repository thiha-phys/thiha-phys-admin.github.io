const toggleButton = document.getElementById('toggle-sync');
const statusElement = document.getElementById('status');
let syncEnabled = true;

function renderState(state) {
    syncEnabled = state.syncEnabled !== false;
    toggleButton.textContent = syncEnabled ? 'Pause sync' : 'Resume sync';
    const details = state.syncState || {};
    if (state.error) {
        statusElement.textContent = state.error;
        statusElement.classList.add('error');
        return;
    }
    const lastSync = details.lastSyncAt
        ? new Date(details.lastSyncAt).toLocaleString()
        : '';
    statusElement.textContent = [
        syncEnabled ? 'Sync ဖွင့်ထားသည်။' : 'Sync ရပ်နားထားသည်။',
        details.message || 'Royal Shipments စာမျက်နှာကို ဖွင့်ပါ။',
        lastSync ? `နောက်ဆုံးစစ်ချိန်: ${lastSync}` : ''
    ].filter(Boolean).join(' ');
    statusElement.classList.toggle('error', Boolean(details.error || state.error));
}

function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_SYNC_STATE' }).then((state) => {
        renderState(state || {});
    }).catch((error) => {
        statusElement.textContent = error.message || 'Sync အခြေအနေ ဖတ်မရပါ။';
        statusElement.classList.add('error');
    });
}

toggleButton.addEventListener('click', () => {
    toggleButton.disabled = true;
    chrome.runtime.sendMessage({
        type: 'SET_SYNC_ENABLED',
        enabled: !syncEnabled
    }).then((state) => {
        if (state.error) throw new Error(state.error);
        syncEnabled = state.syncEnabled;
        loadState();
    }).catch((error) => {
        statusElement.textContent = error.message || 'Sync setting မပြောင်းနိုင်ပါ။';
        statusElement.classList.add('error');
    }).finally(() => {
        toggleButton.disabled = false;
    });
});

loadState();
