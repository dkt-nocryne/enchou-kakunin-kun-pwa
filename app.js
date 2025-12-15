// ================================
// 設定値（お店用に調整）
// ================================
const DEFAULT_SETTINGS = {
  cardCount: 2,

  duration1: 30,
  duration2: 60,
  duration3: 90,

  // 男性料金
  price1: 3600,
  price2: 7200,
  price3: 10800,

  // 女性料金
  femalePrice1: 1800,
  femalePrice2: 3600,
  femalePrice3: 5400,

  // 本指名料金
  mainNominationPrice1: 2400,
  mainNominationPrice2: 2400,
  mainNominationPrice3: 4800,

  // 場内指名料金（必要に応じて調整）
  inhouseNominationPrice1: 2400,
  inhouseNominationPrice2: 2400,
  inhouseNominationPrice3: 4800
};

// ================================
// localStorage キー
// ================================
const LS_KEYS = {
  CURRENT_CHARGE: 'bix_currentCharge',
  CUSTOMER_COUNT: 'bix_customerCount',
  FEMALE_CUSTOMER_COUNT: 'bix_femaleCustomerCount',

  MAIN_NOMINATION_COUNT: 'bix_mainNominationCount',
  INHOUSE_NOMINATION_COUNT: 'bix_inhouseNominationCount',

  // 旧：移行用（過去データが残っている可能性）
  NOMINATION_COUNT_OLD: 'bix_nominationCount',

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
    const merged = { ...DEFAULT_SETTINGS, ...obj };

    // 旧設定（nominationPrice1..3）が残っている場合、本指名へ寄せる
    if (obj && typeof obj === 'object') {
      if (merged.mainNominationPrice1 == null && obj.nominationPrice1 != null) merged.mainNominationPrice1 = obj.nominationPrice1;
      if (merged.mainNominationPrice2 == null && obj.nominationPrice2 != null) merged.mainNominationPrice2 = obj.nominationPrice2;
      if (merged.mainNominationPrice3 == null && obj.nominationPrice3 != null) merged.mainNominationPrice3 = obj.nominationPrice3;
    }

    return merged;
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
}

function loadInt(key, defaultValue) {
  const raw = localStorage.getItem(key);
  if (raw == null) return defaultValue;
  const v = parseInt(raw, 10);
  return isNaN(v) ? defaultValue : v;
}

function saveString(key, value) {
  localStorage.setItem(key, value);
}

function formatYen(value) {
  return '¥' + Number(value).toLocaleString('ja-JP');
}

function safeGetEl(id) {
  return document.getElementById(id);
}

// ================================
// 計算ロジック（割引なし）
// ================================
function calcTotals(settings, state) {
  const currentCharge = state.currentCharge;
  const customerCount = state.customerCount;
  const femaleCustomerCount = state.femaleCustomerCount;

  const mainNominationCount = state.mainNominationCount;
  const inhouseNominationCount = state.inhouseNominationCount;

  const total1 = currentCharge +
    (customerCount * settings.price1 +
     femaleCustomerCount * settings.femalePrice1 +
     mainNominationCount * settings.mainNominationPrice1 +
     inhouseNominationCount * settings.inhouseNominationPrice1);

  const total2 = currentCharge +
    (customerCount * settings.price2 +
     femaleCustomerCount * settings.femalePrice2 +
     mainNominationCount * settings.mainNominationPrice2 +
     inhouseNominationCount * settings.inhouseNominationPrice2);

  const total3 = currentCharge +
    (customerCount * settings.price3 +
     femaleCustomerCount * settings.femalePrice3 +
     mainNominationCount * settings.mainNominationPrice3 +
     inhouseNominationCount * settings.inhouseNominationPrice3);

  return { total1, total2, total3 };
}

