import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  MapPinned,
  Navigation,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  firebaseReady,
  listDatasets,
  listenAuth,
  loadDataset,
  logout,
  registerWithEmail,
  removeDataset,
  saveDataset,
  signInWithEmail,
  signInWithGoogle,
} from './firebaseClient';

const MAX_DISTANCE_TARGETS = 5;
const CSV_SECTION_MARKER = '#SECTION';
const CSV_SECTION_GLOBAL_TARGETS = 'GLOBAL_DISTANCE_TARGETS';
const CSV_SECTION_GLOBAL_CONSTRAINTS = 'GLOBAL_CONSTRAINTS';
const CSV_SECTION_GLOBAL_MORTGAGE = 'GLOBAL_MORTGAGE_PARAMS';
const CSV_SECTION_PROPERTIES = 'PROPERTIES';

const SCORE_FIELDS = [
  { key: 'loc1', label: '商圈定位', group: 'location' },
  { key: 'loc2', label: '接駁停車', group: 'location' },
  { key: 'fac1', label: '能見度', group: 'facility' },
  { key: 'fac2', label: '格局方正', group: 'facility' },
  { key: 'spc1', label: '挑高條件', group: 'space' },
  { key: 'spc2', label: '坪數採光', group: 'space' },
  { key: 'fin1', label: '總價預算', group: 'finance' },
  { key: 'fin2', label: '單價急售', group: 'finance' },
  { key: 'hd1', label: '既有硬體', group: 'hardware' },
];

const GROUPS = {
  location: { label: '區位', color: '#176b87' },
  facility: { label: '店況', color: '#5f7c3a' },
  space: { label: '空間', color: '#b07823' },
  finance: { label: '財務', color: '#8e4a63' },
  hardware: { label: '硬體', color: '#53616f' },
};

const RAW_GROUPS = [
  {
    title: '基本識別',
    fields: [
      { key: 'buildingName', label: '建案/大樓名稱', type: 'text', span: 'wide', aliases: ['buildingName', '建案名稱', '大樓名稱'] },
      { key: 'address', label: '地址', type: 'text', span: 'full', aliases: ['address', '地址'] },
      { key: 'district', label: '行政區', type: 'text', aliases: ['district', '行政區'] },
      { key: 'businessZone', label: '商圈/地標', type: 'text', aliases: ['businessZone', '商圈地標', '商圈/地標'] },
      { key: 'coverPhotoUrl', label: '封面照網址', type: 'text', span: 'full', aliases: ['coverPhotoUrl', '封面照網址', '封面圖片網址'] },
      { key: 'photoUrls', label: '照片網址清單', type: 'textarea', span: 'full', aliases: ['photoUrls', '照片網址清單', '多張照片網址'] },
    ],
  },
  {
    title: '地理位置與環境',
    fields: [
      { key: 'isMainRoad', label: '主幹道', type: 'booleanText', aliases: ['isMainRoad', '主幹道'] },
      { key: 'direction', label: '座向', type: 'select', options: ['未填', '東', '西', '南', '北', '東南', '西南', '東北', '西北'], aliases: ['direction', '座向'] },
      { key: 'nearbyParkingNote', label: '附近停車描述', type: 'text', span: 'wide', aliases: ['nearbyParkingNote', '附近停車描述'] },
      { key: 'environmentNote', label: '環境備註', type: 'text', span: 'wide', aliases: ['environmentNote', '環境備註'] },
    ],
  },
  {
    title: '財務與坪效',
    fields: [
      { key: 'totalPrice', label: '總價(萬)', type: 'number', aliases: ['totalPrice', '總價(萬)', '總價'] },
      { key: 'buildArea', label: '建坪', type: 'number', aliases: ['buildArea', '建坪'] },
      { key: 'firstFloorArea', label: '1F樓板坪數', type: 'number', aliases: ['firstFloorArea', '1F樓板坪數', '一樓樓板坪數'] },
      { key: 'attachedArea', label: '附屬坪數', type: 'number', aliases: ['attachedArea', '附屬坪數'] },
      { key: 'hasMezzanine', label: '挑高可夾層', type: 'booleanText', aliases: ['hasMezzanine', '挑高可夾層'] },
      { key: 'mezzanineArea', label: '夾層坪數', type: 'number', aliases: ['mezzanineArea', '夾層坪數'] },
      { key: 'sharedArea', label: '共有坪數', type: 'number', aliases: ['sharedArea', '共有坪數'] },
      { key: 'landArea', label: '土地坪數', type: 'number', aliases: ['landArea', '土地坪數'] },
      { key: 'parkingCount', label: '車位數量', type: 'number', aliases: ['parkingCount', '車位數量'] },
      { key: 'parkingArea', label: '車位坪數', type: 'number', aliases: ['parkingArea', '車位坪數'] },
      { key: 'parkingPrice', label: '車位價格(萬)', type: 'number', aliases: ['parkingPrice', '車位價格(萬)', '車位價格'] },
      { key: 'age', label: '屋齡', type: 'number', aliases: ['age', '屋齡'] },
      { key: 'actualTransactionTotalPrice', label: '實登總價(萬)', type: 'number', aliases: ['actualTransactionTotalPrice', '實登總價(萬)', '實價登錄總價', '實登總價'] },
      { key: 'actualTransactionParkingPrice', label: '實登車位價格(萬)', type: 'number', aliases: ['actualTransactionParkingPrice', '實登車位價格(萬)', '實價登錄車位價格', '實登車位價格'] },
      { key: 'lastHistoricalPrice', label: '周邊實登均價(萬/坪)', type: 'number', aliases: ['lastHistoricalPrice', '周邊實登均價(萬/坪)', '周邊實登均價'] },
      { key: 'historicalDate', label: '實登行情年月', type: 'text', aliases: ['historicalDate', '實登行情年月'] },
      { key: 'marketSampleCount1Y', label: '近一年樣本數', type: 'number', aliases: ['marketSampleCount1Y', '近一年樣本數'] },
      { key: 'averageUnitPrice1Y', label: '近一年平均單價(萬/坪)', type: 'number', aliases: ['averageUnitPrice1Y', '近一年平均單價(萬/坪)'] },
      { key: 'medianUnitPrice1Y', label: '近一年中位單價(萬/坪)', type: 'number', aliases: ['medianUnitPrice1Y', '近一年中位單價(萬/坪)'] },
      { key: 'maxUnitPriceHistorical', label: '歷史最高單價(萬/坪)', type: 'number', aliases: ['maxUnitPriceHistorical', '歷史最高單價(萬/坪)'] },
      { key: 'minUnitPriceHistorical', label: '歷史最低單價(萬/坪)', type: 'number', aliases: ['minUnitPriceHistorical', '歷史最低單價(萬/坪)'] },
      { key: 'averageUnitPriceHistorical', label: '歷史平均單價(萬/坪)', type: 'number', aliases: ['averageUnitPriceHistorical', '歷史平均單價(萬/坪)'] },
      { key: 'latestTransactionDate', label: '最近成交年月', type: 'text', aliases: ['latestTransactionDate', '最近成交年月'] },
    ],
  },
  {
    title: '店面條件',
    fields: [
      { key: 'isCornerLot', label: '角間', type: 'booleanText', aliases: ['isCornerLot', '角間'] },
      { key: 'frontageWidth', label: '面寬(米)', type: 'number', aliases: ['frontageWidth', '面寬(米)', '面寬'] },
      { key: 'depth', label: '深度(米)', type: 'number', aliases: ['depth', '深度(米)', '深度'] },
      { key: 'roadWidth', label: '道路寬(米)', type: 'number', aliases: ['roadWidth', '道路寬(米)', '道路寬'] },
      { key: 'isSquare', label: '格局方正', type: 'booleanText', aliases: ['isSquare', '格局方正'] },
      { key: 'ceilingHeight', label: '樓高(米)', type: 'number', aliases: ['ceilingHeight', '樓高(米)', '樓高'] },
      { key: 'firstFloorLight', label: '1F採光', type: 'select', options: ['未填', '佳', '普通', '弱'], aliases: ['firstFloorLight', '1F採光'] },
      { key: 'secondFloorLight', label: '2F採光', type: 'select', options: ['未填', '佳', '普通', '弱', '無2F'], aliases: ['secondFloorLight', '2F採光'] },
      { key: 'hardwareNote', label: '既有硬體備註', type: 'text', span: 'wide', aliases: ['hardwareNote', '既有硬體備註'] },
      { key: 'memo', label: '備註', type: 'textarea', span: 'full', aliases: ['memo', '備註'] },
    ],
  },
];

const RAW_FIELDS = RAW_GROUPS.flatMap((group) => group.fields);

const DEFAULT_DISTANCE_TARGETS = [
  { id: 'target1', name: '高鐵站', address: '高鐵桃園站' },
  { id: 'target2', name: '捷運站', address: '桃園捷運A19站' },
  { id: 'target3', name: '停車場', address: '附近停車場' },
  { id: 'target4', name: '自訂基準點', address: '' },
];

const PRESETS = {
  balanced: {
    label: '平衡模式',
    weights: { loc1: 15, loc2: 10, fac1: 10, fac2: 10, spc1: 10, spc2: 15, fin1: 10, fin2: 10, hd1: 10 },
  },
  brand: {
    label: '品牌優先',
    weights: { loc1: 22, loc2: 12, fac1: 16, fac2: 10, spc1: 10, spc2: 12, fin1: 6, fin2: 4, hd1: 8 },
  },
  roi: {
    label: '投報優先',
    weights: { loc1: 8, loc2: 8, fac1: 8, fac2: 8, spc1: 12, spc2: 12, fin1: 22, fin2: 16, hd1: 6 },
  },
};

const DEFAULT_CONSTRAINTS = {
  targetMaxPrice: 0,
  targetMinArea: 0,
  targetMinWidth: 0,
  renovationDeductionPerPing: 5,
};

const DEFAULT_MORTGAGE_PARAMS = {
  loanToValuePercent: 70,
  annualInterestRatePercent: 2.3,
  loanTerms: [20, 30, 40],
  primaryTermYears: 30,
  gracePeriodYears: 0,
  loanBaseMode: 'lowerOfAskingAndMarket',
  maxLoanAmount: 0,
  transactionCostPercent: 3,
  monthlyPaymentLimit: 0,
  manualLoanBasePrice: 0,
};

const LOAN_BASE_MODES = [
  { value: 'lowerOfAskingAndMarket', label: '開價與市場估值取低' },
  { value: 'askingPrice', label: '賣家開價' },
  { value: 'actualTransaction', label: '實登總價' },
  { value: 'marketValuation', label: '市場估值價' },
  { value: 'manual', label: '手動核貸價' },
];

function normalizeMortgageParams(params = {}, fallback = DEFAULT_MORTGAGE_PARAMS) {
  const allowedModes = new Set(LOAN_BASE_MODES.map((mode) => mode.value));
  const next = { ...fallback, ...params };
  next.loanTerms = parseLoanTerms(next.loanTerms, fallback.loanTerms);
  next.primaryTermYears = parseLoanTerms([next.primaryTermYears], [fallback.primaryTermYears])[0] || fallback.primaryTermYears;
  next.loanBaseMode = allowedModes.has(next.loanBaseMode) ? next.loanBaseMode : DEFAULT_MORTGAGE_PARAMS.loanBaseMode;
  next.loanToValuePercent = clampNumber(next.loanToValuePercent, 0, 100, fallback.loanToValuePercent);
  next.annualInterestRatePercent = clampNumber(next.annualInterestRatePercent, 0, 100, fallback.annualInterestRatePercent);
  next.gracePeriodYears = clampNumber(next.gracePeriodYears, 0, 50, fallback.gracePeriodYears);
  next.maxLoanAmount = clampNumber(next.maxLoanAmount, 0, Number.MAX_SAFE_INTEGER, fallback.maxLoanAmount);
  next.transactionCostPercent = clampNumber(next.transactionCostPercent, 0, 100, fallback.transactionCostPercent);
  next.monthlyPaymentLimit = clampNumber(next.monthlyPaymentLimit, 0, Number.MAX_SAFE_INTEGER, fallback.monthlyPaymentLimit);
  next.manualLoanBasePrice = clampNumber(next.manualLoanBasePrice, 0, Number.MAX_SAFE_INTEGER, fallback.manualLoanBasePrice);
  return next;
}

const DEFAULT_RAW_DATA = RAW_FIELDS.reduce((acc, field) => {
  if (field.type === 'number') acc[field.key] = 0;
  else if (field.type === 'booleanText') acc[field.key] = '否';
  else if (field.type === 'select') acc[field.key] = field.options[0] ?? '';
  else acc[field.key] = '';
  return acc;
}, {});

const DEFAULT_SCORES = SCORE_FIELDS.reduce((acc, field) => {
  acc[field.key] = 5;
  return acc;
}, {});

const DEFAULT_DISTANCES = DEFAULT_DISTANCE_TARGETS.reduce((acc, target) => {
  acc[target.id] = 0;
  return acc;
}, {});

