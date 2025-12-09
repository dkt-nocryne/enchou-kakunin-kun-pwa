// ================================
// 設定値（お店用に調整）
// ================================
const DEFAULT_SETTINGS = {
  cardCount: 2,          // 延長パターンの数（1〜3）

  duration1: 30,         // 1パターン目の延長時間（分）
  duration2: 60,         // 2パターン目
  duration3: 90,         // 3パターン目

  // 男性料金
  price1: 3600,          // 例：30分延長 男性1名
  price2: 7200,         // 例：60分
  price3: 10800,         // 例：90分

  // 女性料金
  femalePrice1: 1800,
  femalePrice2: 3600,
  femalePrice3: 7200,

  // 指名料金
  nominationPrice1: 2400,
  nominationPrice2: 2400,
  nominationPrice3: 4800
};

// ================================
// localStorage キー
// ================================
const LS_KEYS = {
  CURRENT_CHARGE: 'bix_currentCharge',
  CUSTOMER_COUNT: 'bix_customerCount',
  FEMALE_CUSTOMER_COUNT: 'bix_femaleCustomerCount',
  NOMINATION_COUNT: 'bix_nominationCount',
  DISCOUNT1: 'bix_discount1',
  DISCOUNT2: 'bix_discount2',
  DISCOUNT3: 'bix_discount3',
  SETTINGS: 'bix_appSettings'
};

// ================================
// ユーティリティ
// ================================
function loadSettings() {
  const raw = localStorage.getItem(LS_KEYS.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const obj = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...obj };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
}

function loadInt(key, defaultValue) {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  const v = parseInt(raw, 10);
  return isNaN(v) ? defaultValue : v;
}

function loadString(key, defaultValue = '') {
  const raw = localStorage.getItem(key);
  return raw ?? defaultValue;
}

function saveString(key, value) {
  localStorage.setItem(key, value);
}

function formatYen(value) {
  return '¥' + Number(value).toLocaleString('ja-JP');
}

// ================================
// 計算ロジック
// ================================
function calcTotals(settings, state) {
  const currentCharge = state.currentCharge;
  const customerCount = state.customerCount;
  const femaleCustomerCount = state.femaleCustomerCount;
  const nominationCount = state.nominationCount;
  const discount1 = state.discount1;
  const discount2 = state.discount2;
  const discount3 = state.discount3;

  const total1 = currentCharge +
    (customerCount * settings.price1 +
     femaleCustomerCount * settings.femalePrice1 +
     nominationCount * settings.nominationPrice1) -
    discount1;

  const total2 = currentCharge +
    (customerCount * settings.price2 +
     femaleCustomerCount * settings.femalePrice2 +
     nominationCount * settings.nominationPrice2) -
    discount2;

  const total3 = currentCharge +
    (customerCount * settings.price3 +
     femaleCustomerCount * settings.femalePrice3 +
     nominationCount * settings.nominationPrice3) -
    discount3;

  return { total1, total2, total3 };
}

// ================================
// 画面共通の状態読み出し
// ================================
function loadState() {
  return {
    currentCharge: loadInt(LS_KEYS.CURRENT_CHARGE, 0),
    customerCount: loadInt(LS_KEYS.CUSTOMER_COUNT, 1),
    femaleCustomerCount: loadInt(LS_KEYS.FEMALE_CUSTOMER_COUNT, 0),
    nominationCount: loadInt(LS_KEYS.NOMINATION_COUNT, 0),
    discount1: loadInt(LS_KEYS.DISCOUNT1, 0),
    discount2: loadInt(LS_KEYS.DISCOUNT2, 0),
    discount3: loadInt(LS_KEYS.DISCOUNT3, 0)
  };
}

// ================================
// 計算画面初期化（index.html）
// ================================
function initCalculatorScreen() {
  const settings = loadSettings();
  const state = loadState();

  // 現在の料金
  const currentChargeDisplay = document.getElementById('currentChargeDisplay');
  if (currentChargeDisplay) {
    currentChargeDisplay.textContent = formatYen(state.currentCharge);
  }

  // 延長カード
  const container = document.getElementById('extensionCards');
  if (!container) return;

  container.innerHTML = '';

  const totals = calcTotals(settings, state);

  if (settings.cardCount >= 1) {
    container.appendChild(
      createExtensionCard(
        `${settings.duration1}分延長 合計`,
        totals.total1,
        true
      )
    );
  }
  if (settings.cardCount >= 2) {
    container.appendChild(
      createExtensionCard(
        `${settings.duration2}分延長 合計`,
        totals.total2,
        true
      )
    );
  }
  if (settings.cardCount >= 3) {
    container.appendChild(
      createExtensionCard(
        `${settings.duration3}分延長 合計`,
        totals.total3,
        false
      )
    );
  }
}

