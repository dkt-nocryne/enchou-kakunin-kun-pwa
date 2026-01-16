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

  // 場内指名料金
  inhouseNominationPrice1: 2400,
  inhouseNominationPrice2: 2400,
  inhouseNominationPrice3: 4800,

  // 表示ラベル（1セット）
  labelMaleCustomer: 'お客様（男性）',
  labelMainNomination: '本指名',
  labelInhouseNomination: '場内指名',
  labelFemaleCustomer: 'お客様（女性）',

  // カード手数料（%）
  cardFeePercent: 0
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

  NOMINATION_COUNT_OLD: 'bix_nominationCount',

  SETTINGS: 'bix_appSettings',

  // カード手数料 ON/OFF（画面状態）
  CARD_FEE_ENABLED: 'bix_cardFeeEnabled'
};

// ================================
// ユーティリティ
// ================================
function safeGetEl(id) {
  return document.getElementById(id);
}

function loadSettings() {
  const raw = localStorage.getItem(LS_KEYS.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const obj = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...obj };

    // 旧設定の移行処理
    if (obj && typeof obj === 'object') {
      if (merged.mainNominationPrice1 == null && obj.nominationPrice1 != null) merged.mainNominationPrice1 = obj.nominationPrice1;
      if (merged.mainNominationPrice2 == null && obj.nominationPrice2 != null) merged.mainNominationPrice2 = obj.nominationPrice2;
      if (merged.mainNominationPrice3 == null && obj.nominationPrice3 != null) merged.mainNominationPrice3 = obj.nominationPrice3;
    }

    merged.cardFeePercent = clampNumber(merged.cardFeePercent, 0, 100);
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
}

function loadInt(key, def) {
  const raw = localStorage.getItem(key);
  if (raw == null) return def;
  const v = parseInt(raw, 10);
  return isNaN(v) ? def : v;
}

function saveString(key, value) {
  localStorage.setItem(key, value);
}

function loadBool(key, def) {
  const raw = localStorage.getItem(key);
  if (raw == null) return def;
  return raw === '1' || raw === 'true';
}

function saveBool(key, value) {
  localStorage.setItem(key, value ? '1' : '0');
}

function formatYen(value) {
  return '¥' + Number(value).toLocaleString('ja-JP');
}