function clampNumber(value, min, max, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeBooleanText(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (['是', 'yes', 'true', '1', 'y'].includes(text)) return '是';
  return '否';
}

function parseLoanTerms(value, fallback = DEFAULT_MORTGAGE_PARAMS.loanTerms) {
  const source = Array.isArray(value) ? value : String(value ?? '').split(/[,\s;/、，]+/);
  const terms = source
    .map((item) => Math.round(clampNumber(item, 1, 50, 0)))
    .filter((item) => item > 0);
  const unique = Array.from(new Set(terms)).slice(0, 5);
  return unique.length ? unique : fallback;
}

function amortizedMonthlyPayment(loanAmount, annualRatePercent, years) {
  const amount = clampNumber(loanAmount, 0, Number.MAX_SAFE_INTEGER);
  const termMonths = Math.max(1, Math.round(clampNumber(years, 1, 50) * 12));
  const monthlyRate = clampNumber(annualRatePercent, 0, 100) / 100 / 12;
  if (amount <= 0) return 0;
  if (monthlyRate === 0) return amount / termMonths;
  const factor = (1 + monthlyRate) ** termMonths;
  return (amount * monthlyRate * factor) / (factor - 1);
}

function mortgageStatus(monthlyPayment, monthlyLimit) {
  const limit = clampNumber(monthlyLimit, 0, Number.MAX_SAFE_INTEGER);
  if (limit <= 0) return '未檢核';
  if (monthlyPayment > limit) return '超標';
  if (monthlyPayment > limit * 0.9) return '接近上限';
  return '可負擔';
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(rows, filename) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

function findCell(record, labels) {
  for (const label of labels) {
    if (Object.prototype.hasOwnProperty.call(record, label)) return record[label];
  }
  return undefined;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '0.00';
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function routeUrl(origin, destination) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

function mapSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function photoList(rawData = {}) {
  const urls = [
    rawData.coverPhotoUrl,
    ...String(rawData.photoUrls ?? '')
      .split(/[;\n]/)
      .map((url) => url.trim()),
  ].filter(Boolean);
  return Array.from(new Set(urls));
}

function createProperty(index = 1) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: `候選物件 ${index}`,
    rawData: { ...DEFAULT_RAW_DATA },
    distances: { ...DEFAULT_DISTANCES },
    scores: { ...DEFAULT_SCORES },
  };
}

const initialProperties = [
  {
    ...createProperty(1),
    name: '物件A：高鐵站前新建案',
    rawData: {
      ...DEFAULT_RAW_DATA,
      buildingName: '青埔展示旗艦店',
      address: '桃園市中壢區高鐵北路一段',
      district: '中壢區',
      businessZone: '高鐵桃園站',
      totalPrice: 3200,
      buildArea: 45,
      firstFloorArea: 28,
      attachedArea: 3,
      sharedArea: 8,
      parkingCount: 1,
      hasMezzanine: '是',
      frontageWidth: 7,
      ceilingHeight: 4.8,
      isMainRoad: '是',
      firstFloorLight: '佳',
      actualTransactionTotalPrice: 3000,
      actualTransactionParkingPrice: 200,
      lastHistoricalPrice: 62,
      historicalDate: '2026-05',
      marketSampleCount1Y: 8,
      averageUnitPrice1Y: 63,
      medianUnitPrice1Y: 61,
      maxUnitPriceHistorical: 78,
      minUnitPriceHistorical: 45,
      averageUnitPriceHistorical: 58,
      latestTransactionDate: '2026-05',
    },
    distances: { target1: 650, target2: 1100, target3: 120, target4: 0 },
    scores: { loc1: 8, loc2: 8, fac1: 7, fac2: 8, spc1: 9, spc2: 7, fin1: 6, fin2: 6, hd1: 5 },
  },
  {
    ...createProperty(2),
    name: '物件B：藝文特區展示店',
    rawData: {
      ...DEFAULT_RAW_DATA,
      buildingName: '藝文門市',
      address: '桃園市桃園區中正路',
      district: '桃園區',
      businessZone: '藝文特區',
      totalPrice: 2800,
      buildArea: 38,
      firstFloorArea: 24,
      attachedArea: 2,
      sharedArea: 7,
      frontageWidth: 6,
      ceilingHeight: 3.6,
      firstFloorLight: '佳',
      actualTransactionTotalPrice: 0,
      actualTransactionParkingPrice: 0,
      lastHistoricalPrice: 58,
      historicalDate: '2026-04',
      marketSampleCount1Y: 4,
      averageUnitPrice1Y: 59,
      medianUnitPrice1Y: 0,
      maxUnitPriceHistorical: 72,
      minUnitPriceHistorical: 41,
      averageUnitPriceHistorical: 55,
      latestTransactionDate: '2026-04',
    },
    distances: { target1: 7800, target2: 900, target3: 200, target4: 0 },
    scores: { loc1: 9, loc2: 6, fac1: 9, fac2: 7, spc1: 5, spc2: 8, fin1: 7, fin2: 7, hd1: 6 },
  },
];

function calculateDerived(rawData, scores = DEFAULT_SCORES, constraints = DEFAULT_CONSTRAINTS, mortgageParams = DEFAULT_MORTGAGE_PARAMS) {
  const totalPrice = clampNumber(rawData.totalPrice, 0, Number.MAX_SAFE_INTEGER);
  const buildArea = clampNumber(rawData.buildArea, 0, Number.MAX_SAFE_INTEGER);
  const firstFloorArea = clampNumber(rawData.firstFloorArea, 0, Number.MAX_SAFE_INTEGER);
  const attachedArea = clampNumber(rawData.attachedArea, 0, Number.MAX_SAFE_INTEGER);
  const mezzanineArea = clampNumber(rawData.mezzanineArea, 0, Number.MAX_SAFE_INTEGER);
  const sharedArea = clampNumber(rawData.sharedArea, 0, Number.MAX_SAFE_INTEGER);
  const parkingCount = clampNumber(rawData.parkingCount, 0, Number.MAX_SAFE_INTEGER);
  const parkingArea = clampNumber(rawData.parkingArea, 0, Number.MAX_SAFE_INTEGER);
  const inputParkingPrice = clampNumber(rawData.parkingPrice, 0, Number.MAX_SAFE_INTEGER);
  const parkingPrice = parkingCount > 0 && inputParkingPrice === 0 ? 200 : inputParkingPrice;
  const netPrice = Math.max(0, totalPrice - parkingPrice);
  const actualTransactionTotalPrice = clampNumber(rawData.actualTransactionTotalPrice, 0, Number.MAX_SAFE_INTEGER);
  const actualTransactionParkingPrice = clampNumber(rawData.actualTransactionParkingPrice, 0, Number.MAX_SAFE_INTEGER);
  const actualTransactionBuildingPrice = Math.max(0, actualTransactionTotalPrice - actualTransactionParkingPrice);
  const buildingAreaWithoutParking = Math.max(0, buildArea - parkingArea);
  const comparableBuildingArea = buildingAreaWithoutParking > 0 ? buildingAreaWithoutParking : buildArea;
  const hasMezzanine = normalizeBooleanText(rawData.hasMezzanine) === '是';
  const expandableArea = firstFloorArea * (hasMezzanine ? 2 : 1) + attachedArea + sharedArea;
  const coreArea = hasMezzanine ? firstFloorArea * 2 : firstFloorArea;
  const grossUnitPrice = buildArea > 0 ? totalPrice / buildArea : 0;
  const buildingUnitPrice = comparableBuildingArea > 0 ? netPrice / comparableBuildingArea : 0;
  const expandableEfficiencyUnitPrice = expandableArea > 0 ? netPrice / expandableArea : 0;
  const coreEfficiencyUnitPrice = coreArea > 0 ? netPrice / coreArea : 0;
  const actualTransactionGrossUnitPrice = buildArea > 0 ? actualTransactionTotalPrice / buildArea : 0;
  const actualTransactionBuildingUnitPrice = comparableBuildingArea > 0 ? actualTransactionBuildingPrice / comparableBuildingArea : 0;
  const actualTransactionExpandableEfficiencyUnitPrice = expandableArea > 0 ? actualTransactionBuildingPrice / expandableArea : 0;
  const actualTransactionCoreEfficiencyUnitPrice = coreArea > 0 ? actualTransactionBuildingPrice / coreArea : 0;
  const marketSampleCount1Y = clampNumber(rawData.marketSampleCount1Y, 0, Number.MAX_SAFE_INTEGER);
  const medianUnitPrice1Y = clampNumber(rawData.medianUnitPrice1Y, 0, Number.MAX_SAFE_INTEGER);
  const averageUnitPrice1Y = clampNumber(rawData.averageUnitPrice1Y, 0, Number.MAX_SAFE_INTEGER);
  const averageUnitPriceHistorical = clampNumber(rawData.averageUnitPriceHistorical, 0, Number.MAX_SAFE_INTEGER);
  const manualHistoricalPrice = clampNumber(rawData.lastHistoricalPrice, 0, Number.MAX_SAFE_INTEGER);
  let marketBaseUnitPrice = buildingUnitPrice * 0.85;
  let marketBaseSource = '開價折讓推估';
  if (medianUnitPrice1Y > 0 && marketSampleCount1Y >= 5) {
    marketBaseUnitPrice = medianUnitPrice1Y;
    marketBaseSource = '近一年中位單價';
  } else if (averageUnitPrice1Y > 0 && marketSampleCount1Y >= 3) {
    marketBaseUnitPrice = averageUnitPrice1Y;
    marketBaseSource = '近一年平均單價';
  } else if (actualTransactionBuildingUnitPrice > 0) {
    marketBaseUnitPrice = actualTransactionBuildingUnitPrice;
    marketBaseSource = '實登建物扣車位單價';
  } else if (averageUnitPriceHistorical > 0) {
    marketBaseUnitPrice = averageUnitPriceHistorical;
    marketBaseSource = '歷史平均單價';
  } else if (manualHistoricalPrice > 0) {
    marketBaseUnitPrice = manualHistoricalPrice;
    marketBaseSource = '手動周邊實登均價';
  }
  const effectiveArea = expandableArea;
  const frontageWidth = clampNumber(rawData.frontageWidth, 0, Number.MAX_SAFE_INTEGER);
  const age = clampNumber(rawData.age, 0, Number.MAX_SAFE_INTEGER);
  const cornerPremium = normalizeBooleanText(rawData.isCornerLot) === '是' ? 0.05 : 0;
  const frontagePremium = frontageWidth >= 8 ? 0.05 : frontageWidth >= 6 ? 0.03 : 0;
  const mezzaninePremium = hasMezzanine ? 0.03 : 0;
  const mainRoadPremium = normalizeBooleanText(rawData.isMainRoad) === '是' ? 0.03 : 0;
  const lightPremium = rawData.firstFloorLight === '佳' ? 0.02 : 0;
  const ageDiscount = age > 30 ? 0.08 : age > 20 ? 0.03 : 0;
  const layoutDiscount = normalizeBooleanText(rawData.isSquare) === '否' ? 0.04 : 0;
  const conditionFactor = Math.max(
    0.75,
    1 + cornerPremium + frontagePremium + mezzaninePremium + mainRoadPremium + lightPremium - ageDiscount - layoutDiscount,
  );
  const premiumRate = Math.max(0, cornerPremium + frontagePremium + mezzaninePremium + mainRoadPremium + lightPremium);
  const hardwareDeduction =
    clampNumber(scores.hd1, 0, 10) < 5
      ? buildArea * clampNumber(constraints.renovationDeductionPerPing, 0, Number.MAX_SAFE_INTEGER)
      : 0;
  const parkingAdjustment = parkingCount > 0 ? parkingPrice : 0;
  const marketValuationPrice = Math.max(0, marketBaseUnitPrice * comparableBuildingArea * conditionFactor + parkingAdjustment - hardwareDeduction);
  const anchorPrice = Math.max(0, marketValuationPrice * 0.9);
  const maxChaseMultiplier = premiumRate >= 0.08 ? 1.05 : 1.03;
  const maxChasePrice = Math.max(0, marketValuationPrice * maxChaseMultiplier);
  const marketGapPercent = marketValuationPrice > 0 ? ((totalPrice - marketValuationPrice) / marketValuationPrice) * 100 : 0;
  const priceReferenceTotal = actualTransactionTotalPrice > 0 ? actualTransactionTotalPrice : marketValuationPrice;
  const priceReferenceSource = actualTransactionTotalPrice > 0 ? '實登總價' : '市場估值';
  const askingReferenceGapPercent = priceReferenceTotal > 0 ? ((totalPrice - priceReferenceTotal) / priceReferenceTotal) * 100 : 0;
  const loanTerms = parseLoanTerms(mortgageParams.loanTerms);
  const loanToValuePercent = clampNumber(mortgageParams.loanToValuePercent, 0, 100);
  const annualInterestRatePercent = clampNumber(mortgageParams.annualInterestRatePercent, 0, 100);
  const maxLoanAmount = clampNumber(mortgageParams.maxLoanAmount, 0, Number.MAX_SAFE_INTEGER);
  const transactionCostPercent = clampNumber(mortgageParams.transactionCostPercent, 0, 100);
  const monthlyPaymentLimit = clampNumber(mortgageParams.monthlyPaymentLimit, 0, Number.MAX_SAFE_INTEGER);
  const manualLoanBasePrice = clampNumber(mortgageParams.manualLoanBasePrice, 0, Number.MAX_SAFE_INTEGER);
  const gracePeriodYears = clampNumber(mortgageParams.gracePeriodYears, 0, 50);
  let loanBasePrice = Math.min(totalPrice || marketValuationPrice, marketValuationPrice || totalPrice);
  let loanBaseSource = '開價與市場估值取低';
  if (mortgageParams.loanBaseMode === 'askingPrice') {
    loanBasePrice = totalPrice;
    loanBaseSource = '賣家開價';
  } else if (mortgageParams.loanBaseMode === 'actualTransaction') {
    loanBasePrice = actualTransactionTotalPrice > 0 ? actualTransactionTotalPrice : loanBasePrice;
    loanBaseSource = actualTransactionTotalPrice > 0 ? '實登總價' : '開價與市場估值取低';
  } else if (mortgageParams.loanBaseMode === 'marketValuation') {
    loanBasePrice = marketValuationPrice;
    loanBaseSource = '市場估值價';
  } else if (mortgageParams.loanBaseMode === 'manual' && manualLoanBasePrice > 0) {
    loanBasePrice = manualLoanBasePrice;
    loanBaseSource = '手動核貸價';
  }
  const loanAmountByRatio = loanBasePrice * (loanToValuePercent / 100);
  const loanAmount = maxLoanAmount > 0 ? Math.min(loanAmountByRatio, maxLoanAmount) : loanAmountByRatio;
  const downPayment = Math.max(0, totalPrice - loanAmount);
  const transactionCost = totalPrice * (transactionCostPercent / 100);
  const initialCashNeeded = downPayment + transactionCost;
  const graceMonthlyPayment = loanAmount * (annualInterestRatePercent / 100 / 12);
  const monthlyPayments = Object.fromEntries(
    loanTerms.map((term) => [term, amortizedMonthlyPayment(loanAmount, annualInterestRatePercent, term)]),
  );
  const primaryTermYears = parseLoanTerms([mortgageParams.primaryTermYears], [30])[0] || 30;
  const primaryMonthlyPayment = monthlyPayments[primaryTermYears] ?? amortizedMonthlyPayment(loanAmount, annualInterestRatePercent, primaryTermYears);
  const affordabilityStatus = mortgageStatus(primaryMonthlyPayment, monthlyPaymentLimit);
  const loanGap = Math.max(0, totalPrice - loanBasePrice);

  return {
    parkingPriceApplied: parkingPrice,
    actualTransactionTotalPrice,
    actualTransactionParkingPrice,
    actualTransactionBuildingPrice,
    actualTransactionGrossUnitPrice,
    actualTransactionBuildingUnitPrice,
    actualTransactionExpandableEfficiencyUnitPrice,
    actualTransactionCoreEfficiencyUnitPrice,
    grossUnitPrice,
    buildingUnitPrice,
    expandableEfficiencyUnitPrice,
    coreEfficiencyUnitPrice,
    comparableBuildingArea,
    expandableArea,
    deedUnitPrice: buildingUnitPrice,
    registeredUnitPrice: expandableEfficiencyUnitPrice,
    actualTransactionDeedUnitPrice: actualTransactionBuildingUnitPrice,
    actualTransactionRegisteredUnitPrice: actualTransactionExpandableEfficiencyUnitPrice,
    marketBaseUnitPrice,
    marketBaseSource,
    effectiveArea,
    conditionFactor,
    hardwareDeduction,
    parkingAdjustment,
    premiumRate,
    marketValuationPrice,
    anchorPrice,
    suggestedBuyingPrice: anchorPrice,
    maxChasePrice,
    maxChaseMultiplier,
    marketGapPercent,
    priceReferenceTotal,
    priceReferenceSource,
    askingReferenceGapPercent,
    mortgage: {
      loanBasePrice,
      loanBaseSource,
      loanAmount,
      downPayment,
      transactionCost,
      initialCashNeeded,
      monthlyPayments,
      primaryTermYears,
      primaryMonthlyPayment,
      affordabilityStatus,
      loanGap,
      gracePeriodYears,
      graceMonthlyPayment,
      loanToValuePercent,
      annualInterestRatePercent,
      loanTerms,
      monthlyPaymentLimit,
    },
  };
}

function calculateWeighted(property, weights, totalWeight) {
  const safeTotal = totalWeight > 0 ? totalWeight : 1;
  let weightedScore = 0;
  const groups = Object.fromEntries(Object.keys(GROUPS).map((group) => [group, 0]));

  for (const field of SCORE_FIELDS) {
    const normalizedWeight = (clampNumber(weights[field.key], 0, 50) / safeTotal) * 100;
    const contribution = (clampNumber(property.scores[field.key], 0, 10) / 10) * normalizedWeight;
    weightedScore += contribution;
    groups[field.group] += contribution;
  }

  return { weightedScore, groups };
}

function getConstraintIssues(rawData, constraints) {
  const issues = [];
  const maxPrice = clampNumber(constraints.targetMaxPrice, 0, Number.MAX_SAFE_INTEGER);
  const minArea = clampNumber(constraints.targetMinArea, 0, Number.MAX_SAFE_INTEGER);
  const minWidth = clampNumber(constraints.targetMinWidth, 0, Number.MAX_SAFE_INTEGER);

  if (maxPrice > 0 && clampNumber(rawData.totalPrice, 0, Number.MAX_SAFE_INTEGER) > maxPrice) issues.push('預算超標');
  if (minArea > 0 && clampNumber(rawData.buildArea, 0, Number.MAX_SAFE_INTEGER) < minArea) issues.push('坪數不足');
  if (minWidth > 0 && clampNumber(rawData.frontageWidth, 0, Number.MAX_SAFE_INTEGER) < minWidth) issues.push('面寬不足');
  return issues;
}

function buildCsvColumns(distanceTargets) {
  return [
    { key: 'id', label: 'id', description: '唯一識別碼；缺漏時自動產生 timestamp。' },
    { key: 'name', label: '物件名稱', description: '顯示於排行榜與卡片標題；空白時以未命名物件補值。' },
    ...RAW_FIELDS.map((field) => ({
      key: `rawData.${field.key}`,
      label: field.label,
      description: field.type === 'number' ? '數字欄位；空白或無法解析時視為 0。' : '文字/選項欄位；空白時使用安全預設值。',
    })),
    ...Array.from({ length: MAX_DISTANCE_TARGETS }, (_, index) => {
      const order = index + 1;
      return {
        key: `distances.target${order}`,
        label: `距離-${distanceTargets[index]?.name || `目標${order}`}(公尺)`,
        description: '物件到全域距離目標的人工記錄距離；缺漏時為 0。',
      };
    }),
    ...SCORE_FIELDS.map((field) => ({
      key: `scores.${field.key}`,
      label: `評分-${field.label}`,
      description: '0-10 整數；缺漏、空白或超出範圍會自動限制到 0-10。',
    })),
    { key: 'weightedScore', label: '加權總分', description: '匯出計算值；匯入時忽略，以目前權重重新計算。' },
    { key: 'actualTransactionBuildingPrice', label: '實登建物價格', description: '實登總價扣除實登車位價格後的建物價格；匯入時忽略。' },
    { key: 'actualTransactionGrossUnitPrice', label: '實登總價全坪單價', description: '以實登總價除以建坪；匯入時忽略。' },
    { key: 'actualTransactionBuildingUnitPrice', label: '實登建物扣車位單價', description: '以實登建物價格除以建坪扣車位坪數；匯入時忽略。' },
    { key: 'actualTransactionExpandableEfficiencyUnitPrice', label: '實登可擴充使用坪效單價', description: '以實登建物價格除以可擴充使用面積；匯入時忽略。' },
    { key: 'actualTransactionCoreEfficiencyUnitPrice', label: '實登核心坪效單價', description: '以實登建物價格除以核心坪效面積；匯入時忽略。' },
    { key: 'grossUnitPrice', label: '總價全坪單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'buildingUnitPrice', label: '建物扣車位單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'expandableEfficiencyUnitPrice', label: '可擴充使用坪效單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'coreEfficiencyUnitPrice', label: '核心坪效單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'marketValuationPrice', label: '市場估值價', description: '匯出計算值；匯入時忽略。' },
    { key: 'suggestedBuyingPrice', label: '建議下錨價', description: '匯出計算值；匯入時忽略。' },
    { key: 'maxChasePrice', label: '最高追價', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.loanBasePrice', label: '貸款基準價', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.loanAmount', label: '可貸金額', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.downPayment', label: '自備款', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.transactionCost', label: '交易成本', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.initialCashNeeded', label: '初期現金需求', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.primaryMonthlyPayment', label: '主要年期月付', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.affordabilityStatus', label: '月付壓力', description: '匯出計算值；匯入時忽略。' },
    { key: 'mortgage.loanGap', label: '貸款缺口', description: '匯出計算值；匯入時忽略。' },
  ];
}

function splitCsvSections(rows) {
  const sections = {};
  let currentSection = null;
  rows.forEach((row) => {
    if (row[0] === CSV_SECTION_MARKER) {
      currentSection = row[1] || '';
      sections[currentSection] = [];
      return;
    }
    if (currentSection) sections[currentSection].push(row);
  });
  return sections;
}

function recordsFromSection(sectionRows) {
  if (!sectionRows || sectionRows.length < 2) return [];
  const headers = sectionRows[0].map((header) => header.trim());
  return sectionRows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, columnIndex) => {
      record[header] = row[columnIndex] ?? '';
    });
    return record;
  });
}