function createExtensionCard(label, amount, emphasized) {
  const card = document.createElement('div');
  card.className = 'card';

  const labelDiv = document.createElement('div');
  labelDiv.className = 'card-label';
  labelDiv.textContent = label;

  const amountDiv = document.createElement('div');
  amountDiv.className = 'card-amount';
  amountDiv.textContent = formatYen(amount);

  if (emphasized) {
    card.style.background = '#9fb5cfff';
  }

  card.appendChild(labelDiv);
  card.appendChild(amountDiv);
  return card;
}

// 現在の料金
const currentChargeInput = document.getElementById('currentChargeInput');
const currentChargeReset = document.getElementById('currentChargeReset');

if (currentChargeInput) {
  // 画面描画時はカンマ付き表示
  currentChargeInput.value = state.currentCharge ? Number(state.currentCharge).toLocaleString() : '';

  // 入力中はカンマ無しで生数字を扱う
  currentChargeInput.addEventListener('input', e => {
    let raw = e.target.value.replace(/[^0-9]/g,'');
    if (raw === '') raw = '0';
    saveString(LS_KEYS.CURRENT_CHARGE, raw);
    e.target.value = raw;  // 入力時はカンマなし
  });

  // フォーカスを離れたときにカンマ付けて見栄え整える
  currentChargeInput.addEventListener('blur', e => {
    const raw = localStorage.getItem(LS_KEYS.CURRENT_CHARGE) || '0';
    e.target.value = Number(raw).toLocaleString();
  });
}

// リセットボタン
if (currentChargeReset) {
  currentChargeReset.addEventListener('click', () => {
    currentChargeInput.value = '';
    saveString(LS_KEYS.CURRENT_CHARGE, '0');
  });
}


  // カウンター類
  initCounter(
    'customerCount',
    'customerInc',
    'customerDec',
    LS_KEYS.CUSTOMER_COUNT,
    state.customerCount,
    0
  );

  initCounter(
    'nominationCount',
    'nominationInc',
    'nominationDec',
    LS_KEYS.NOMINATION_COUNT,
    state.nominationCount,
    0
  );

  initCounter(
    'femaleCustomerCount',
    'femaleInc',
    'femaleDec',
    LS_KEYS.FEMALE_CUSTOMER_COUNT,
    state.femaleCustomerCount,
    0
  );

  // 割引フィールド
  const discountContainer = document.getElementById('discountFields');
  if (discountContainer) {
    discountContainer.innerHTML = '';
    if (settings.cardCount >= 1) {
      discountContainer.appendChild(
        createDiscountField(
          `${settings.duration1}分延長 割引額`,
          'discount1Input',
          LS_KEYS.DISCOUNT1,
          state.discount1
        )
      );
    }
    if (settings.cardCount >= 2) {
      discountContainer.appendChild(
        createDiscountField(
          `${settings.duration2}分延長 割引額`,
          'discount2Input',
          LS_KEYS.DISCOUNT2,
          state.discount2
        )
      );
    }
    if (settings.cardCount >= 3) {
      discountContainer.appendChild(
        createDiscountField(
          `${settings.duration3}分延長 割引額`,
          'discount3Input',
          LS_KEYS.DISCOUNT3,
          state.discount3
        )
      );
    }
  }

  const discountReset = document.getElementById('discountReset');
  if (discountReset) {
    discountReset.addEventListener('click', () => {
      ['discount1Input', 'discount2Input', 'discount3Input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      saveString(LS_KEYS.DISCOUNT1, '0');
      saveString(LS_KEYS.DISCOUNT2, '0');
      saveString(LS_KEYS.DISCOUNT3, '0');
    });
  }

function initCounter(labelId, incId, decId, storageKey, initialValue, minValue) {
  const label = document.getElementById(labelId);
  const inc = document.getElementById(incId);
  const dec = document.getElementById(decId);

  if (!label || !inc || !dec) return;

  let value = initialValue;

  function update() {
    if (value < minValue) value = minValue;
    label.textContent = value.toString();
    saveString(storageKey, value.toString());
  }

  inc.addEventListener('click', () => {
    value++;
    update();
  });

  dec.addEventListener('click', () => {
    value--;
    update();
  });

  update();
}

function createDiscountField(labelText, inputId, storageKey, initialValue) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field-group';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.setAttribute('for', inputId);
  label.textContent = labelText;

  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'number';
  input.inputMode = 'numeric';
  input.className = 'field-input right';
  input.value = initialValue || '';

  input.addEventListener('input', () => {
    const v = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
    const num = isNaN(v) ? 0 : v;
    saveString(storageKey, num.toString());
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return wrapper;
}

// ================================
// SW登録 & 即時更新処理（完全版）
// ================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {

    // 既にwaitingがいたら即更新
    if (reg.waiting) {
      reg.waiting.postMessage('skipWaiting');
      return;
    }

    // 新しいSWがinstallされた時
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          newSW.postMessage('skipWaiting');
        }
      });
    });

    // 新SWが有効化 → 自動リロード
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      location.reload();
    });

  });
}