function clampInt(v, min, max) {
  const n = parseInt(String(v), 10);
  if (isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function clampNumber(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ================================
// カード手数料計算
// ================================
const ROUND_UNIT = 100;

function applyCardFee(amount, percent) {
  const p = clampNumber(percent, 0, 100);
  if (p <= 0) return amount;

  // 1. まず計算
  let raw = amount * (1 + p / 100);

  // 2. 誤差対策：一度整数に丸める（13200.0001 -> 13200）
  raw = Math.round(raw);

  // 3. 100円単位で切り上げ
  const rounded = Math.ceil(raw / ROUND_UNIT) * ROUND_UNIT;
  
  return Math.trunc(rounded);
}

// ================================
// 計算ロジック（ベース）
// ================================
function calcTotals(settings, state) {
  const {
    currentCharge,
    customerCount,
    femaleCustomerCount,
    mainNominationCount,
    inhouseNominationCount
  } = state;

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
// 状態読み出し
// ================================
function loadState() {
  const mainRaw = localStorage.getItem(LS_KEYS.MAIN_NOMINATION_COUNT);
  const inhouseRaw = localStorage.getItem(LS_KEYS.INHOUSE_NOMINATION_COUNT);

  if (mainRaw == null && inhouseRaw == null) {
    const old = localStorage.getItem(LS_KEYS.NOMINATION_COUNT_OLD);
    if (old != null) {
      const v = parseInt(old, 10);
      const n = isNaN(v) ? 0 : v;
      saveString(LS_KEYS.MAIN_NOMINATION_COUNT, String(n));
      saveString(LS_KEYS.INHOUSE_NOMINATION_COUNT, '0');
    }
  }

  return {
    currentCharge: loadInt(LS_KEYS.CURRENT_CHARGE, 0),
    customerCount: loadInt(LS_KEYS.CUSTOMER_COUNT, 1),
    femaleCustomerCount: loadInt(LS_KEYS.FEMALE_CUSTOMER_COUNT, 0),
    mainNominationCount: loadInt(LS_KEYS.MAIN_NOMINATION_COUNT, 0),
    inhouseNominationCount: loadInt(LS_KEYS.INHOUSE_NOMINATION_COUNT, 0),
    cardFeeEnabled: loadBool(LS_KEYS.CARD_FEE_ENABLED, false)
  };
}

// ================================
// UI：ラベル反映（index.html / settings.html 共通）
// ================================
function applyUiLabels(settings) {
  // ラベルの文字をセットしつつ、空なら行ごと隠す関数
  const updateLabelAndVisibility = (labelId, rowId, text) => {
    const el = safeGetEl(labelId);
    const v = String(text ?? '').trim();
    if (el) el.textContent = v;

    const row = safeGetEl(rowId);
    if (row) {
      row.style.display = (v === '') ? 'none' : '';
    }
  };

  // index.html の ± 行
  updateLabelAndVisibility('labelMaleCustomer',      'rowMaleCustomer',      settings.labelMaleCustomer);
  updateLabelAndVisibility('labelMainNomination',    'rowMainNomination',    settings.labelMainNomination);
  updateLabelAndVisibility('labelInhouseNomination', 'rowInhouseNomination', settings.labelInhouseNomination);
  updateLabelAndVisibility('labelFemaleCustomer',    'rowFemaleCustomer',    settings.labelFemaleCustomer);

  // settings.html の 見出し
  const setTitle = (id, text) => {
    const el = safeGetEl(id);
    if (el) el.textContent = String(text ?? '').trim();
  };
  setTitle('titleMalePriceTitle', settings.labelMaleCustomer);
  setTitle('titleMainNominationTitle', settings.labelMainNomination);
  setTitle('titleInhouseNominationTitle', settings.labelInhouseNomination);
  setTitle('titleFemalePriceTitle', settings.labelFemaleCustomer);
}

// ================================
// 延長カード生成
// ================================
function createExtensionCard(label, amount, emphasized) {
  const card = document.createElement('div');
  card.className = 'card extension-card';

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
// 文字サイズ自動調整（Scale Transform方式）
// ================================
function fitTextToWidth(el) {
  if (!el) return;

  const text = el.textContent;
  
  // DOM再構築（リセットも兼ねる）
  const span = document.createElement('span');
  span.style.display = 'inline-block';
  span.style.whiteSpace = 'nowrap';
  span.style.transformOrigin = 'center';
  span.textContent = text ?? '';

  el.textContent = '';
  el.appendChild(span);

  const parentWidth = el.clientWidth;
  const childWidth = span.scrollWidth;

  if (childWidth > parentWidth) {
    const scale = parentWidth / childWidth;
    // マージン考慮で少し小さめに(0.95倍)
    span.style.transform = `scale(${scale * 0.95})`;
  }
}

function fitAllAmounts() {
  // 現在の料金
  fitTextToWidth(safeGetEl('currentChargeDisplay'));
  // 延長カード
  document.querySelectorAll('.extension-card .card-amount').forEach(el => {
    fitTextToWidth(el);
  });
}

// ================================
// 1画面：初期化（index.html）
// ================================
function initApp() {
  initInputBindings();
  updateCalculator();
}

function updateCalculator() {
  const settings = loadSettings();
  applyUiLabels(settings);

  const state = loadState();

  // indexヘッダーのトグル反映
  const toggle = safeGetEl('cardFeeToggle');
  if (toggle) toggle.checked = !!state.cardFeeEnabled;

  const feeOn = !!state.cardFeeEnabled;
  const feePercent = settings.cardFeePercent;

  // 現在の料金表示
  const currentChargeDisplay = safeGetEl('currentChargeDisplay');
  if (currentChargeDisplay) {
    const base = state.currentCharge;
    const shown = feeOn ? applyCardFee(base, feePercent) : base;
    currentChargeDisplay.textContent = formatYen(shown);
  }

  // 延長カード生成
  const container = safeGetEl('extensionCards');
  if (!container) return;

  container.innerHTML = '';

  const totals = calcTotals(settings, state);

  const t1 = feeOn ? applyCardFee(totals.total1, feePercent) : totals.total1;
  const t2 = feeOn ? applyCardFee(totals.total2, feePercent) : totals.total2;
  const t3 = feeOn ? applyCardFee(totals.total3, feePercent) : totals.total3;

  if (settings.cardCount >= 1) {
    container.appendChild(createExtensionCard(`${settings.duration1}分延長 合計`, t1, true));
  }
  if (settings.cardCount >= 2) {
    container.appendChild(createExtensionCard(`${settings.duration2}分延長 合計`, t2, true));
  }
  if (settings.cardCount >= 3) {
    container.appendChild(createExtensionCard(`${settings.duration3}分延長 合計`, t3, true));
  }

  // ★修正: Flexboxで高さを自動調整するため、旧パディング計算(applyCardPaddingByCount)は不要になりました。
  // その代わり、描画後に文字サイズ調整を行います。

  // 文字サイズ調整（描画フレームに合わせて実行）
  requestAnimationFrame(() => {
    fitAllAmounts();
  });
}

// ================================
// 入力：イベント紐付け（index.html）
// ================================
function initInputBindings() {
  const state = loadState();

  // カード手数料トグル
  const cardFeeToggle = safeGetEl('cardFeeToggle');
  if (cardFeeToggle) {
    cardFeeToggle.checked = !!state.cardFeeEnabled;
    cardFeeToggle.addEventListener('change', () => {
      saveBool(LS_KEYS.CARD_FEE_ENABLED, !!cardFeeToggle.checked);
      updateCalculator();
    });
  }

  // 現在の料金
  const currentChargeInput = safeGetEl('currentChargeInput');
  const currentChargeReset = safeGetEl('currentChargeReset');

  if (currentChargeInput) {
    currentChargeInput.value = state.currentCharge || '';
    currentChargeInput.addEventListener('input', () => {
      const v = parseInt(String(currentChargeInput.value ?? '').replace(/[^0-9]/g, ''), 10);
      saveString(LS_KEYS.CURRENT_CHARGE, String(isNaN(v) ? 0 : v));
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

function bindText(id, onChange) {
  const el = safeGetEl(id);
  if (!el) return;

  const handler = () => onChange(String(el.value ?? ''));
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

function initSettingsEditorScreen() {
  const settings = loadSettings();

  // cardCount
  setVal('cardCount', settings.cardCount);
  const cardCountEl = safeGetEl('cardCount');
  if (cardCountEl) {
    cardCountEl.addEventListener('change', () => {
      const v = parseInt(cardCountEl.value, 10);
      const s = loadSettings();
      s.cardCount = clampInt(isNaN(v) ? 1 : v, 1, 3);
      saveSettings(s);

      applyUiLabels(s);
      // CSS側で高さ調整するためパディング設定関数は不要ですが、エラーにならないよう削除済み
    });
  }

  // カード手数料（%）
  setVal('cardFeePercent', settings.cardFeePercent);
  bindInt('cardFeePercent', v => {
    const s = loadSettings();
    s.cardFeePercent = clampInt(v, 0, 100);
    saveSettings(s);
    applyUiLabels(s);
  });

  // 数値項目
  [
    'duration1','duration2','duration3',
    'price1','price2','price3',
    'femalePrice1','femalePrice2','femalePrice3',
    'mainNominationPrice1','mainNominationPrice2','mainNominationPrice3',
    'inhouseNominationPrice1','inhouseNominationPrice2','inhouseNominationPrice3'
  ].forEach(id => setVal(id, settings[id]));

  [
    'duration1','duration2','duration3',
    'price1','price2','price3',
    'femalePrice1','femalePrice2','femalePrice3',
    'mainNominationPrice1','mainNominationPrice2','mainNominationPrice3',
    'inhouseNominationPrice1','inhouseNominationPrice2','inhouseNominationPrice3'
  ].forEach(id => {
    bindInt(id, v => {
      const s = loadSettings();
      s[id] = Math.max(0, v);
      saveSettings(s);
    });
  });

  // ラベル入力
  const labelKeys = [
    'labelMaleCustomer',
    'labelMainNomination',
    'labelInhouseNomination',
    'labelFemaleCustomer'
  ];
  
  labelKeys.forEach(id => setVal(id, settings[id]));
  labelKeys.forEach(id => {
    bindText(id, v => {
      const s = loadSettings();
      s[id] = String(v ?? '').trim();
      saveSettings(s);
      applyUiLabels(s);
    });
  });

  // 初期反映
  applyUiLabels(settings);
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