function targetsFromGlobalSection(sectionRows, fallbackTargets) {
  const records = recordsFromSection(sectionRows);
  if (records.length === 0) return fallbackTargets;
  return records
    .map((record, index) => ({
      id: `target${index + 1}`,
      name: String(findCell(record, ['目標名稱', 'name']) ?? '').trim() || `目標${index + 1}`,
      address: String(findCell(record, ['地址/地標', 'address']) ?? '').trim(),
    }))
    .filter((target) => target.name || target.address)
    .slice(0, MAX_DISTANCE_TARGETS);
}

function constraintsFromSection(sectionRows, fallbackConstraints) {
  const records = recordsFromSection(sectionRows);
  if (records.length === 0) return fallbackConstraints;
  const next = { ...fallbackConstraints };
  records.forEach((record) => {
    const key = String(findCell(record, ['參數', 'key']) ?? '').trim();
    const value = findCell(record, ['值', 'value']);
    if (key && Object.prototype.hasOwnProperty.call(next, key)) {
      next[key] = clampNumber(value, 0, Number.MAX_SAFE_INTEGER, next[key]);
    }
  });
  return next;
}

function mortgageParamsFromSection(sectionRows, fallbackParams) {
  const records = recordsFromSection(sectionRows);
  if (records.length === 0) return fallbackParams;
  const next = { ...fallbackParams };
  records.forEach((record) => {
    const key = String(findCell(record, ['參數', 'key']) ?? '').trim();
    const value = findCell(record, ['值', 'value']);
    if (!key || !Object.prototype.hasOwnProperty.call(next, key)) return;
    if (key === 'loanBaseMode') next[key] = String(value || next[key]);
    else if (key === 'loanTerms') next[key] = parseLoanTerms(value, next[key]);
    else next[key] = clampNumber(value, 0, Number.MAX_SAFE_INTEGER, next[key]);
  });
  return normalizeMortgageParams(next, fallbackParams);
}

function targetsFromRecords(records, fallbackTargets) {
  const targets = Array.from({ length: MAX_DISTANCE_TARGETS }, (_, index) => {
    const existing = fallbackTargets[index] ?? { id: `target${index + 1}`, name: '', address: '' };
    return { id: `target${index + 1}`, name: existing.name || `目標${index + 1}`, address: existing.address || '' };
  });
  records.forEach((record) => {
    for (let order = 1; order <= MAX_DISTANCE_TARGETS; order += 1) {
      const name = String(findCell(record, [`全域距離目標${order}名稱`, `distanceTargets.${order}.name`]) ?? '').trim();
      const address = String(findCell(record, [`全域距離目標${order}地址`, `distanceTargets.${order}.address`]) ?? '').trim();
      if (name) targets[order - 1].name = name;
      if (address) targets[order - 1].address = address;
    }
  });
  return targets.filter((target) => target.name || target.address).slice(0, MAX_DISTANCE_TARGETS);
}

function propertyFromRecord(record, index) {
  const rawData = { ...DEFAULT_RAW_DATA };
  for (const field of RAW_FIELDS) {
    const value = findCell(record, [field.label, field.key, `rawData.${field.key}`, ...(field.aliases ?? [])]);
    if (field.type === 'number') rawData[field.key] = clampNumber(value, 0, Number.MAX_SAFE_INTEGER, 0);
    else if (field.type === 'booleanText') rawData[field.key] = normalizeBooleanText(value);
    else if (field.type === 'select') rawData[field.key] = field.options.includes(value) ? value : field.options[0];
    else rawData[field.key] = String(value ?? '');
  }

  const scores = { ...DEFAULT_SCORES };
  for (const field of SCORE_FIELDS) {
    const value = findCell(record, [`評分-${field.label}`, field.label, field.key, `scores.${field.key}`]);
    scores[field.key] = Math.round(clampNumber(value, 0, 10, DEFAULT_SCORES[field.key]));
  }

  const distances = {};
  const exportedDistanceLabels = Object.keys(record).filter((key) => key.startsWith('距離-') && key.endsWith('(公尺)'));
  for (let order = 1; order <= MAX_DISTANCE_TARGETS; order += 1) {
    const value = findCell(record, [
      `距離-目標${order}(公尺)`,
      exportedDistanceLabels[order - 1],
      `distances.target${order}`,
      `target${order}Distance`,
    ]);
    distances[`target${order}`] = clampNumber(value, 0, Number.MAX_SAFE_INTEGER, 0);
  }

  const idValue = findCell(record, ['id', 'ID']);
  const id = Number.isFinite(Number(idValue)) ? Number(idValue) : Date.now() + index;
  const name = String(findCell(record, ['物件名稱', 'name']) ?? '').trim() || `匯入物件 ${index + 1}`;
  return { id, name, rawData, distances, scores };
}

function propertyCsvValue(property, column) {
  if (column.key === 'id') return property.id;
  if (column.key === 'name') return property.name;
  if (column.key.startsWith('rawData.')) return property.rawData[column.key.slice(8)] ?? '';
  if (column.key.startsWith('scores.')) return property.scores[column.key.slice(7)] ?? 0;
  if (column.key.startsWith('distances.')) return property.distances?.[column.key.slice(10)] ?? 0;
  if (column.key === 'weightedScore') return formatNumber(property.weightedScore);
  if (column.key.startsWith('mortgage.')) {
    const value = property.derived?.mortgage?.[column.key.slice(9)];
    return typeof value === 'number' ? formatNumber(value) : value ?? '';
  }
  if (column.key in property.derived) return formatNumber(property.derived[column.key]);
  return '';
}

function unitReference(property, transactionKey) {
  const transactionUnitPrice = clampNumber(property.derived?.[transactionKey], 0, Number.MAX_SAFE_INTEGER);
  if (transactionUnitPrice > 0) return { value: transactionUnitPrice, source: '實登換算' };
  return {
    value: clampNumber(property.derived?.marketBaseUnitPrice, 0, Number.MAX_SAFE_INTEGER),
    source: property.derived?.marketBaseSource || '市場基準',
  };
}

const PRIORITY_RAW_ROW_KEYS = new Set([
  'totalPrice',
  'actualTransactionTotalPrice',
  'actualTransactionParkingPrice',
  'lastHistoricalPrice',
  'historicalDate',
  'marketSampleCount1Y',
  'averageUnitPrice1Y',
  'medianUnitPrice1Y',
  'maxUnitPriceHistorical',
  'minUnitPriceHistorical',
  'averageUnitPriceHistorical',
  'latestTransactionDate',
]);