// ================================
// 状態読み出し（旧データ移行を含む）
// ================================
function loadState() {
  const mainRaw = localStorage.getItem(LS_KEYS.MAIN_NOMINATION_COUNT);
  const inhouseRaw = localStorage.getItem(LS_KEYS.INHOUSE_NOMINATION_COUNT);

  // 旧「指名」キーが残っていて、新キーが未設定なら本指名へ移行
  if (mainRaw == null && inhouseRaw == null) {
    const old = localStorage.getItem(LS_KEYS.NOMINATION_COUNT_OLD);
    if (old != null) {
      const v = parseInt(old, 10);
      const n = isNaN(v) ? 0 : v;
      saveString(LS_KEYS.MAIN_NOMINATION_COUNT, String(n));
      saveString(LS_KEYS.INHOUSE_NOMINATION_COUNT, '0');
      // localStorage.removeItem(LS_KEYS.NOMINATION_COUNT_OLD);
    }
  }

  return {
    currentCharge: loadInt(LS_KEYS.CURRENT_CHARGE, 0),
    customerCount: loadInt(LS_KEYS.CUSTOMER_COUNT, 1),
    femaleCustomerCount: loadInt(LS_KEYS.FEMALE_CUSTOMER_COUNT, 0),

    mainNominationCount: loadInt(LS_KEYS.MAIN_NOMINATION_COUNT, 0),
    inhouseNominationCount: loadInt(LS_KEYS.INHOUSE_NOMINATION_COUNT, 0)
  };
}

// ================================
// 1画面：初期化
// ================================
function initApp() {
  initInputBindings();
  updateCalculator();
}

