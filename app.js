(() => {
  const $ = id => document.getElementById(id);
  const databaseUrl = window.ORDER_APP_CONFIG.databaseUrl.replace(/\/+$/, "");
  const isAdmin = document.body.dataset.page === "admin";
  const money = amount => `${Math.round(Number(amount) || 0).toLocaleString("en-US")} ကျပ်`;
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  let books = [];
  let cities = [];
  let selectedCity = null;

  function tier(quantity) {
    if (quantity >= 50) return 3;
    if (quantity >= 30) return 2;
    if (quantity >= 10) return 1;
    return 0;
  }

  function calculateDeliveryFee(city, weight) {
    const extraKg = Math.max(0, Math.ceil(Math.max(0, weight - 2) - 1e-9));
    return city.upTo2Kg + extraKg * city.nextKg;
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${databaseUrl}/${path}.json`, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
      });
    } catch {
      throw new Error("Firebase ကို ဆက်သွယ်မရပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပါ။");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const reason = typeof result === "string" ? result : result?.error;
      throw new Error(reason || `Firebase တောင်းဆိုမှု မအောင်မြင်ပါ (${response.status})`);
    }
    return result;
  }

  function formMarkup() {
    return `
      <form id="orderForm">
        <section>
          <div class="section-heading">
            <div><h2>စာအုပ်ရွေးချယ်ရန်</h2><p class="muted">စာအုပ်တစ်မျိုးချင်းရဲ့ အရေအတွက်အလိုက် ဈေးနှုန်းအဆင့် ပြောင်းပါမယ်။</p></div>
          </div>
          <div id="bookList" class="book-grid"></div>
        </section>
        <section class="panel customer-details">
          <h2>ဝယ်သူအချက်အလက်</h2>
          <div class="two-columns">
            <label class="field">အမည် *
              <input id="customerName" maxlength="120" autocomplete="name" required>
            </label>
            <label class="field">ဖုန်းနံပါတ် *
              <input id="phone" type="tel" inputmode="tel" maxlength="30" autocomplete="tel" required>
            </label>
          </div>
          <label class="field">လိပ်စာ *
            <textarea id="address" maxlength="600" autocomplete="street-address" required></textarea>
          </label>
          <div class="field city-wrap">
            <label for="cityInput">ပို့ဆောင်မည့်မြို့ *</label>
            <input id="cityInput" autocomplete="off" placeholder="နှိပ်ပြီး မြို့အမည်၊ ရ သို့မဟုတ် y ဖြင့်ရှာပါ" aria-controls="cityOptions" aria-expanded="false" required>
            <div id="cityOptions" class="city-options" role="listbox"></div>
            <span id="cityMessage" class="muted">စာရင်းထဲတွင် မြို့များမရှိသေးပါ။ cities.json တွင် မြို့နှင့် ပို့ခထည့်ပါ။</span>
          </div>
          <label class="field">မှတ်ချက်
            <textarea id="note" maxlength="500"></textarea>
          </label>
        </section>
        <section class="summary panel">
          <div class="summary-row"><span>စုစုပေါင်းအုပ်ရေ</span><strong id="totalBooks">0 အုပ်</strong></div>
          <div class="summary-row"><span>စုစုပေါင်းအလေးချိန်</span><strong id="totalWeight">0.00 kg</strong></div>
          <div class="summary-row"><span>စာအုပ်ဖိုး</span><strong id="bookTotal">${money(0)}</strong></div>
          <div class="summary-row"><span>ပို့ခ</span><strong id="deliveryFee">မြို့ရွေးပါ</strong></div>
          <div class="summary-row total"><span>စုစုပေါင်း</span><strong id="grandTotal">${money(0)}</strong></div>
          <p id="priceHint" class="muted">Үнэ: ၁–၉ / ၁၀–၂၉ / ၃၀–၄၉ / ၅၀ နှင့်အထက် အုပ်။</p>
          <button id="submitOrder" class="button primary" type="submit">အော်ဒါတင်မည်</button>
          <div id="formStatus" class="status" role="status" aria-live="polite"></div>
        </section>
      </form>`;
  }

  function readQuantities() {
    return books.flatMap(book => {
      const quantity = Number($(`quantity-${book.id}`).value);
      if (!Number.isInteger(quantity) || quantity <= 0) return [];
      const unitPrice = book.prices[tier(quantity)];
      return [{ id: book.id, name: book.name, quantity, unitPrice, subtotal: unitPrice * quantity, weight: book.weight }];
    });
  }

  function renderBooks() {
    $("bookList").innerHTML = books.map(book => `
      <article class="book-card">
        <div class="book-number">${books.indexOf(book) + 1}</div>
        <h3>${escapeHTML(book.name)}</h3>
        <p class="muted">တစ်အုပ်အလေးချိန် ${book.weight} kg</p>
        <div class="book-price" id="unit-${book.id}">${money(book.prices[0])} <small>/ အုပ်</small></div>
        <div class="price-tier" id="tier-${book.id}">၁–၉ အုပ်</div>
        <label class="field quantity-field" for="quantity-${book.id}">အရေအတွက်
          <input id="quantity-${book.id}" type="number" min="0" max="1000" step="1" value="0" inputmode="numeric">
        </label>
        <div class="item-subtotal"><span>စာအုပ်ဖိုး</span><strong id="subtotal-${book.id}">${money(0)}</strong></div>
      </article>`).join("");
    books.forEach(book => $(`quantity-${book.id}`).addEventListener("input", updateSummary));
    updateSummary();
  }

  function updateSummary() {
    const items = readQuantities();
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const weight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const bookTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const fee = selectedCity ? calculateDeliveryFee(selectedCity, weight) : null;

    for (const book of books) {
      const quantity = Number($(`quantity-${book.id}`).value) || 0;
      const index = tier(quantity);
      const labels = ["၁–၉ အုပ်", "၁၀–၂၉ အုပ်", "၃၀–၄၉ အုပ်", "၅၀+ အုပ်"];
      $(`unit-${book.id}`).innerHTML = `${money(book.prices[index])} <small>/ အုပ်</small>`;
      $(`tier-${book.id}`).textContent = labels[index];
      $(`subtotal-${book.id}`).textContent = money(quantity * book.prices[index]);
    }

    $("totalBooks").textContent = `${count} အုပ်`;
    $("totalWeight").textContent = `${weight.toFixed(2)} kg`;
    $("bookTotal").textContent = money(bookTotal);
    $("deliveryFee").textContent = fee === null ? "မြို့ရွေးပါ" : money(fee);
    $("grandTotal").textContent = fee === null ? "မြို့ရွေးပါ" : money(bookTotal + fee);
  }

  function renderCities(query) {
    const needle = query.trim().toLocaleLowerCase();
    const matches = cities.filter(city =>
      !needle ||
      city.my.toLocaleLowerCase().includes(needle) ||
      city.en.toLocaleLowerCase().includes(needle)
    );
    $("cityOptions").innerHTML = matches.length
      ? matches.map((city, index) => `
          <button class="city-option" type="button" role="option" data-city="${index}">
            <span>${escapeHTML(city.my)} (${escapeHTML(city.en)})</span>
            <strong>${money(city.upTo2Kg)} / ၂ kg</strong>
          </button>`).join("")
      : '<div class="empty">ကိုက်ညီသောမြို့ မတွေ့ပါ။</div>';
    $("cityOptions").classList.add("open");
    $("cityInput").setAttribute("aria-expanded", "true");
    $("cityOptions").querySelectorAll("[data-city]").forEach((button, index) => {
      button.addEventListener("click", () => {
        selectedCity = matches[index];
        $("cityInput").value = `${selectedCity.my} (${selectedCity.en})`;
        $("cityOptions").classList.remove("open");
        $("cityInput").setAttribute("aria-expanded", "false");
        $("cityMessage").textContent = `၂ kg အထိ ${money(selectedCity.upTo2Kg)}၊ ထပ်တိုး kg တစ်ခုလျှင် ${money(selectedCity.nextKg)}`;
        updateSummary();
      });
    });
  }

  async function sendOrder(event) {
    event.preventDefault();
    setFormStatus("");
    const items = readQuantities();
    if (!items.length) {
      setFormStatus("စာအုပ် အနည်းဆုံးတစ်အုပ် ရွေးပါ။", true);
      return;
    }
    if (!selectedCity) {
      setFormStatus("မြို့စာရင်းမှ ပို့ဆောင်မည့်မြို့ကို ရွေးပါ။", true);
      $("cityInput").focus();
      return;
    }

    const button = $("submitOrder");
    button.disabled = true;
    setFormStatus("Firebase သို့ အော်ဒါသိမ်းနေပါသည်…");
    const bookTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const deliveryFee = calculateDeliveryFee(selectedCity, totalWeight);
    const order = {
      customerName: $("customerName").value.trim(),
      phone: $("phone").value.trim(),
      address: $("address").value.trim(),
      note: $("note").value.trim(),
      city: selectedCity,
      items,
      bookCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalWeight: Number(totalWeight.toFixed(3)),
      bookTotal,
      deliveryFee,
      grandTotal: bookTotal + deliveryFee,
      createdAt: Date.now()
    };
    try {
      const saved = await request("bookOrders", { method: "POST", body: JSON.stringify(order) });
      $("orderForm").reset();
      books.forEach(book => { $(`quantity-${book.id}`).value = "0"; });
      selectedCity = null;
      $("cityMessage").textContent = "စာရင်းထဲမှ မြို့ကိုရွေးပါ။";
      updateSummary();
      setFormStatus(`အော်ဒါတင်ပြီးပါပြီ။ အော်ဒါအမှတ်: ${saved.name}`, false, true);
    } catch (error) {
      setFormStatus(error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  function setFormStatus(message, error = false, success = false) {
    const status = $("formStatus");
    status.textContent = message;
    status.className = `status${error ? " error" : ""}${success ? " success" : ""}`;
  }

  async function initOrderForm() {
    $("orderApp").innerHTML = formMarkup();
    if (isAdmin) $("submitOrder").textContent = "Admin မှ အော်ဒါတင်မည်";
    try {
      const [bookResponse, cityResponse] = await Promise.all([
        fetch("./books.json"),
        fetch("./cities.json")
      ]);
      if (!bookResponse.ok || !cityResponse.ok) throw new Error("books.json / cities.json ဖတ်မရပါ။");
      [books, cities] = await Promise.all([bookResponse.json(), cityResponse.json()]);
      renderBooks();
      $("cityInput").addEventListener("focus", () => renderCities($("cityInput").value));
      $("cityInput").addEventListener("click", () => renderCities($("cityInput").value));
      $("cityInput").addEventListener("input", () => {
        selectedCity = null;
        $("cityMessage").textContent = "";
        renderCities($("cityInput").value);
        updateSummary();
      });
      $("cityInput").addEventListener("keydown", event => {
        if (event.key === "Escape") $("cityOptions").classList.remove("open");
      });
      document.addEventListener("click", event => {
        if (!event.target.closest(".city-wrap")) $("cityOptions").classList.remove("open");
      });
      $("orderForm").addEventListener("submit", sendOrder);
      $("cityMessage").textContent = cities.length
        ? "စာရိုက်မထားပါက မြို့အားလုံးကို ပြပါမည်။ ရ / y ဖြင့်လည်း ရှာနိုင်ပါသည်။"
        : "မြို့နှင့် ပို့ခစာရင်း မထည့်ရသေးပါ။ cities.json ထဲသို့ထည့်ပြီးမှ အော်ဒါတင်နိုင်ပါမည်။";
    } catch (error) {
      $("bookList").innerHTML = `<div class="panel">${escapeHTML(error.message)}</div>`;
      setFormStatus(error.message, true);
    }
  }

  function renderOrders(data) {
    const entries = Object.entries(data || {})
      .map(([key, order]) => ({ ...order, id: order.id || key }))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    $("orderCount").textContent = `${entries.length} orders`;
    if (!entries.length) {
      $("orders").innerHTML = '<div class="panel empty">အော်ဒါမရှိသေးပါ။</div>';
      return;
    }
    $("orders").innerHTML = entries.map(order => `
      <article class="order-card">
        <div class="order-top">
          <div><h3>${escapeHTML(order.customerName || "အမည်မရှိ")}</h3><span class="muted">${escapeHTML(Number(order.createdAt) > 0 ? new Date(Number(order.createdAt)).toLocaleString() : "ရက်စွဲ မရှိ")}</span></div>
          <span class="order-badge">အသစ်</span>
        </div>
        ${(() => {
          const items = Array.isArray(order.items) ? order.items : [];
          const bookTotal = Number(order.bookTotal) || items.reduce((sum, item) => sum + (Number(item.subtotal) || Number(item.unitPrice) * Number(item.quantity)), 0);
          const deliveryFee = Number(order.deliveryFee) || 0;
          const bookCount = Number(order.bookCount) || items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const totalWeight = Number(order.totalWeight) || items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 0), 0);
          const grandTotal = Number(order.grandTotal) || bookTotal + deliveryFee;
          return `
        <div class="two-columns order-details">
          <div><span class="detail-label">ဖုန်း</span><strong>${escapeHTML(order.phone || "—")}</strong></div>
          <div><span class="detail-label">မြို့</span><strong>${escapeHTML(order.city?.my || "—")} (${escapeHTML(order.city?.en || "—")})</strong></div>
          <div class="address-detail"><span class="detail-label">လိပ်စာ</span><span>${escapeHTML(order.address || "—")}</span></div>
          <div><span class="detail-label">အုပ်ရေ / အလေးချိန်</span><strong>${bookCount} အုပ် · ${totalWeight.toFixed(2)} kg</strong></div>
        </div>
        <div class="order-items">${items.map(item => `
          <div class="order-item"><span>${escapeHTML(item.name || item.id)} × ${Number(item.quantity) || 0}<small>${money(item.unitPrice)} / အုပ်</small></span><strong>${money(Number(item.subtotal) || Number(item.unitPrice) * Number(item.quantity))}</strong></div>`).join("")}</div>
        <div class="summary-row"><span>စာအုပ်ဖိုး</span><strong>${money(bookTotal)}</strong></div>
        <div class="summary-row"><span>ပို့ခ</span><strong>${money(deliveryFee)}</strong></div>
        <div class="summary-row total"><span>စုစုပေါင်း</span><strong>${money(grandTotal)}</strong></div>
        ${order.note ? `<p class="muted">မှတ်ချက်: ${escapeHTML(order.note)}</p>` : ""}
          `;
        })()}
      </article>`).join("");
  }

  async function loadOrders() {
    $("historyStatus").textContent = "Firebase မှ အော်ဒါများဖတ်နေပါသည်…";
    try {
      renderOrders(await request("bookOrders"));
      $("historyStatus").textContent = `နောက်ဆုံးဖတ်ရှုချိန် ${new Date().toLocaleTimeString()}`;
      $("historyStatus").className = "status success";
    } catch (error) {
      $("historyStatus").textContent = error.message;
      $("historyStatus").className = "status error";
    }
  }

  function initAdmin() {
    $("createTab").addEventListener("click", () => {
      $("createPanel").hidden = false;
      $("historyPanel").hidden = true;
      $("createTab").classList.add("active");
      $("historyTab").classList.remove("active");
    });
    $("historyTab").addEventListener("click", () => {
      $("createPanel").hidden = true;
      $("historyPanel").hidden = false;
      $("historyTab").classList.add("active");
      $("createTab").classList.remove("active");
      loadOrders();
    });
    $("refreshOrders").addEventListener("click", loadOrders);
  }

  if (isAdmin) initAdmin();
  initOrderForm();
})();