function buildComparisonRows(distanceTargets, weights) {
  return [
    {
      id: 'score.total',
      section: '排序',
      label: '總分',
      description: '依目前策略權重正規化後加總，權重總和即使不是 100 也會按比例換算。',
      kind: 'numeric',
      getNumeric: (property) => property.weightedScore,
      getValue: (property) => formatNumber(property.weightedScore),
      highlight: true,
    },
    {
      id: 'price.askVsMarket',
      section: '價格與行情',
      label: '總價 / 實登或估值',
      meta: '賣家開價 vs 實登總價/市場估值',
      description: '第一行為賣家開價。第二行優先顯示實登總價；若未填實登總價，改顯示市場估值價。第三行為賣家開價相對第二行基準的差異百分比。',
      kind: 'pairedPrice',
      getNumeric: (property) => property.derived.askingReferenceGapPercent,
      getValue: (property) => `${formatNumber(property.rawData.totalPrice)} / ${formatNumber(property.derived.priceReferenceTotal)} / ${formatNumber(property.derived.askingReferenceGapPercent)}%`,
    },
    {
      id: 'price.grossUnitVsActual',
      section: '價格與行情',
      label: '總價全坪單價 / 實登',
      meta: '萬/坪',
      description: '第一行為總價全坪單價：總價 / 建坪。第二行優先顯示實登總價 / 建坪。此為屋主刊登或粗略行情常見的含車位全算單價。',
      kind: 'pairedPrice',
      getNumeric: (property) =>
        property.derived.actualTransactionGrossUnitPrice > 0
          ? ((property.derived.grossUnitPrice - property.derived.actualTransactionGrossUnitPrice) / property.derived.actualTransactionGrossUnitPrice) * 100
          : property.derived.grossUnitPrice,
      getValue: (property) => `${formatNumber(property.derived.grossUnitPrice)} / ${formatNumber(property.derived.actualTransactionGrossUnitPrice)}`,
    },
    { id: 'market.medianUnitPrice1Y', section: '價格與行情', label: '近一年中位單價', meta: '萬/坪', description: '使用者查詢後手動填入的近一年成交中位單價。樣本數 >= 5 時，專家估值會優先採用此值作市場基礎單價。', kind: 'numeric', getNumeric: (property) => property.rawData.medianUnitPrice1Y, getValue: (property) => formatNumber(property.rawData.medianUnitPrice1Y) },
    { id: 'market.averageUnitPrice1Y', section: '價格與行情', label: '近一年平均單價', meta: '萬/坪', description: '使用者查詢後手動填入的近一年成交平均單價。無可靠中位數且樣本數 >= 3 時，專家估值採用此值。', kind: 'numeric', getNumeric: (property) => property.rawData.averageUnitPrice1Y, getValue: (property) => formatNumber(property.rawData.averageUnitPrice1Y) },
    { id: 'market.averageHistorical', section: '價格與行情', label: '歷史平均單價', meta: '萬/坪', description: '使用者手動填入的區域或相似物件歷史平均單價，當近一年樣本不足時作為市場基礎單價候選。', kind: 'numeric', getNumeric: (property) => property.rawData.averageUnitPriceHistorical, getValue: (property) => formatNumber(property.rawData.averageUnitPriceHistorical) },
    { id: 'market.lastHistoricalPrice', section: '價格與行情', label: '周邊實登均價', meta: '萬/坪', description: '使用者手動填入的周邊實價登錄參考均價。此欄是區域行情單價，不是單一交易總價。', kind: 'numeric', getNumeric: (property) => property.rawData.lastHistoricalPrice, getValue: (property) => formatNumber(property.rawData.lastHistoricalPrice) },
    {
      id: 'price.deedUnitVsMarket',
      section: '價格與行情',
      label: '建物扣車位單價 / 實登基準',
      meta: '萬/坪',
      description: '第一行為賣方建物扣車位單價：(總價 - 計算用車位價格) / (建坪 - 車位坪數)。這是最適合對照周邊歷史最高、最低、平均單價的市場行情基準。',
      kind: 'pairedPrice',
      getNumeric: (property) => {
        const reference = unitReference(property, 'actualTransactionBuildingUnitPrice');
        return reference.value > 0 ? ((property.derived.buildingUnitPrice - reference.value) / reference.value) * 100 : 0;
      },
      getValue: (property) => {
        const reference = unitReference(property, 'actualTransactionBuildingUnitPrice');
        return `${formatNumber(property.derived.buildingUnitPrice)} / ${formatNumber(reference.value)}`;
      },
    },
    {
      id: 'price.registeredUnitVsMarket',
      section: '價格與行情',
      label: '可擴充坪效 / 實登基準',
      meta: '萬/坪',
      description: '第一行為可擴充使用坪效單價：(總價 - 計算用車位價格) / (1F樓板坪數 * 2 + 附屬坪數 + 共有坪數)。若不可夾層，則只算一份 1F；不再加夾層坪數，避免重複計算。',
      kind: 'pairedPrice',
      getNumeric: (property) => {
        const reference = unitReference(property, 'actualTransactionExpandableEfficiencyUnitPrice');
        return reference.value > 0 ? ((property.derived.expandableEfficiencyUnitPrice - reference.value) / reference.value) * 100 : 0;
      },
      getValue: (property) => {
        const reference = unitReference(property, 'actualTransactionExpandableEfficiencyUnitPrice');
        return `${formatNumber(property.derived.expandableEfficiencyUnitPrice)} / ${formatNumber(reference.value)}`;
      },
    },
    {
      id: 'price.coreUnitVsMarket',
      section: '價格與行情',
      label: '核心坪效 / 實登基準',
      meta: '萬/坪',
      description: '第一行為核心坪效單價：(總價 - 計算用車位價格) / 核心坪效面積。核心坪效面積只看 1F 樓板坪數，可夾層時乘以 2，用來衡量真正核心營業面積成本，越低越好。',
      kind: 'pairedPrice',
      getNumeric: (property) => {
        const reference = unitReference(property, 'actualTransactionCoreEfficiencyUnitPrice');
        return reference.value > 0 ? ((property.derived.coreEfficiencyUnitPrice - reference.value) / reference.value) * 100 : 0;
      },
      getValue: (property) => {
        const reference = unitReference(property, 'actualTransactionCoreEfficiencyUnitPrice');
        return `${formatNumber(property.derived.coreEfficiencyUnitPrice)} / ${formatNumber(reference.value)}`;
      },
    },
    { id: 'market.sampleCount1Y', section: '價格與行情', label: '近一年樣本數', description: '近一年相似成交資料筆數。系統用它判斷近一年中位單價或平均單價是否足夠可靠。', kind: 'numeric', getNumeric: (property) => property.rawData.marketSampleCount1Y, getValue: (property) => property.rawData.marketSampleCount1Y || 0 },
    { id: 'market.latestTransactionDate', section: '價格與行情', label: '最近成交年月', description: '使用者查詢實價登錄後手動填入的最近參考成交年月。', kind: 'raw', getValue: (property) => property.rawData.latestTransactionDate || property.rawData.historicalDate || '未填' },
    { id: 'offer.marketValuation', section: '專家出價分析', label: '市場估值價', description: '市場基礎單價 * 建坪 * 店面條件修正係數 + 車位調整 - 硬體扣除。此為分析估值，不是正式鑑價。', kind: 'numeric', getNumeric: (property) => property.derived.marketValuationPrice, getValue: (property) => `${formatNumber(property.derived.marketValuationPrice)} 萬`, highlight: true },
    { id: 'offer.anchor', section: '專家出價分析', label: '建議下錨價', description: '市場估值價 * 0.9，用於議價時的初始下錨參考。', kind: 'numeric', getNumeric: (property) => property.derived.anchorPrice, getValue: (property) => `${formatNumber(property.derived.anchorPrice)} 萬` },
    { id: 'offer.maxChase', section: '專家出價分析', label: '最高追價', description: '市場估值價乘以追價係數。若店面溢價條件較強，係數為 1.05；否則為 1.03。', kind: 'numeric', getNumeric: (property) => property.derived.maxChasePrice, getValue: (property) => `${formatNumber(property.derived.maxChasePrice)} 萬` },
    { id: 'offer.marketGap', section: '專家出價分析', label: '開價偏離市場', description: '(總價 - 市場估值價) / 市場估值價 * 100%。正值表示開價高於系統估值，負值表示低於估值。', kind: 'numeric', getNumeric: (property) => property.derived.marketGapPercent, getValue: (property) => `${formatNumber(property.derived.marketGapPercent)}%` },
    { id: 'mortgage.loanSummary', section: '房貸試算', label: '貸款基準 / 可貸金額', description: '貸款基準價依全域房貸設定取得；可貸金額 = 貸款基準價 * 貸款成數，並受最大貸款金額限制。', kind: 'mortgageLoan', getNumeric: (property) => property.derived.mortgage.loanAmount, getValue: (property) => `${formatNumber(property.derived.mortgage.loanBasePrice)} / ${formatNumber(property.derived.mortgage.loanAmount)}` },
    { id: 'mortgage.cashNeeded', section: '房貸試算', label: '自備款 / 初期現金', description: '自備款 = 賣家開價 - 可貸金額；初期現金需求 = 自備款 + 交易成本。不含裝修預備金。', kind: 'mortgageCash', getNumeric: (property) => property.derived.mortgage.initialCashNeeded, getValue: (property) => `${formatNumber(property.derived.mortgage.downPayment)} / ${formatNumber(property.derived.mortgage.initialCashNeeded)}` },
    { id: 'mortgage.monthlyPayments', section: '房貸試算', label: '月付試算', description: '依全域貸款年期與年利率計算本息平均攤還月付，單位元/月。', kind: 'mortgagePayments', getNumeric: (property) => property.derived.mortgage.primaryMonthlyPayment, getValue: (property) => Object.entries(property.derived.mortgage.monthlyPayments).map(([term, value]) => `${term}年 ${formatNumber(value)}`).join(' / ') },
    { id: 'mortgage.affordability', section: '房貸試算', label: '月付壓力', description: '以主要年期月付對照每月可負擔上限：低於 90% 為可負擔，90%-100% 為接近上限，超過上限為超標。', kind: 'raw', getValue: (property) => `${property.derived.mortgage.primaryTermYears}年：${property.derived.mortgage.affordabilityStatus}` },
    { id: 'mortgage.loanGap', section: '房貸試算', label: '貸款缺口', description: '貸款缺口 = 賣家開價 - 貸款基準價。用來提醒開價高於銀行可能核貸基準所造成的資金壓力。', kind: 'numeric', getNumeric: (property) => property.derived.mortgage.loanGap, getValue: (property) => `${formatNumber(property.derived.mortgage.loanGap)} 萬` },
    { id: 'constraint.issues', section: '門檻檢核', label: '不符條件', description: '依全域期待指標檢查預算上限、最低建坪與最低面寬。符合全部條件時顯示「符合」。', kind: 'raw', getValue: (property) => property.constraintIssues.join('、') || '符合' },
    ...SCORE_FIELDS.map((field) => ({
      id: `score.${field.key}`,
      section: '策略維度綜合評分',
      label: field.label,
      meta: `權重 ${weights[field.key]}%`,
      description: `${field.label} 的主觀評分，0 到 10 分。總分會按目前權重正規化後計入。`,
      kind: 'numeric',
      getNumeric: (property) => property.scores[field.key] ?? 0,
      getValue: (property) => property.scores[field.key] ?? 0,
    })),
    ...distanceTargets.map((target) => ({
      id: `distance.${target.id}`,
      section: '地理位置與環境',
      label: `距離-${target.name || target.id}`,
      meta: target.address || '未設定地址',
      description: `物件到全域距離目標「${target.name || target.id}」的人工記錄距離，單位公尺。目標地址為：${target.address || '未設定'}`,
      kind: 'numeric',
      getNumeric: (property) => property.distances?.[target.id] ?? 0,
      getValue: (property) => `${formatNumber(property.distances?.[target.id] ?? 0)} 公尺`,
    })),
    ...RAW_GROUPS.flatMap((group) =>
      group.fields.filter((field) => !PRIORITY_RAW_ROW_KEYS.has(field.key)).map((field) => ({
        id: `raw.${field.key}`,
        section: group.title,
        label: field.label,
        description: `${field.label}：CSV 或表單輸入的原始客觀資料欄位。`,
        kind: 'raw',
        getNumeric: field.type === 'number' ? (property) => property.rawData[field.key] ?? 0 : undefined,
        getValue: (property) => String(property.rawData[field.key] ?? ''),
      })),
    ),
  ];
}

function orderComparisonRows(rows, rowOrder) {
  if (!rowOrder?.length) return rows;
  const rowMap = new Map(rows.map((row) => [row.id, row]));
  const ordered = rowOrder.map((id) => rowMap.get(id)).filter(Boolean);
  const orderedIds = new Set(ordered.map((row) => row.id));
  return [...ordered, ...rows.filter((row) => !orderedIds.has(row.id))];
}

function visibleComparisonRows(rows, hiddenRowIds) {
  if (!hiddenRowIds?.length) return rows;
  const hidden = new Set(hiddenRowIds);
  return rows.filter((row) => !hidden.has(row.id));
}

function sortComparisonProperties(properties, rows, sortConfig) {
  if (!sortConfig?.rowId) return properties;
  const row = rows.find((item) => item.id === sortConfig.rowId);
  if (!row?.getNumeric) return properties;
  const direction = sortConfig.direction === 'asc' ? 1 : -1;
  return [...properties].sort((a, b) => {
    const aValue = Number(row.getNumeric(a));
    const bValue = Number(row.getNumeric(b));
    const safeA = Number.isFinite(aValue) ? aValue : 0;
    const safeB = Number.isFinite(bValue) ? bValue : 0;
    if (safeA === safeB) return b.weightedScore - a.weightedScore;
    return (safeA - safeB) * direction;
  });
}

function serializeWorkspace(state) {
  return {
    properties: state.properties,
    distanceTargets: state.distanceTargets,
    constraints: state.constraints,
    mortgageParams: state.mortgageParams,
    weights: state.weights,
    hideNonCompliant: state.hideNonCompliant,
    comparisonRowOrder: state.comparisonRowOrder,
    hiddenComparisonRows: state.hiddenComparisonRows,
    pinnedComparisonRows: state.pinnedComparisonRows,
    comparisonSort: state.comparisonSort,
    savedAt: new Date().toISOString(),
  };
}

function normalizeWorkspacePayload(payload = {}) {
  const mortgageParams = normalizeMortgageParams(payload.mortgageParams);
  return {
    properties: Array.isArray(payload.properties) ? payload.properties : initialProperties,
    distanceTargets: Array.isArray(payload.distanceTargets) ? payload.distanceTargets : DEFAULT_DISTANCE_TARGETS,
    constraints: { ...DEFAULT_CONSTRAINTS, ...(payload.constraints ?? {}) },
    mortgageParams,
    weights: { ...PRESETS.balanced.weights, ...(payload.weights ?? {}) },
    hideNonCompliant: Boolean(payload.hideNonCompliant),
    comparisonRowOrder: Array.isArray(payload.comparisonRowOrder) ? payload.comparisonRowOrder : [],
    hiddenComparisonRows: Array.isArray(payload.hiddenComparisonRows) ? payload.hiddenComparisonRows : [],
    pinnedComparisonRows: Array.isArray(payload.pinnedComparisonRows) ? payload.pinnedComparisonRows : [],
    comparisonSort: payload.comparisonSort?.rowId ? payload.comparisonSort : { rowId: '', direction: 'desc' },
  };
}

function firebaseErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/configuration-not-found') {
    return 'Firebase Authentication 尚未啟用。請到 Firebase Console > Authentication > Sign-in method 啟用 Google 或 Email/Password。';
  }
  if (code === 'auth/unauthorized-domain') {
    const host = window.location.hostname || '目前網域';
    const localNote = host === '127.0.0.1' || host === 'localhost' ? '本機測試也可同時加入 127.0.0.1 與 localhost。' : '本機測試另可加入 127.0.0.1 與 localhost。';
    return `目前網域未授權。請到 Firebase Authentication > Settings > Authorized domains 加入 ${host}。${localNote}`;
  }
  if (code === 'auth/popup-closed-by-user') return '登入視窗已關閉，尚未完成登入。';
  if (code === 'auth/invalid-email') return 'Email 格式不正確。';
  if (code === 'auth/missing-password') return '請輸入密碼。';
  if (code === 'auth/weak-password') return '密碼強度不足，至少需要 6 個字元。';
  if (code === 'auth/email-already-in-use') return '此 Email 已註冊，請改用登入。';
  if (code === 'auth/invalid-credential') return '帳號或密碼不正確，或此登入方式尚未啟用。';
  return error?.message || 'Firebase 操作失敗。';
}

export default function App() {
  const [weights, setWeights] = useState(PRESETS.balanced.weights);
  const [properties, setProperties] = useState(initialProperties);
  const [distanceTargets, setDistanceTargets] = useState(DEFAULT_DISTANCE_TARGETS);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [mortgageParams, setMortgageParams] = useState(DEFAULT_MORTGAGE_PARAMS);
  const [hideNonCompliant, setHideNonCompliant] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [activePage, setActivePage] = useState('manage');
  const [comparisonRowOrder, setComparisonRowOrder] = useState([]);
  const [hiddenComparisonRows, setHiddenComparisonRows] = useState([]);
  const [pinnedComparisonRows, setPinnedComparisonRows] = useState([]);
  const [comparisonSort, setComparisonSort] = useState({ rowId: '', direction: 'desc' });
  const [photoViewer, setPhotoViewer] = useState(null);
  const [user, setUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [activeDatasetId, setActiveDatasetId] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const fileInputRef = useRef(null);

  const csvColumns = useMemo(() => buildCsvColumns(distanceTargets), [distanceTargets]);
  const totalWeight = useMemo(
    () => SCORE_FIELDS.reduce((sum, field) => sum + clampNumber(weights[field.key], 0, 50), 0),
    [weights],
  );
  const calculatedProperties = useMemo(() => {
    const calculated = properties
      .map((property) => {
        const derived = calculateDerived(property.rawData, property.scores, constraints, mortgageParams);
        const weighted = calculateWeighted(property, weights, totalWeight);
        const constraintIssues = getConstraintIssues(property.rawData, constraints);
        return { ...property, derived, ...weighted, constraintIssues };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore);
    return hideNonCompliant ? calculated.filter((property) => property.constraintIssues.length === 0) : calculated;
  }, [constraints, hideNonCompliant, mortgageParams, properties, weights, totalWeight]);

  useEffect(() => listenAuth(setUser), []);

  useEffect(() => {
    if (!user) {
      setDatasets([]);
      setActiveDatasetId('');
      return;
    }
    refreshDatasets(user.uid, true);
  }, [user]);

  async function refreshDatasets(uid = user?.uid, autoLoadLatest = false) {
    if (!uid || !firebaseReady) return;
    try {
      const items = await listDatasets(uid);
      setDatasets(items);
      if (autoLoadLatest && items.length > 0) {
        const dataset = await loadDataset(uid, items[0].id);
        applyWorkspacePayload(dataset.payload);
        setActiveDatasetId(dataset.id);
        setDatasetName(dataset.name || '');
        setCloudMessage(`已自動讀取最近資料「${dataset.name || '未命名資料'}」。`);
      }
    } catch (error) {
      setCloudMessage(firebaseErrorMessage(error));
    }
  }

  function applyWorkspacePayload(payload) {
    const normalized = normalizeWorkspacePayload(payload);
    setProperties(normalized.properties);
    setDistanceTargets(normalized.distanceTargets);
    setConstraints(normalized.constraints);
    setMortgageParams(normalized.mortgageParams);
    setWeights(normalized.weights);
    setHideNonCompliant(normalized.hideNonCompliant);
    setComparisonRowOrder(normalized.comparisonRowOrder);
    setHiddenComparisonRows(normalized.hiddenComparisonRows);
    setPinnedComparisonRows(normalized.pinnedComparisonRows);
    setComparisonSort(normalized.comparisonSort);
  }

  function currentWorkspacePayload() {
    return serializeWorkspace({
      properties,
      distanceTargets,
      constraints,
      mortgageParams,
      weights,
      hideNonCompliant,
      comparisonRowOrder,
      hiddenComparisonRows,
      pinnedComparisonRows,
      comparisonSort,
    });
  }

  async function handleSaveDataset() {
    if (!user) {
      setCloudMessage('請先登入後再儲存資料。');
      return;
    }
    setCloudBusy(true);
    try {
      const id = await saveDataset(user.uid, datasetName || activeDatasetId || '未命名評估資料', currentWorkspacePayload(), activeDatasetId);
      setActiveDatasetId(id);
      setCloudMessage('已儲存目前評估資料。');
      await refreshDatasets(user.uid);
    } catch (error) {
      setCloudMessage(firebaseErrorMessage(error));
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleSaveAsDataset() {
    if (!user) {
      setCloudMessage('請先登入後再另存資料。');
      return;
    }
    setCloudBusy(true);
    try {
      const id = await saveDataset(user.uid, datasetName || `評估資料 ${new Date().toLocaleString('zh-TW')}`, currentWorkspacePayload());
      setActiveDatasetId(id);
      setCloudMessage('已另存為新的評估資料。');
      await refreshDatasets(user.uid);
    } catch (error) {
      setCloudMessage(firebaseErrorMessage(error));
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleLoadDataset(datasetId) {
    if (!user || !datasetId) return;
    setCloudBusy(true);
    try {
      const dataset = await loadDataset(user.uid, datasetId);
      applyWorkspacePayload(dataset.payload);
      setActiveDatasetId(dataset.id);
      setDatasetName(dataset.name || '');
      setCloudMessage(`已讀取「${dataset.name || '未命名資料'}」。`);
    } catch (error) {
      setCloudMessage(firebaseErrorMessage(error));
    } finally {
      setCloudBusy(false);
    }
  }

  async function handleDeleteDataset(datasetId) {
    if (!user || !datasetId) return;
    setCloudBusy(true);
    try {
      await removeDataset(user.uid, datasetId);
      if (activeDatasetId === datasetId) setActiveDatasetId('');
      setCloudMessage('已刪除雲端資料。');
      await refreshDatasets(user.uid);
    } catch (error) {
      setCloudMessage(firebaseErrorMessage(error));
    } finally {
      setCloudBusy(false);
    }
  }

  function updateRaw(id, key, value) {
    const field = RAW_FIELDS.find((item) => item.key === key);
    setProperties((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              rawData: {
                ...item.rawData,
                [key]: field?.type === 'number' ? clampNumber(value, 0, Number.MAX_SAFE_INTEGER) : value,
              },
            }
          : item,
      ),
    );
  }

  function updateDistance(id, targetId, value) {
    setProperties((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, distances: { ...item.distances, [targetId]: clampNumber(value, 0, Number.MAX_SAFE_INTEGER) } }
          : item,
      ),
    );
  }

  function updateScore(id, key, value) {
    setProperties((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, scores: { ...item.scores, [key]: Math.round(clampNumber(value, 0, 10)) } }
          : item,
      ),
    );
  }

  function updateName(id, name) {
    setProperties((items) => items.map((item) => (item.id === id ? { ...item, name } : item)));
  }

  function addProperty() {
    const next = createProperty(properties.length + 1);
    next.distances = Object.fromEntries(distanceTargets.map((target) => [target.id, 0]));
    setProperties((items) => [...items, next]);
  }

  function updateDistanceTarget(id, key, value) {
    setDistanceTargets((targets) => targets.map((target) => (target.id === id ? { ...target, [key]: value } : target)));
  }

  function addDistanceTarget() {
    if (distanceTargets.length >= MAX_DISTANCE_TARGETS) return;
    const id = `target${distanceTargets.length + 1}`;
    setDistanceTargets((targets) => [...targets, { id, name: `自訂基準點 ${targets.length + 1}`, address: '' }]);
    setProperties((items) => items.map((item) => ({ ...item, distances: { ...item.distances, [id]: 0 } })));
  }

  function removeDistanceTarget(id) {
    setDistanceTargets((targets) => targets.filter((target) => target.id !== id));
  }

  function exportCsv() {
    const rows = [
      [CSV_SECTION_MARKER, CSV_SECTION_GLOBAL_TARGETS],
      ['目標序號', '目標名稱', '地址/地標'],
      ...distanceTargets.map((target, index) => [index + 1, target.name, target.address]),
      [],
      [CSV_SECTION_MARKER, CSV_SECTION_GLOBAL_CONSTRAINTS],
      ['參數', '值', '單位'],
      ['targetMaxPrice', constraints.targetMaxPrice, '萬'],
      ['targetMinArea', constraints.targetMinArea, '坪'],
      ['targetMinWidth', constraints.targetMinWidth, '米'],
      ['renovationDeductionPerPing', constraints.renovationDeductionPerPing, '萬/坪'],
      [],
      [CSV_SECTION_MARKER, CSV_SECTION_GLOBAL_MORTGAGE],
      ['參數', '值', '單位'],
      ['loanToValuePercent', mortgageParams.loanToValuePercent, '%'],
      ['annualInterestRatePercent', mortgageParams.annualInterestRatePercent, '%'],
      ['loanTerms', mortgageParams.loanTerms.join(','), '年'],
      ['primaryTermYears', mortgageParams.primaryTermYears, '年'],
      ['gracePeriodYears', mortgageParams.gracePeriodYears, '年'],
      ['loanBaseMode', mortgageParams.loanBaseMode, '模式'],
      ['maxLoanAmount', mortgageParams.maxLoanAmount, '萬'],
      ['transactionCostPercent', mortgageParams.transactionCostPercent, '%'],
      ['monthlyPaymentLimit', mortgageParams.monthlyPaymentLimit, '元/月'],
      ['manualLoanBasePrice', mortgageParams.manualLoanBasePrice, '萬'],
      [],
      [CSV_SECTION_MARKER, CSV_SECTION_PROPERTIES],
      csvColumns.map((col) => col.label),
      ...calculatedProperties.map((property) => csvColumns.map((col) => propertyCsvValue(property, col))),
    ];
    downloadCsv(rows, `store-site-evaluation-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function exportComparisonCsv() {
    const rowsForExport = visibleComparisonRows(
      orderComparisonRows(buildComparisonRows(distanceTargets, weights), comparisonRowOrder),
      hiddenComparisonRows,
    );
    const sortedProperties = sortComparisonProperties(calculatedProperties, rowsForExport, comparisonSort);
    const rows = [
      ['項目', ...sortedProperties.map((property, index) => `第 ${index + 1} 名 ${property.name || '未命名物件'}`)],
      ...rowsForExport.map((row) => [
        row.meta ? `${row.label}｜${row.meta}` : `${row.label}｜${row.section}`,
        ...sortedProperties.map((property) => row.getValue(property)),
      ]),
    ];
    downloadCsv(rows, `store-site-ranking-comparison-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function importCsv(file) {
    if (!file) return;
    const text = (await file.text()).replace(/^\uFEFF/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setImportMessage('CSV 沒有可匯入的資料列。');
      return;
    }

    const sections = splitCsvSections(rows);
    const propertyRecords = sections[CSV_SECTION_PROPERTIES]?.length
      ? recordsFromSection(sections[CSV_SECTION_PROPERTIES])
      : recordsFromSection(rows);

    if (propertyRecords.length === 0) {
      setImportMessage('CSV 沒有可解析的物件資料區段。');
      return;
    }

    const importedTargets = sections[CSV_SECTION_GLOBAL_TARGETS]?.length
      ? targetsFromGlobalSection(sections[CSV_SECTION_GLOBAL_TARGETS], distanceTargets)
      : targetsFromRecords(propertyRecords, distanceTargets);
    const importedConstraints = sections[CSV_SECTION_GLOBAL_CONSTRAINTS]?.length
      ? constraintsFromSection(sections[CSV_SECTION_GLOBAL_CONSTRAINTS], constraints)
      : constraints;
    const importedMortgageParams = sections[CSV_SECTION_GLOBAL_MORTGAGE]?.length
      ? mortgageParamsFromSection(sections[CSV_SECTION_GLOBAL_MORTGAGE], mortgageParams)
      : mortgageParams;
    const imported = propertyRecords.map((record, index) => propertyFromRecord(record, index));

    setDistanceTargets(importedTargets);
    setConstraints(importedConstraints);
    setMortgageParams(importedMortgageParams);
    setProperties(imported);
    setImportMessage(`已匯入 ${imported.length} 筆物件，並套用 ${importedTargets.length} 個距離目標與全域門檻。`);
    if (user && firebaseReady) {
      try {
        const name = file.name?.replace(/\.csv$/i, '') || `匯入資料 ${new Date().toLocaleString('zh-TW')}`;
        const id = await saveDataset(
          user.uid,
          name,
          serializeWorkspace({
            properties: imported,
            distanceTargets: importedTargets,
            constraints: importedConstraints,
            mortgageParams: importedMortgageParams,
            weights,
            hideNonCompliant,
            comparisonRowOrder: [],
            hiddenComparisonRows: [],
            pinnedComparisonRows: [],
            comparisonSort,
          }),
        );
        setActiveDatasetId(id);
        setDatasetName(name);
        setCloudMessage(`已將 CSV 匯入內容另存到雲端：「${name}」。`);
        await refreshDatasets(user.uid);
      } catch (error) {
        setCloudMessage(`CSV 已匯入本機，但雲端儲存失敗：${firebaseErrorMessage(error)}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function sectionOpen(id, section) {
    const key = `${id}:${section}`;
    return openSections[key] ?? section === 'raw';
  }

  function toggleSection(id, section) {
    const key = `${id}:${section}`;
    setOpenSections((state) => ({ ...state, [key]: !(state[key] ?? section === 'raw') }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <h1>智慧居家總店選址評估系統</h1>
          <p>先設定共用距離目標與全域門檻，再逐筆比較候選店面。</p>
        </div>
        <div className="top-actions">
          <AuthPanel
            authMessage={authMessage}
            firebaseReady={firebaseReady}
            onAuthMessage={setAuthMessage}
            user={user}
          />
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button className="btn" key={key} type="button" onClick={() => setWeights(preset.weights)}>
              {preset.label}
            </button>
          ))}
          <label className="btn file-btn">
            <FileUp size={17} />
            匯入 CSV
            <input ref={fileInputRef} accept=".csv,text/csv" type="file" onChange={(event) => importCsv(event.target.files?.[0])} />
          </label>
          <button className="btn primary" type="button" onClick={exportCsv}>
            <Download size={17} />
            匯出資料 CSV
          </button>
        </div>
      </header>

      <nav className="page-tabs" aria-label="頁面切換">
        <button className={activePage === 'manage' ? 'active' : ''} type="button" onClick={() => setActivePage('manage')}>
          物件管理
        </button>
        <button className={activePage === 'compare' ? 'active' : ''} type="button" onClick={() => setActivePage('compare')}>
          評比排行
        </button>
      </nav>

      {activePage === 'manage' ? (
        <main className="layout">
          <aside className="left-rail">
            <CloudDatasetPanel
              activeDatasetId={activeDatasetId}
              busy={cloudBusy}
              datasetName={datasetName}
              datasets={datasets}
              firebaseReady={firebaseReady}
              message={cloudMessage}
              onDelete={handleDeleteDataset}
              onLoad={handleLoadDataset}
              onNameChange={setDatasetName}
              onRefresh={() => refreshDatasets()}
              onSave={handleSaveDataset}
              onSaveAs={handleSaveAsDataset}
              user={user}
            />
            <DistanceTargetPanel targets={distanceTargets} onAdd={addDistanceTarget} onRemove={removeDistanceTarget} onUpdate={updateDistanceTarget} />
            <ConstraintPanel
              constraints={constraints}
              hideNonCompliant={hideNonCompliant}
              onHideChange={setHideNonCompliant}
              onUpdate={(key, value) => setConstraints((state) => ({ ...state, [key]: clampNumber(value, 0, Number.MAX_SAFE_INTEGER) }))}
            />
            <MortgagePanel
              params={mortgageParams}
              onUpdate={(key, value) =>
                setMortgageParams((state) => ({
                  ...state,
                  [key]: key === 'loanBaseMode'
                    ? value
                    : key === 'loanTerms'
                      ? parseLoanTerms(value, state.loanTerms)
                      : clampNumber(value, 0, Number.MAX_SAFE_INTEGER),
                }))
              }
            />
            <WeightPanel totalWeight={totalWeight} weights={weights} setWeights={setWeights} />
            <Leaderboard properties={calculatedProperties} />
            <CsvSchemaPanel columns={csvColumns} importMessage={importMessage} />
          </aside>

          <section className="main-col">
            <div className="panel-head">
              <div>
                <h2>候選物件管理</h2>
                <span className="meta">目前顯示 {calculatedProperties.length} 筆；距離目標與門檻由左側全域設定共用。</span>
              </div>
              <button className="btn primary" type="button" onClick={addProperty}>
                <Plus size={17} />
                新增物件
              </button>
            </div>

            {calculatedProperties.map((property) => (
              <PropertyCard
                calculated={property}
                distanceTargets={distanceTargets}
                key={property.id}
                onDelete={() => setDeleteTarget(property)}
                onDistance={updateDistance}
                onName={updateName}
                onRaw={updateRaw}
                onScore={updateScore}
                onOpenPhoto={(index = 0) => setPhotoViewer({ property, index })}
                property={property}
                sectionOpen={sectionOpen}
                toggleSection={toggleSection}
                weights={weights}
              />
            ))}
          </section>
        </main>
      ) : (
        <ComparisonPage
          comparisonRowOrder={comparisonRowOrder}
          comparisonSort={comparisonSort}
          distanceTargets={distanceTargets}
          hiddenRowIds={hiddenComparisonRows}
          onExport={exportComparisonCsv}
          onHiddenRowsChange={setHiddenComparisonRows}
          onPinnedRowsChange={setPinnedComparisonRows}
          onRowOrderChange={setComparisonRowOrder}
          onOpenPhoto={(property, index = 0) => setPhotoViewer({ property, index })}
          onSortChange={setComparisonSort}
          pinnedRowIds={pinnedComparisonRows}
          properties={calculatedProperties}
          totalWeight={totalWeight}
          weights={weights}
        />
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h3 id="delete-title">刪除物件</h3>
            <p>確定要刪除「{deleteTarget.name || '未命名物件'}」？此動作會立即從目前評估表移除。</p>
            <div className="button-row">
              <button
                className="btn danger"
                type="button"
                onClick={() => {
                  setProperties((items) => items.filter((item) => item.id !== deleteTarget.id));
                  setDeleteTarget(null);
                }}
              >
                刪除
              </button>
              <button className="btn ghost" type="button" onClick={() => setDeleteTarget(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {photoViewer && (
        <PhotoViewerModal
          index={photoViewer.index}
          property={photoViewer.property}
          onClose={() => setPhotoViewer(null)}
          onIndexChange={(index) => setPhotoViewer((state) => (state ? { ...state, index } : state))}
        />
      )}
    </div>
  );
}

function ConstraintPanel({ constraints, hideNonCompliant, onHideChange, onUpdate }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>全域期待指標</h2>
      </div>
      <p className="meta">門檻用於硬性篩選；不隱藏時仍會在物件卡片與排行頁顯示標籤。</p>
      <div className="constraint-grid">
        <label className="field compact">
          <span>預算上限(萬)</span>
          <input min="0" type="number" value={constraints.targetMaxPrice} onChange={(event) => onUpdate('targetMaxPrice', event.target.value)} />
        </label>
        <label className="field compact">
          <span>最低建坪</span>
          <input min="0" type="number" value={constraints.targetMinArea} onChange={(event) => onUpdate('targetMinArea', event.target.value)} />
        </label>
        <label className="field compact">
          <span>最低面寬(米)</span>
          <input min="0" type="number" value={constraints.targetMinWidth} onChange={(event) => onUpdate('targetMinWidth', event.target.value)} />
        </label>
        <label className="field compact">
          <span>硬體扣除(萬/坪)</span>
          <input min="0" type="number" value={constraints.renovationDeductionPerPing} onChange={(event) => onUpdate('renovationDeductionPerPing', event.target.value)} />
        </label>
      </div>
      <label className="toggle-row">
        <input checked={hideNonCompliant} type="checkbox" onChange={(event) => onHideChange(event.target.checked)} />
        <span>隱藏不符條件物件</span>
      </label>
    </section>
  );
}

function MortgagePanel({ onUpdate, params }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>全域房貸試算</h2>
      </div>
      <p className="meta">套用到所有物件，用於比較貸款基準、可貸金額、自備款、初期現金與月付壓力。</p>
      <div className="constraint-grid">
        <label className="field compact">
          <span>貸款成數(%)</span>
          <input min="0" max="100" type="number" value={params.loanToValuePercent} onChange={(event) => onUpdate('loanToValuePercent', event.target.value)} />
        </label>
        <label className="field compact">
          <span>年利率(%)</span>
          <input min="0" step="0.01" type="number" value={params.annualInterestRatePercent} onChange={(event) => onUpdate('annualInterestRatePercent', event.target.value)} />
        </label>
        <label className="field compact">
          <span>貸款年期</span>
          <input type="text" value={params.loanTerms.join(',')} onChange={(event) => onUpdate('loanTerms', event.target.value)} />
        </label>
        <label className="field compact">
          <span>壓力判斷年期</span>
          <input min="1" type="number" value={params.primaryTermYears} onChange={(event) => onUpdate('primaryTermYears', event.target.value)} />
        </label>
        <label className="field compact">
          <span>寬限期(年)</span>
          <input min="0" type="number" value={params.gracePeriodYears} onChange={(event) => onUpdate('gracePeriodYears', event.target.value)} />
        </label>
        <label className="field compact">
          <span>交易成本率(%)</span>
          <input min="0" step="0.1" type="number" value={params.transactionCostPercent} onChange={(event) => onUpdate('transactionCostPercent', event.target.value)} />
        </label>
        <label className="field compact">
          <span>最大貸款金額(萬)</span>
          <input min="0" type="number" value={params.maxLoanAmount} onChange={(event) => onUpdate('maxLoanAmount', event.target.value)} />
        </label>
        <label className="field compact">
          <span>每月可負擔上限(元)</span>
          <input min="0" type="number" value={params.monthlyPaymentLimit} onChange={(event) => onUpdate('monthlyPaymentLimit', event.target.value)} />
        </label>
        <label className="field compact wide">
          <span>貸款基準價</span>
          <select value={params.loanBaseMode} onChange={(event) => onUpdate('loanBaseMode', event.target.value)}>
            {LOAN_BASE_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>{mode.label}</option>
            ))}
          </select>
        </label>
        <label className="field compact wide">
          <span>手動核貸價(萬)</span>
          <input min="0" type="number" value={params.manualLoanBasePrice} onChange={(event) => onUpdate('manualLoanBasePrice', event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function DistanceTargetPanel({ targets, onAdd, onRemove, onUpdate }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>全域距離目標</h2>
        <button className="btn icon" disabled={targets.length >= MAX_DISTANCE_TARGETS} title="新增距離目標" type="button" onClick={onAdd}>
          <Plus size={17} />
        </button>
      </div>
      <p className="meta">例如住家、國小、百貨公司或特定商圈，只需設定一次，每個物件會共用這些測距目標。</p>
      <div className="target-list">
        {targets.map((target, index) => (
          <div className="target-row" key={target.id}>
            <span className="target-index">{index + 1}</span>
            <label className="field compact">
              <span>名稱</span>
              <input value={target.name} onChange={(event) => onUpdate(target.id, 'name', event.target.value)} />
            </label>
            <label className="field compact">
              <span>地址/地標</span>
              <input value={target.address} onChange={(event) => onUpdate(target.id, 'address', event.target.value)} />
            </label>
            <button className="btn icon ghost" title="移除此距離目標" type="button" onClick={() => onRemove(target.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeightPanel({ totalWeight, weights, setWeights }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>權重配置</h2>
        <span className={totalWeight === 100 ? 'pill' : 'pill warning'}>{totalWeight}%</span>
      </div>
      {totalWeight !== 100 && <p className="meta warning">目前不是 100%，系統會依總和自動正規化計分。</p>}
      {SCORE_FIELDS.map((field) => (
        <div className="weight-row" key={field.key}>
          <label htmlFor={`weight-${field.key}`}>{field.label}</label>
          <input
            id={`weight-${field.key}`}
            max="50"
            min="0"
            type="range"
            value={weights[field.key]}
            onChange={(event) => setWeights((state) => ({ ...state, [field.key]: clampNumber(event.target.value, 0, 50) }))}
          />
          <span className="pill">{weights[field.key]}%</span>
        </div>
      ))}
    </section>
  );
}

function Leaderboard({ properties }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>即時排行榜</h2>
        <Trophy size={19} color="#d7a921" />
      </div>
      {properties.map((property, index) => (
        <div className={`leader-item ${index === 0 ? 'winner' : ''}`} key={property.id}>
          <div className="leader-title">
            <span>{index === 0 ? '皇冠 ' : `${index + 1}. `}{property.name || '未命名物件'}</span>
            <strong className="leader-score">{formatNumber(property.weightedScore)}</strong>
          </div>
          <IssueBadges issues={property.constraintIssues} />
          <div className="stacked-bar" aria-label="得分貢獻比例">
            {Object.entries(property.groups).map(([group, value]) => (
              <span
                key={group}
                style={{
                  width: `${property.weightedScore > 0 ? (value / property.weightedScore) * 100 : 0}%`,
                  background: GROUPS[group].color,
                }}
              />
            ))}
          </div>
          <div className="legend">
            {Object.entries(property.groups).map(([group, value]) => (
              <span key={group}>
                <i className="legend-dot" style={{ background: GROUPS[group].color }} />
                {GROUPS[group].label} {formatNumber(value)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function CsvSchemaPanel({ columns, importMessage }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>CSV 欄位規格</h2>
        <Save size={18} />
      </div>
      {importMessage && <p className="meta">{importMessage}</p>}
      <p className="meta">匯出檔含 UTF-8 BOM，採分段 CSV：全域距離、全域門檻、物件資料彼此分離，但只需匯入同一個檔案。</p>
      <table className="schema-table">
        <thead>
          <tr>
            <th>區段</th>
            <th>定義</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>#SECTION,GLOBAL_DISTANCE_TARGETS</td><td>全域距離目標名稱與地址。</td></tr>
          <tr><td>#SECTION,GLOBAL_CONSTRAINTS</td><td>預算、坪數、面寬與硬體扣除等全域門檻。</td></tr>
          <tr><td>#SECTION,PROPERTIES</td><td>每一筆物件自己的客觀資料、距離值、評分與計算值。</td></tr>
        </tbody>
      </table>
      <table className="schema-table">
        <thead>
          <tr><th>欄位</th><th>定義</th></tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.key}><td>{column.label}</td><td>{column.description}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ComparisonPage({
  comparisonRowOrder,
  comparisonSort,
  distanceTargets,
  hiddenRowIds,
  onExport,
  onHiddenRowsChange,
  onPinnedRowsChange,
  onOpenPhoto,
  onRowOrderChange,
  onSortChange,
  pinnedRowIds,
  properties,
  totalWeight,
  weights,
}) {
  const [draggingRowId, setDraggingRowId] = useState('');
  const pinnedWrapRef = useRef(null);
  const comparisonWrapRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const allRows = orderComparisonRows(buildComparisonRows(distanceTargets, weights), comparisonRowOrder);
  const comparisonRows = visibleComparisonRows(allRows, hiddenRowIds);
  const pinnedRows = comparisonRows.filter((row) => pinnedRowIds.includes(row.id));
  const sortedProperties = sortComparisonProperties(properties, comparisonRows, comparisonSort);
  const hiddenSet = new Set(hiddenRowIds);
  const pinnedSet = new Set(pinnedRowIds);
  const toggleRow = (rowId) => {
    onHiddenRowsChange((current) => {
      const currentSet = new Set(current);
      if (currentSet.has(rowId)) currentSet.delete(rowId);
      else currentSet.add(rowId);
      return Array.from(currentSet);
    });
  };
  const togglePinnedRow = (rowId) => {
    onPinnedRowsChange((current) => {
      const currentSet = new Set(current);
      if (currentSet.has(rowId)) currentSet.delete(rowId);
      else currentSet.add(rowId);
      return Array.from(currentSet);
    });
  };
  const toggleSort = (row) => {
    if (!row.getNumeric) return;
    onSortChange((current) => ({
      rowId: row.id,
      direction: current.rowId === row.id && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };
  const moveRow = (targetRowId) => {
    if (!draggingRowId || draggingRowId === targetRowId) return;
    const currentIds = comparisonRows.map((row) => row.id);
    const fromIndex = currentIds.indexOf(draggingRowId);
    const toIndex = currentIds.indexOf(targetRowId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextIds = [...currentIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    onRowOrderChange(nextIds);
    setDraggingRowId('');
  };
  const getNumericState = (row, property) => {
    if (row.kind !== 'numeric' || sortedProperties.length < 2) return '';
    const values = sortedProperties.map((item) => Number(row.getNumeric(item))).filter((value) => Number.isFinite(value));
    if (values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return '';
    const current = Number(row.getNumeric(property));
    if (current === max) return 'cell-high';
    if (current === min) return 'cell-low';
    return '';
  };
  const getGapState = (row, property, propertyList) => {
    if (row.kind !== 'pairedPrice' || propertyList.length < 2) return '';
    const values = propertyList.map((item) => Number(row.getNumeric(item))).filter((value) => Number.isFinite(value));
    if (values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return '';
    const current = Number(row.getNumeric(property));
    if (current === max) return 'gap-high-cell';
    if (current === min) return 'gap-low-cell';
    return '';
  };
  const hasRawDifference = (row) => {
    if (row.kind !== 'raw' || sortedProperties.length < 2) return false;
    const normalizedValues = sortedProperties.map((property) => String(row.getValue(property) ?? '').trim() || '未填');
    return new Set(normalizedValues).size > 1;
  };
  const sortLabel = comparisonSort?.rowId
    ? `${allRows.find((row) => row.id === comparisonSort.rowId)?.label || '自訂項目'} ${comparisonSort.direction === 'asc' ? '低到高' : '高到低'}`
    : '總分高到低';

  const syncHorizontalScroll = (sourceRef, targetRef) => {
    const source = sourceRef.current;
    const target = targetRef.current;
    if (!source || !target || syncingScrollRef.current) return;
    syncingScrollRef.current = true;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  };

  useEffect(() => {
    if (!pinnedWrapRef.current || !comparisonWrapRef.current) return;
    pinnedWrapRef.current.scrollLeft = comparisonWrapRef.current.scrollLeft;
  }, [pinnedRows.length, sortedProperties.length]);

  return (
    <main className="compare-page">
      <section className="panel compare-header">
        <div>
          <h2>評比排行</h2>
          <p className="meta">目前排序：{sortLabel}；項目列可拖拉、錨定、顯示隱藏，匯出排行對比表會沿用目前設定。</p>
        </div>
        <div className="button-row">
          <span className={totalWeight === 100 ? 'pill' : 'pill warning'}>權重 {totalWeight}%</span>
          <button className="btn primary" type="button" onClick={onExport}>
            <Download size={17} />
            匯出排行對比表
          </button>
        </div>
      </section>
      <div className="compare-legend">
        <span><i className="legend-swatch high" />最高</span>
        <span><i className="legend-swatch low" />最低</span>
        <span><i className="legend-swatch diff" />客觀資料有差異</span>
        <span><i className="legend-swatch gap-high" />價差最大</span>
        <span><i className="legend-swatch gap-low" />價差最小</span>
      </div>
      <section className="panel row-visibility-panel">
        <div className="panel-head">
          <h3>顯示項目</h3>
          <button className="btn ghost" type="button" onClick={() => onHiddenRowsChange([])}>
            全部顯示
          </button>
        </div>
        <div className="row-toggle-grid">
          {allRows.map((row) => (
            <label className="row-toggle" key={row.id}>
              <input checked={!hiddenSet.has(row.id)} type="checkbox" onChange={() => toggleRow(row.id)} />
              <span>{row.label}</span>
            </label>
          ))}
        </div>
      </section>

      {pinnedRows.length > 0 && (
        <section className="pinned-summary" aria-label="錨定比較項目">
          <div className="pinned-summary-head">
            <strong>錨定項目</strong>
            <span>{pinnedRows.map((row) => row.label).join('、')}</span>
          </div>
          <div
            className="pinned-summary-table-wrap"
            ref={pinnedWrapRef}
            onScroll={() => syncHorizontalScroll(pinnedWrapRef, comparisonWrapRef)}
          >
            <table className="pinned-summary-table">
              <colgroup>
                <col className="comparison-item-column" />
                {sortedProperties.map((property) => (
                  <col className="comparison-property-column" key={property.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>項目</th>
                  {sortedProperties.map((property, index) => (
                    <th key={property.id}>
                      <PropertyThumb property={property} onOpen={() => onOpenPhoto(property, 0)} />
                      第 {index + 1} 名
                      <small>{property.name || '未命名物件'}</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pinnedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong className="item-label" data-tooltip={row.description} title={row.description}>{row.label}</strong>
                      <span>{row.meta || row.section}</span>
                      <button className="mini-action remove-pin" type="button" onClick={() => togglePinnedRow(row.id)}>
                        移除錨定
                      </button>
                    </td>
                    {sortedProperties.map((property) => (
                      <td key={property.id}>
                        {row.kind === 'pairedPrice' ? <PairedPriceCell property={property} row={row} /> : null}
                        {row.kind?.startsWith('mortgage') ? <MortgageCell property={property} row={row} /> : null}
                        {row.kind !== 'pairedPrice' && !row.kind?.startsWith('mortgage') ? row.getValue(property) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section
        className="comparison-table-wrap"
        ref={comparisonWrapRef}
        onScroll={() => syncHorizontalScroll(comparisonWrapRef, pinnedWrapRef)}
      >
        <table className="comparison-table transposed">
          <colgroup>
            <col className="comparison-item-column" />
            {sortedProperties.map((property) => (
              <col className="comparison-property-column" key={property.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="item-col">項目</th>
              {sortedProperties.map((property, index) => (
                <th key={property.id}>
                  <PropertyThumb property={property} onOpen={() => onOpenPhoto(property, 0)} />
                  第 {index + 1} 名
                  <small>{property.name || '未命名物件'}</small>
                  <small>{property.rawData.address || '未填地址'}</small>
                  {property.constraintIssues.length > 0 && <small className="table-issue-text">{property.constraintIssues.join('、')}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => {
              const rawDiff = hasRawDifference(row);
              return (
                <tr
                  className={[
                    rawDiff ? 'raw-diff-row' : '',
                    draggingRowId === row.id ? 'dragging-row' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable
                  key={row.id}
                  onDragEnd={() => setDraggingRowId('')}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() => setDraggingRowId(row.id)}
                  onDrop={() => moveRow(row.id)}
                >
                  <td className="item-col">
                    <strong className="item-label" data-tooltip={row.description} title={row.description}><span className="drag-handle">≡</span>{row.label}</strong>
                    <span>{row.meta || row.section}</span>
                    <div className="row-actions">
                      <button
                        className={pinnedSet.has(row.id) ? 'mini-action active' : 'mini-action'}
                        type="button"
                        onClick={() => togglePinnedRow(row.id)}
                      >
                        錨定
                      </button>
                      <button
                        className={comparisonSort?.rowId === row.id ? 'mini-action active' : 'mini-action'}
                        disabled={!row.getNumeric}
                        type="button"
                        onClick={() => toggleSort(row)}
                      >
                        {comparisonSort?.rowId === row.id ? (comparisonSort.direction === 'asc' ? '低到高' : '高到低') : '排序'}
                      </button>
                    </div>
                  </td>
                {sortedProperties.map((property) => (
                  <td
                      className={[
                        row.highlight ? 'score-cell' : '',
                        getNumericState(row, property),
                        getGapState(row, property, sortedProperties),
                        rawDiff ? 'raw-diff-cell' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={property.id}
                    >
                      {row.kind === 'pairedPrice' ? <PairedPriceCell property={property} row={row} /> : null}
                      {row.kind?.startsWith('mortgage') ? <MortgageCell property={property} row={row} /> : null}
                      {row.kind !== 'pairedPrice' && !row.kind?.startsWith('mortgage') ? row.getValue(property) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function PairedPriceCell({ property, row }) {
  if (row.id === 'price.askVsMarket') {
    return (
      <div className="paired-price">
        <strong>{formatNumber(property.rawData.totalPrice)} 萬</strong>
        <span>{property.derived.priceReferenceSource} {formatNumber(property.derived.priceReferenceTotal)} 萬</span>
        <em>{property.derived.askingReferenceGapPercent >= 0 ? '+' : ''}{formatNumber(property.derived.askingReferenceGapPercent)}%</em>
      </div>
    );
  }

  if (row.id === 'price.grossUnitVsActual') {
    const referenceValue = property.derived.actualTransactionGrossUnitPrice;
    const gap = referenceValue > 0 ? ((property.derived.grossUnitPrice - referenceValue) / referenceValue) * 100 : 0;
    return (
      <div className="paired-price">
        <strong>{formatNumber(property.derived.grossUnitPrice)} 萬/坪</strong>
        <span>{referenceValue > 0 ? '實登總價全坪' : '未填實登'} {formatNumber(referenceValue)} 萬/坪</span>
        <em>{gap >= 0 ? '+' : ''}{formatNumber(gap)}%</em>
      </div>
    );
  }

  if (row.id === 'price.deedUnitVsMarket') {
    const reference = unitReference(property, 'actualTransactionBuildingUnitPrice');
    const gap = reference.value > 0 ? ((property.derived.buildingUnitPrice - reference.value) / reference.value) * 100 : 0;
    return (
      <div className="paired-price">
        <strong>{formatNumber(property.derived.buildingUnitPrice)} 萬/坪</strong>
        <span>{reference.source} {formatNumber(reference.value)} 萬/坪</span>
        <em>{gap >= 0 ? '+' : ''}{formatNumber(gap)}%</em>
      </div>
    );
  }

  if (row.id === 'price.registeredUnitVsMarket') {
    const reference = unitReference(property, 'actualTransactionExpandableEfficiencyUnitPrice');
    const gap = reference.value > 0 ? ((property.derived.expandableEfficiencyUnitPrice - reference.value) / reference.value) * 100 : 0;
    return (
      <div className="paired-price">
        <strong>{formatNumber(property.derived.expandableEfficiencyUnitPrice)} 萬/坪</strong>
        <span>{reference.source} {formatNumber(reference.value)} 萬/坪</span>
        <em>{gap >= 0 ? '+' : ''}{formatNumber(gap)}%</em>
      </div>
    );
  }

  if (row.id === 'price.coreUnitVsMarket') {
    const reference = unitReference(property, 'actualTransactionCoreEfficiencyUnitPrice');
    const gap = reference.value > 0 ? ((property.derived.coreEfficiencyUnitPrice - reference.value) / reference.value) * 100 : 0;
    return (
      <div className="paired-price">
        <strong>{formatNumber(property.derived.coreEfficiencyUnitPrice)} 萬/坪</strong>
        <span>{reference.source} {formatNumber(reference.value)} 萬/坪</span>
        <em>{gap >= 0 ? '+' : ''}{formatNumber(gap)}%</em>
      </div>
    );
  }

  return row.getValue(property);
}

function MortgageCell({ property, row }) {
  const mortgage = property.derived.mortgage;
  if (row.id === 'mortgage.loanSummary') {
    return (
      <div className="paired-price">
        <strong>基準 {formatNumber(mortgage.loanBasePrice)} 萬</strong>
        <span>可貸 {formatNumber(mortgage.loanAmount)} 萬 / {formatNumber(mortgage.loanToValuePercent)}%</span>
        <em>{mortgage.loanBaseSource}</em>
      </div>
    );
  }
  if (row.id === 'mortgage.cashNeeded') {
    return (
      <div className="paired-price">
        <strong>自備 {formatNumber(mortgage.downPayment)} 萬</strong>
        <span>交易成本 {formatNumber(mortgage.transactionCost)} 萬</span>
        <em>初期 {formatNumber(mortgage.initialCashNeeded)} 萬</em>
      </div>
    );
  }
  if (row.id === 'mortgage.monthlyPayments') {
    return (
      <div className="paired-price">
        {mortgage.loanTerms.map((term) => (
          <span key={term}>{term}年：{formatNumber(mortgage.monthlyPayments[term])} 元/月</span>
        ))}
        {mortgage.gracePeriodYears > 0 ? (
          <span>寬限期：{formatNumber(mortgage.graceMonthlyPayment)} 元/月</span>
        ) : null}
        <em>利率 {formatNumber(mortgage.annualInterestRatePercent)}%</em>
      </div>
    );
  }
  return row.getValue(property);
}

function PropertyThumb({ property, onOpen }) {
  const photos = photoList(property.rawData);
  if (photos.length === 0) return null;
  return (
    <button className="property-thumb" type="button" onClick={onOpen} title="放大查看物件照片">
      <img alt={`${property.name || '物件'} 封面照`} src={photos[0]} />
    </button>
  );
}

function PhotoGallery({ property, onOpenPhoto }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const photos = photoList(property.rawData);
  const selectedPhoto = photos[selectedIndex] || photos[0];
  if (photos.length === 0) return null;

  return (
    <section className="photo-gallery">
      <button className="photo-hero" type="button" onClick={() => onOpenPhoto(selectedIndex)} title="放大查看物件照片">
        <img alt={`${property.name || '物件'} 照片`} src={selectedPhoto} />
      </button>
      {photos.length > 1 && (
        <div className="photo-strip">
          {photos.map((photo, index) => (
            <button
              className={index === selectedIndex ? 'photo-strip-item active' : 'photo-strip-item'}
              key={photo}
              type="button"
              onClick={() => setSelectedIndex(index)}
              title={`切換第 ${index + 1} 張照片`}
            >
              <img alt={`${property.name || '物件'} 縮圖 ${index + 1}`} src={photo} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function PhotoViewerModal({ index, onClose, onIndexChange, property }) {
  const photos = photoList(property.rawData);
  if (photos.length === 0) return null;
  const safeIndex = Math.min(Math.max(index, 0), photos.length - 1);
  const currentPhoto = photos[safeIndex];
  const move = (step) => onIndexChange((safeIndex + step + photos.length) % photos.length);

  return (
    <div className="photo-modal-backdrop" role="presentation">
      <div className="photo-modal" role="dialog" aria-modal="true" aria-label={`${property.name || '物件'} 照片預覽`}>
        <div className="photo-modal-head">
          <div>
            <strong>{property.name || '未命名物件'}</strong>
            <span>{safeIndex + 1} / {photos.length}</span>
          </div>
          <button className="btn icon ghost" type="button" onClick={onClose} title="關閉照片">
            <X size={18} />
          </button>
        </div>
        <div className="photo-modal-stage">
          {photos.length > 1 && (
            <button className="photo-nav prev" type="button" onClick={() => move(-1)} title="上一張">
              <ChevronLeft size={28} />
            </button>
          )}
          <img alt={`${property.name || '物件'} 放大照片`} src={currentPhoto} />
          {photos.length > 1 && (
            <button className="photo-nav next" type="button" onClick={() => move(1)} title="下一張">
              <ChevronRight size={28} />
            </button>
          )}
        </div>
        {photos.length > 1 && (
          <div className="photo-modal-strip">
            {photos.map((photo, photoIndex) => (
              <button
                className={photoIndex === safeIndex ? 'photo-strip-item active' : 'photo-strip-item'}
                key={photo}
                type="button"
                onClick={() => onIndexChange(photoIndex)}
                title={`查看第 ${photoIndex + 1} 張`}
              >
                <img alt={`${property.name || '物件'} 預覽縮圖 ${photoIndex + 1}`} src={photo} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuthPanel({ authMessage, firebaseReady, onAuthMessage, user }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const runAuth = async (action) => {
    setBusy(true);
    onAuthMessage('');
    try {
      await action();
    } catch (error) {
      onAuthMessage(firebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseReady) {
    return <span className="auth-note">Firebase 未設定</span>;
  }

  if (user) {
    return (
      <div className="auth-box signed-in">
        <span>{user.displayName || user.email || '已登入'}</span>
        <button className="btn ghost" type="button" onClick={() => runAuth(logout)} disabled={busy}>
          登出
        </button>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <input aria-label="Email" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <input aria-label="密碼" placeholder="密碼" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <button className="btn ghost" type="button" disabled={busy} onClick={() => runAuth(() => signInWithEmail(email, password))}>
        登入
      </button>
      <button className="btn ghost" type="button" disabled={busy} onClick={() => runAuth(() => registerWithEmail(email, password))}>
        註冊
      </button>
      <button className="btn primary" type="button" disabled={busy} onClick={() => runAuth(signInWithGoogle)}>
        Google
      </button>
      {authMessage && <span className="auth-message">{authMessage}</span>}
    </div>
  );
}

function CloudDatasetPanel({
  activeDatasetId,
  busy,
  datasetName,
  datasets,
  firebaseReady,
  message,
  onDelete,
  onLoad,
  onNameChange,
  onRefresh,
  onSave,
  onSaveAs,
  user,
}) {
  return (
    <section className="panel cloud-panel">
      <div className="panel-head">
        <h2>雲端資料</h2>
        <button className="btn icon" type="button" disabled={!user || busy} onClick={onRefresh} title="重新整理">
          <Search size={16} />
        </button>
      </div>
      {!firebaseReady ? (
        <p className="meta">尚未設定 Firebase。可繼續使用 CSV 匯入匯出；若要雲端保存，請填入 `.env`。</p>
      ) : !user ? (
        <p className="meta">登入後可將多份評估資料分開儲存在自己的帳號下。</p>
      ) : (
        <>
          <label className="field compact">
            <span>資料名稱</span>
            <input value={datasetName} placeholder="例如：青埔總店候選案" onChange={(event) => onNameChange(event.target.value)} />
          </label>
          <div className="button-row cloud-actions">
            <button className="btn primary" type="button" disabled={busy} onClick={onSave}>
              <Save size={16} />
              儲存
            </button>
            <button className="btn" type="button" disabled={busy} onClick={onSaveAs}>
              另存新檔
            </button>
          </div>
          <div className="dataset-list">
            {datasets.length === 0 ? (
              <p className="meta">目前沒有雲端資料。</p>
            ) : (
              datasets.map((dataset) => (
                <div className={dataset.id === activeDatasetId ? 'dataset-item active' : 'dataset-item'} key={dataset.id}>
                  <div>
                    <strong>{dataset.name || '未命名資料'}</strong>
                    <span>{dataset.updatedAt?.toDate ? dataset.updatedAt.toDate().toLocaleString('zh-TW') : '尚未同步時間'}</span>
                  </div>
                  <div className="button-row">
                    <button className="btn ghost" type="button" disabled={busy} onClick={() => onLoad(dataset.id)}>
                      讀取
                    </button>
                    <button className="btn danger" type="button" disabled={busy} onClick={() => onDelete(dataset.id)}>
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
      {message && <p className="meta cloud-message">{message}</p>}
    </section>
  );
}

function PropertyCard({
  calculated,
  distanceTargets,
  onDelete,
  onDistance,
  onName,
  onOpenPhoto,
  onRaw,
  onScore,
  property,
  sectionOpen,
  toggleSection,
  weights,
}) {
  const address = property.rawData.address?.trim();

  return (
    <article className={`property-card ${property.constraintIssues.length ? 'property-warning' : ''}`}>
      <div className="property-head">
        <div className="property-title-wrap">
          <input className="property-name" value={property.name} onChange={(event) => onName(property.id, event.target.value)} />
          <IssueBadges issues={property.constraintIssues} />
        </div>
        <button className="btn icon danger" title="刪除物件" type="button" onClick={onDelete}>
          <Trash2 size={17} />
        </button>
      </div>

      <AccordionSection id={property.id} name="raw" open={sectionOpen(property.id, 'raw')} title="原始客觀數據輸入" onToggle={toggleSection}>
        <PhotoGallery property={property} onOpenPhoto={onOpenPhoto} />
        {RAW_GROUPS.map((group) => (
          <div className="field-group" key={group.title}>
            <h3>{group.title}</h3>
            <div className="form-grid">
              {group.fields.map((field) => (
                <FormField field={field} key={field.key} property={property} onRaw={onRaw} />
              ))}
            </div>
          </div>
        ))}
        <MarketLookup address={address} district={property.rawData.district} />
        <DistanceMatrix address={address} distances={property.distances ?? {}} onDistance={(targetId, value) => onDistance(property.id, targetId, value)} targets={distanceTargets} />
        {address && (
          <iframe
            className="map-frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
            title={`${property.name} 地圖預覽`}
          />
        )}
      </AccordionSection>

      <AccordionSection id={property.id} name="derived" open={sectionOpen(property.id, 'derived')} title="財務效益自動計算" onToggle={toggleSection}>
        <div className="metric-grid">
          <Metric label="總價全坪單價" value={formatNumber(calculated?.derived.grossUnitPrice ?? 0)} />
          <Metric label="建物扣車位單價" value={formatNumber(calculated?.derived.buildingUnitPrice ?? 0)} />
          <Metric label="可擴充使用坪效單價" value={formatNumber(calculated?.derived.expandableEfficiencyUnitPrice ?? 0)} />
          <Metric label="核心坪效單價" value={formatNumber(calculated?.derived.coreEfficiencyUnitPrice ?? 0)} />
          <Metric label="實登建物價格(萬)" value={formatNumber(calculated?.derived.actualTransactionBuildingPrice ?? 0)} />
          <Metric label="實登建物扣車位單價" value={formatNumber(calculated?.derived.actualTransactionBuildingUnitPrice ?? 0)} />
          <Metric label="實登可擴充坪效單價" value={formatNumber(calculated?.derived.actualTransactionExpandableEfficiencyUnitPrice ?? 0)} />
          <Metric label="實登核心坪效單價" value={formatNumber(calculated?.derived.actualTransactionCoreEfficiencyUnitPrice ?? 0)} />
        </div>
        <OfferAnalysis property={property} derived={calculated?.derived} />
        <MortgageAnalysis derived={calculated?.derived} />
      </AccordionSection>

      <AccordionSection id={property.id} name="score" open={sectionOpen(property.id, 'score')} title="策略維度綜合評分" onToggle={toggleSection}>
        {SCORE_FIELDS.map((field) => (
          <div className="score-row" key={field.key}>
            <label htmlFor={`score-${property.id}-${field.key}`}>{field.label}</label>
            <input id={`score-${property.id}-${field.key}`} max="10" min="0" type="range" value={property.scores[field.key]} onChange={(event) => onScore(property.id, field.key, event.target.value)} />
            <span className="pill">{property.scores[field.key]} / {weights[field.key]}%</span>
          </div>
        ))}
      </AccordionSection>
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function OfferAnalysis({ derived, property }) {
  if (!derived) return null;
  const totalPrice = clampNumber(property.rawData.totalPrice, 0, Number.MAX_SAFE_INTEGER);
  const gap = derived.marketGapPercent;
  const comment =
    gap > 12
      ? `開價高於市場估值約 ${formatNumber(gap)}%，建議保守下錨並保留議價空間。`
      : gap < -8
        ? `開價低於市場估值約 ${formatNumber(Math.abs(gap))}%，可優先確認產權、屋況與特殊交易條件。`
        : '開價與市場估值接近，建議搭配門檻、區位與硬體條件綜合判斷。';

  return (
    <div className="offer-panel">
      <h3>專家出價分析</h3>
      <div className="offer-grid">
        <Metric label="該物件開價(萬)" value={formatNumber(totalPrice)} />
        <Metric label="市場估值價(萬)" value={formatNumber(derived.marketValuationPrice)} />
        <Metric label={`${derived.marketBaseSource}(萬/坪)`} value={formatNumber(derived.marketBaseUnitPrice)} />
        <Metric label="建議下錨價(萬)" value={formatNumber(derived.anchorPrice)} />
        <Metric label="最高追價(萬)" value={formatNumber(derived.maxChasePrice)} />
      </div>
      <p className="meta">
        估值係數 {formatNumber(derived.conditionFactor)}；有效坪數 {formatNumber(derived.effectiveArea)} 坪；車位調整 {formatNumber(derived.parkingAdjustment)} 萬；硬體扣除 {formatNumber(derived.hardwareDeduction)} 萬；最高追價倍數 {formatNumber(derived.maxChaseMultiplier)}。{comment}
      </p>
    </div>
  );
}

function MortgageAnalysis({ derived }) {
  const mortgage = derived?.mortgage;
  if (!mortgage) return null;
  return (
    <div className="offer-panel">
      <h3>房貸試算</h3>
      <div className="offer-grid">
        <Metric label="貸款基準價(萬)" value={formatNumber(mortgage.loanBasePrice)} />
        <Metric label="可貸金額(萬)" value={formatNumber(mortgage.loanAmount)} />
        <Metric label="自備款(萬)" value={formatNumber(mortgage.downPayment)} />
        <Metric label="初期現金(萬)" value={formatNumber(mortgage.initialCashNeeded)} />
        <Metric label={`${mortgage.primaryTermYears}年月付(元)`} value={formatNumber(mortgage.primaryMonthlyPayment)} />
        <Metric label="月付壓力" value={mortgage.affordabilityStatus} />
      </div>
      <p className="meta">
        基準來源：{mortgage.loanBaseSource}；貸款成數 {formatNumber(mortgage.loanToValuePercent)}%；年利率 {formatNumber(mortgage.annualInterestRatePercent)}%；貸款缺口 {formatNumber(mortgage.loanGap)} 萬。月付試算：{mortgage.loanTerms.map((term) => `${term}年 ${formatNumber(mortgage.monthlyPayments[term])} 元/月`).join('，')}。{mortgage.gracePeriodYears > 0 ? `寬限期 ${formatNumber(mortgage.gracePeriodYears)} 年僅繳息約 ${formatNumber(mortgage.graceMonthlyPayment)} 元/月。` : ''}
      </p>
    </div>
  );
}

function MarketLookup({ address, district }) {
  const query = [district, address].filter(Boolean).join(' ');
  async function copyAndOpen() {
    if (query && navigator.clipboard?.writeText) await navigator.clipboard.writeText(query);
    window.open('https://lvr.land.moi.gov.tw/', '_blank', 'noopener,noreferrer');
  }
  return (
    <div className="button-row" style={{ marginTop: 12 }}>
      <button className="btn" disabled={!query} type="button" onClick={copyAndOpen}>
        <Search size={17} />
        查實價登錄
      </button>
      <span className="meta">會複製行政區與地址關鍵字，並開啟內政部實價登錄。</span>
    </div>
  );
}

function FormField({ field, onRaw, property }) {
  return (
    <label className={`field ${field.span ?? ''}`}>
      <span>{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea value={property.rawData[field.key]} onChange={(event) => onRaw(property.id, field.key, event.target.value)} />
      ) : field.type === 'booleanText' ? (
        <select value={property.rawData[field.key]} onChange={(event) => onRaw(property.id, field.key, event.target.value)}>
          <option value="否">否</option>
          <option value="是">是</option>
        </select>
      ) : field.type === 'select' ? (
        <select value={property.rawData[field.key]} onChange={(event) => onRaw(property.id, field.key, event.target.value)}>
          {field.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input min={field.type === 'number' ? 0 : undefined} type={field.type === 'number' ? 'number' : 'text'} value={property.rawData[field.key]} onChange={(event) => onRaw(property.id, field.key, event.target.value)} />
      )}
    </label>
  );
}

function DistanceMatrix({ address, distances, onDistance, targets }) {
  return (
    <div className="field-group distance-group">
      <h3>地理位置與環境：共用測距</h3>
      <p className="meta">按測距會開啟 Google Maps 路線；實際距離需人工填入，避免使用付費 API。</p>
      <div className="distance-grid">
        {targets.map((target) => {
          const canRoute = address && target.address;
          return (
            <div className="distance-card" key={target.id}>
              <div>
                <strong>{target.name || '未命名目標'}</strong>
                <span>{target.address || '尚未設定地址'}</span>
              </div>
              <label className="field compact">
                <span>距離(公尺)</span>
                <input min="0" type="number" value={distances[target.id] ?? 0} onChange={(event) => onDistance(target.id, event.target.value)} />
              </label>
              <div className="button-row">
                <button className="btn" disabled={!canRoute} type="button" onClick={() => window.open(routeUrl(address, target.address), '_blank', 'noopener,noreferrer')}>
                  <Navigation size={16} />
                  測距
                </button>
                <button className="btn ghost" disabled={!target.address} type="button" onClick={() => window.open(mapSearchUrl(target.address), '_blank', 'noopener,noreferrer')}>
                  <MapPinned size={16} />
                  查看
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueBadges({ issues }) {
  if (!issues?.length) return null;
  return (
    <div className="issue-badges">
      {issues.map((issue) => (
        <span className="issue-badge" key={issue}>{issue}</span>
      ))}
    </div>
  );
}

function AccordionSection({ children, id, name, onToggle, open, title }) {
  return (
    <section className="accordion-section">
      <button className="accordion-toggle" type="button" onClick={() => onToggle(id, name)}>
        <span>{title}</span>
        <span>{open ? '收合' : '展開'}</span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </section>
  );
}