// ================================
// 表示：再描画
// ================================
function updateCalculator() {
  const settings = loadSettings();
  const state = loadState();

  const currentChargeDisplay = safeGetEl('currentChargeDisplay');
  if (currentChargeDisplay) {
    currentChargeDisplay.textContent = formatYen(state.currentCharge);
  }

  const container = safeGetEl('extensionCards');
  if (!container) return;

  container.innerHTML = '';

  const totals = calcTotals(settings, state);

  if (settings.cardCount >= 1) {
    container.appendChild(createExtensionCard(`${settings.duration1}分延長 合計`, totals.total1, true));
  }
  if (settings.cardCount >= 2) {
    container.appendChild(createExtensionCard(`${settings.duration2}分延長 合計`, totals.total2, true));
  }
  if (settings.cardCount >= 3) {
    container.appendChild(createExtensionCard(`${settings.duration3}分延長 合計`, totals.total3, true));
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

// ================================
// 入力：イベント紐付け（割引なし）
// ================================
function initInputBindings() {
  const state = loadState();

  // 現在の料金
  const currentChargeInput = safeGetEl('currentChargeInput');
  const currentChargeReset = safeGetEl('currentChargeReset');

  if (currentChargeInput) {
    currentChargeInput.value = state.currentCharge || '';
    currentChargeInput.addEventListener('input', () => {
      const raw = String(currentChargeInput.value ?? '');
      const v = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      const value = isNaN(v) ? 0 : v;
      saveString(LS_KEYS.CURRENT_CHARGE, value.toString());
      updateCalculator();
    });
  }

  if (currentChargeReset) {
    currentChargeReset.addEventListener('click', () => {
      if (currentChargeInput) currentChargeInput.value = '';
      saveString(LS_KEYS.CURRENT_CHARGE, '0');
      updateCalculator();
    });
  }

  // カウンター
  initCounter('customerCount', 'customerInc', 'customerDec', LS_KEYS.CUSTOMER_COUNT, state.customerCount, 0);
  initCounter('mainNominationCount', 'mainNominationInc', 'mainNominationDec', LS_KEYS.MAIN_NOMINATION_COUNT, state.mainNominationCount, 0);
  initCounter('inhouseNominationCount', 'inhouseNominationInc', 'inhouseNominationDec', LS_KEYS.INHOUSE_NOMINATION_COUNT, state.inhouseNominationCount, 0);
  initCounter('femaleCustomerCount', 'femaleInc', 'femaleDec', LS_KEYS.FEMALE_CUSTOMER_COUNT, state.femaleCustomerCount, 0);
}

function initCounter(labelId, incId, decId, storageKey, initialValue, minValue) {
  const label = safeGetEl(labelId);
  const inc = safeGetEl(incId);
  const dec = safeGetEl(decId);

  if (!label || !inc || !dec) return;

  let value = initialValue;

  function update() {
    if (value < minValue) value = minValue;
    label.textContent = value.toString();
    saveString(storageKey, value.toString());
    updateCalculator();
  }

  inc.addEventListener('click', () => { value++; update(); });
  dec.addEventListener('click', () => { value--; update(); });

  update();
}

// ================================
// 設定編集画面（settings.html）
// ================================
function initSettingsEditorScreen() {
  const settings = loadSettings();

  setVal('cardCount', settings.cardCount);

  setVal('duration1', settings.duration1);
  setVal('duration2', settings.duration2);
  setVal('duration3', settings.duration3);

  setVal('price1', settings.price1);
  setVal('price2', settings.price2);
  setVal('price3', settings.price3);

  setVal('femalePrice1', settings.femalePrice1);
  setVal('femalePrice2', settings.femalePrice2);
  setVal('femalePrice3', settings.femalePrice3);

  setVal('mainNominationPrice1', settings.mainNominationPrice1);
  setVal('mainNominationPrice2', settings.mainNominationPrice2);
  setVal('mainNominationPrice3', settings.mainNominationPrice3);

  setVal('inhouseNominationPrice1', settings.inhouseNominationPrice1);
  setVal('inhouseNominationPrice2', settings.inhouseNominationPrice2);
  setVal('inhouseNominationPrice3', settings.inhouseNominationPrice3);

  bindInt('cardCount', v => {
    const n = clampInt(v, 1, 3);
    const s = loadSettings();
    s.cardCount = n;
    saveSettings(s);
  });

  [
    'duration1','duration2','duration3',
    'price1','price2','price3',
    'femalePrice1','femalePrice2','femalePrice3',
    'mainNominationPrice1','mainNominationPrice2','mainNominationPrice3',
    'inhouseNominationPrice1','inhouseNominationPrice2','inhouseNominationPrice3'
  ].forEach(id => {
    bindInt(id, v => {
      const n = Math.max(0, v);
      const s = loadSettings();
      s[id] = n;
      saveSettings(s);
    });
  });
}

function setVal(id, value) {
  const el = safeGetEl(id);
  if (!el) return;
  el.value = String(value ?? '');
}

function bindInt(id, onChange) {
  const el = safeGetEl(id);
  if (!el) return;

  const handler = () => {
    const raw = String(el.value ?? '').replace(/[^0-9]/g, '');
    const v = parseInt(raw, 10);
    onChange(isNaN(v) ? 0 : v);
  };

  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

function clampInt(v, min, max) {
  const n = parseInt(String(v), 10);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ================================
// Service Worker 登録（維持）
// ================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    if (reg.waiting) {
      reg.waiting.postMessage('skipWaiting');
    }
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          newSW.postMessage('skipWaiting');
          location.reload();
        }
      });
    });
  });
}

function persistSettingsFromForm() {
  const s = loadSettings();

  const getNum = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const raw = String(el.value ?? '').replace(/[^0-9]/g, '');
    const v = parseInt(raw, 10);
    return isNaN(v) ? 0 : v;
  };

  const getSel = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const v = parseInt(String(el.value ?? ''), 10);
    return isNaN(v) ? null : v;
  };

  const cc = getSel('cardCount');
  if (cc != null) s.cardCount = Math.min(3, Math.max(1, cc));

  [
    'duration1','duration2','duration3',
    'price1','price2','price3',
    'femalePrice1','femalePrice2','femalePrice3',
    'mainNominationPrice1','mainNominationPrice2','mainNominationPrice3',
    'inhouseNominationPrice1','inhouseNominationPrice2','inhouseNominationPrice3'
  ].forEach(id => {
    const v = getNum(id);
    if (v != null) s[id] = Math.max(0, v);
  });

  saveSettings(s);
}
