import { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileUp,
  MapPinned,
  Navigation,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
} from 'lucide-react';

const MAX_DISTANCE_TARGETS = 5;
const CSV_SECTION_MARKER = '#SECTION';
const CSV_SECTION_GLOBAL_TARGETS = 'GLOBAL_DISTANCE_TARGETS';
const CSV_SECTION_GLOBAL_CONSTRAINTS = 'GLOBAL_CONSTRAINTS';
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

function calculateDerived(rawData, scores = DEFAULT_SCORES, constraints = DEFAULT_CONSTRAINTS) {
  const totalPrice = clampNumber(rawData.totalPrice, 0, Number.MAX_SAFE_INTEGER);
  const buildArea = clampNumber(rawData.buildArea, 0, Number.MAX_SAFE_INTEGER);
  const firstFloorArea = clampNumber(rawData.firstFloorArea, 0, Number.MAX_SAFE_INTEGER);
  const attachedArea = clampNumber(rawData.attachedArea, 0, Number.MAX_SAFE_INTEGER);
  const mezzanineArea = clampNumber(rawData.mezzanineArea, 0, Number.MAX_SAFE_INTEGER);
  const sharedArea = clampNumber(rawData.sharedArea, 0, Number.MAX_SAFE_INTEGER);
  const parkingCount = clampNumber(rawData.parkingCount, 0, Number.MAX_SAFE_INTEGER);
  const inputParkingPrice = clampNumber(rawData.parkingPrice, 0, Number.MAX_SAFE_INTEGER);
  const parkingPrice = parkingCount > 0 && inputParkingPrice === 0 ? 200 : inputParkingPrice;
  const netPrice = Math.max(0, totalPrice - parkingPrice);
  const registeredArea = firstFloorArea + attachedArea + mezzanineArea + sharedArea;
  const coreArea = normalizeBooleanText(rawData.hasMezzanine) === '是' ? firstFloorArea * 2 : firstFloorArea;
  const deedUnitPrice = buildArea > 0 ? netPrice / buildArea : 0;
  const registeredUnitPrice = registeredArea > 0 ? netPrice / registeredArea : 0;
  const coreEfficiencyUnitPrice = coreArea > 0 ? netPrice / coreArea : 0;
  const marketSampleCount1Y = clampNumber(rawData.marketSampleCount1Y, 0, Number.MAX_SAFE_INTEGER);
  const medianUnitPrice1Y = clampNumber(rawData.medianUnitPrice1Y, 0, Number.MAX_SAFE_INTEGER);
  const averageUnitPrice1Y = clampNumber(rawData.averageUnitPrice1Y, 0, Number.MAX_SAFE_INTEGER);
  const averageUnitPriceHistorical = clampNumber(rawData.averageUnitPriceHistorical, 0, Number.MAX_SAFE_INTEGER);
  const manualHistoricalPrice = clampNumber(rawData.lastHistoricalPrice, 0, Number.MAX_SAFE_INTEGER);
  let marketBaseUnitPrice = deedUnitPrice * 0.85;
  let marketBaseSource = '開價折讓推估';
  if (medianUnitPrice1Y > 0 && marketSampleCount1Y >= 5) {
    marketBaseUnitPrice = medianUnitPrice1Y;
    marketBaseSource = '近一年中位單價';
  } else if (averageUnitPrice1Y > 0 && marketSampleCount1Y >= 3) {
    marketBaseUnitPrice = averageUnitPrice1Y;
    marketBaseSource = '近一年平均單價';
  } else if (averageUnitPriceHistorical > 0) {
    marketBaseUnitPrice = averageUnitPriceHistorical;
    marketBaseSource = '歷史平均單價';
  } else if (manualHistoricalPrice > 0) {
    marketBaseUnitPrice = manualHistoricalPrice;
    marketBaseSource = '手動周邊實登均價';
  }
  const effectiveArea = firstFloorArea + (normalizeBooleanText(rawData.hasMezzanine) === '是' ? mezzanineArea * 0.5 : 0);
  const frontageWidth = clampNumber(rawData.frontageWidth, 0, Number.MAX_SAFE_INTEGER);
  const age = clampNumber(rawData.age, 0, Number.MAX_SAFE_INTEGER);
  const cornerPremium = normalizeBooleanText(rawData.isCornerLot) === '是' ? 0.05 : 0;
  const frontagePremium = frontageWidth >= 8 ? 0.05 : frontageWidth >= 6 ? 0.03 : 0;
  const mezzaninePremium = normalizeBooleanText(rawData.hasMezzanine) === '是' ? 0.03 : 0;
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
  const marketValuationPrice = Math.max(0, marketBaseUnitPrice * buildArea * conditionFactor + parkingAdjustment - hardwareDeduction);
  const anchorPrice = Math.max(0, marketValuationPrice * 0.9);
  const maxChaseMultiplier = premiumRate >= 0.08 ? 1.05 : 1.03;
  const maxChasePrice = Math.max(0, marketValuationPrice * maxChaseMultiplier);
  const marketGapPercent = marketValuationPrice > 0 ? ((totalPrice - marketValuationPrice) / marketValuationPrice) * 100 : 0;

  return {
    parkingPriceApplied: parkingPrice,
    deedUnitPrice,
    registeredUnitPrice,
    coreEfficiencyUnitPrice,
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
    { key: 'deedUnitPrice', label: '權狀單坪售價', description: '匯出計算值；匯入時忽略。' },
    { key: 'registeredUnitPrice', label: '實際登記單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'coreEfficiencyUnitPrice', label: '核心坪效單價', description: '匯出計算值；匯入時忽略。' },
    { key: 'marketValuationPrice', label: '市場估值價', description: '匯出計算值；匯入時忽略。' },
    { key: 'suggestedBuyingPrice', label: '建議下錨價', description: '匯出計算值；匯入時忽略。' },
    { key: 'maxChasePrice', label: '最高追價', description: '匯出計算值；匯入時忽略。' },
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
  if (column.key in property.derived) return formatNumber(property.derived[column.key]);
  return '';
}

const PRIORITY_RAW_ROW_KEYS = new Set([
  'totalPrice',
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
    { id: 'score.total', section: '排序', label: '總分', kind: 'numeric', getNumeric: (property) => property.weightedScore, getValue: (property) => formatNumber(property.weightedScore), highlight: true },
    { id: 'raw.totalPrice', section: '價格與行情', label: '總價(萬)', kind: 'numeric', getNumeric: (property) => property.rawData.totalPrice, getValue: (property) => formatNumber(property.rawData.totalPrice), highlight: true },
    { id: 'market.medianUnitPrice1Y', section: '價格與行情', label: '近一年中位單價', meta: '萬/坪', kind: 'numeric', getNumeric: (property) => property.rawData.medianUnitPrice1Y, getValue: (property) => formatNumber(property.rawData.medianUnitPrice1Y) },
    { id: 'market.averageUnitPrice1Y', section: '價格與行情', label: '近一年平均單價', meta: '萬/坪', kind: 'numeric', getNumeric: (property) => property.rawData.averageUnitPrice1Y, getValue: (property) => formatNumber(property.rawData.averageUnitPrice1Y) },
    { id: 'market.averageHistorical', section: '價格與行情', label: '歷史平均單價', meta: '萬/坪', kind: 'numeric', getNumeric: (property) => property.rawData.averageUnitPriceHistorical, getValue: (property) => formatNumber(property.rawData.averageUnitPriceHistorical) },
    { id: 'market.lastHistoricalPrice', section: '價格與行情', label: '周邊實登均價', meta: '萬/坪', kind: 'numeric', getNumeric: (property) => property.rawData.lastHistoricalPrice, getValue: (property) => formatNumber(property.rawData.lastHistoricalPrice) },
    { id: 'market.sampleCount1Y', section: '價格與行情', label: '近一年樣本數', kind: 'numeric', getNumeric: (property) => property.rawData.marketSampleCount1Y, getValue: (property) => property.rawData.marketSampleCount1Y || 0 },
    { id: 'market.latestTransactionDate', section: '價格與行情', label: '最近成交年月', kind: 'raw', getValue: (property) => property.rawData.latestTransactionDate || property.rawData.historicalDate || '未填' },
    { id: 'offer.marketValuation', section: '專家出價分析', label: '市場估值價', kind: 'numeric', getNumeric: (property) => property.derived.marketValuationPrice, getValue: (property) => `${formatNumber(property.derived.marketValuationPrice)} 萬`, highlight: true },
    { id: 'offer.anchor', section: '專家出價分析', label: '建議下錨價', kind: 'numeric', getNumeric: (property) => property.derived.anchorPrice, getValue: (property) => `${formatNumber(property.derived.anchorPrice)} 萬` },
    { id: 'offer.maxChase', section: '專家出價分析', label: '最高追價', kind: 'numeric', getNumeric: (property) => property.derived.maxChasePrice, getValue: (property) => `${formatNumber(property.derived.maxChasePrice)} 萬` },
    { id: 'offer.marketGap', section: '專家出價分析', label: '開價偏離市場', kind: 'numeric', getNumeric: (property) => property.derived.marketGapPercent, getValue: (property) => `${formatNumber(property.derived.marketGapPercent)}%` },
    { id: 'constraint.issues', section: '門檻檢核', label: '不符條件', kind: 'raw', getValue: (property) => property.constraintIssues.join('、') || '符合' },
    ...SCORE_FIELDS.map((field) => ({
      id: `score.${field.key}`,
      section: '策略維度綜合評分',
      label: field.label,
      meta: `權重 ${weights[field.key]}%`,
      kind: 'numeric',
      getNumeric: (property) => property.scores[field.key] ?? 0,
      getValue: (property) => property.scores[field.key] ?? 0,
    })),
    ...distanceTargets.map((target) => ({
      id: `distance.${target.id}`,
      section: '地理位置與環境',
      label: `距離-${target.name || target.id}`,
      meta: target.address || '未設定地址',
      kind: 'numeric',
      getNumeric: (property) => property.distances?.[target.id] ?? 0,
      getValue: (property) => `${formatNumber(property.distances?.[target.id] ?? 0)} 公尺`,
    })),
    { id: 'derived.deedUnitPrice', section: '財務效益自動計算', label: '權狀單坪售價', kind: 'numeric', getNumeric: (property) => property.derived.deedUnitPrice, getValue: (property) => formatNumber(property.derived.deedUnitPrice) },
    { id: 'derived.registeredUnitPrice', section: '財務效益自動計算', label: '實際登記單價', kind: 'numeric', getNumeric: (property) => property.derived.registeredUnitPrice, getValue: (property) => formatNumber(property.derived.registeredUnitPrice) },
    { id: 'derived.coreEfficiencyUnitPrice', section: '財務效益自動計算', label: '核心坪效單價', kind: 'numeric', getNumeric: (property) => property.derived.coreEfficiencyUnitPrice, getValue: (property) => formatNumber(property.derived.coreEfficiencyUnitPrice), highlight: true },
    ...RAW_GROUPS.flatMap((group) =>
      group.fields.filter((field) => !PRIORITY_RAW_ROW_KEYS.has(field.key)).map((field) => ({
        id: `raw.${field.key}`,
        section: group.title,
        label: field.label,
        kind: 'raw',
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

export default function App() {
  const [weights, setWeights] = useState(PRESETS.balanced.weights);
  const [properties, setProperties] = useState(initialProperties);
  const [distanceTargets, setDistanceTargets] = useState(DEFAULT_DISTANCE_TARGETS);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [hideNonCompliant, setHideNonCompliant] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [activePage, setActivePage] = useState('manage');
  const [comparisonRowOrder, setComparisonRowOrder] = useState([]);
  const fileInputRef = useRef(null);

  const csvColumns = useMemo(() => buildCsvColumns(distanceTargets), [distanceTargets]);
  const totalWeight = useMemo(
    () => SCORE_FIELDS.reduce((sum, field) => sum + clampNumber(weights[field.key], 0, 50), 0),
    [weights],
  );
  const calculatedProperties = useMemo(() => {
    const calculated = properties
      .map((property) => {
        const derived = calculateDerived(property.rawData, property.scores, constraints);
        const weighted = calculateWeighted(property, weights, totalWeight);
        const constraintIssues = getConstraintIssues(property.rawData, constraints);
        return { ...property, derived, ...weighted, constraintIssues };
      })
      .sort((a, b) => b.weightedScore - a.weightedScore);
    return hideNonCompliant ? calculated.filter((property) => property.constraintIssues.length === 0) : calculated;
  }, [constraints, hideNonCompliant, properties, weights, totalWeight]);

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
      [CSV_SECTION_MARKER, CSV_SECTION_PROPERTIES],
      csvColumns.map((col) => col.label),
      ...calculatedProperties.map((property) => csvColumns.map((col) => propertyCsvValue(property, col))),
    ];
    downloadCsv(rows, `store-site-evaluation-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function exportComparisonCsv() {
    const rowsForExport = orderComparisonRows(buildComparisonRows(distanceTargets, weights), comparisonRowOrder);
    const rows = [
      ['項目', ...calculatedProperties.map((property, index) => `第 ${index + 1} 名 ${property.name || '未命名物件'}`)],
      ...rowsForExport.map((row) => [
        row.meta ? `${row.label}｜${row.meta}` : `${row.label}｜${row.section}`,
        ...calculatedProperties.map((property) => row.getValue(property)),
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
    const imported = propertyRecords.map((record, index) => propertyFromRecord(record, index));

    setDistanceTargets(importedTargets);
    setConstraints(importedConstraints);
    setProperties(imported);
    setImportMessage(`已匯入 ${imported.length} 筆物件，並套用 ${importedTargets.length} 個距離目標與全域門檻。`);
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
            <DistanceTargetPanel targets={distanceTargets} onAdd={addDistanceTarget} onRemove={removeDistanceTarget} onUpdate={updateDistanceTarget} />
            <ConstraintPanel
              constraints={constraints}
              hideNonCompliant={hideNonCompliant}
              onHideChange={setHideNonCompliant}
              onUpdate={(key, value) => setConstraints((state) => ({ ...state, [key]: clampNumber(value, 0, Number.MAX_SAFE_INTEGER) }))}
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
          distanceTargets={distanceTargets}
          onExport={exportComparisonCsv}
          onRowOrderChange={setComparisonRowOrder}
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

function ComparisonPage({ comparisonRowOrder, distanceTargets, onExport, onRowOrderChange, properties, totalWeight, weights }) {
  const [draggingRowId, setDraggingRowId] = useState('');
  const comparisonRows = orderComparisonRows(buildComparisonRows(distanceTargets, weights), comparisonRowOrder);
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
    if (row.kind !== 'numeric' || properties.length < 2) return '';
    const values = properties.map((item) => Number(row.getNumeric(item))).filter((value) => Number.isFinite(value));
    if (values.length < 2) return '';
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return '';
    const current = Number(row.getNumeric(property));
    if (current === max) return 'cell-high';
    if (current === min) return 'cell-low';
    return '';
  };
  const hasRawDifference = (row) => {
    if (row.kind !== 'raw' || properties.length < 2) return false;
    const normalizedValues = properties.map((property) => String(row.getValue(property) ?? '').trim() || '未填');
    return new Set(normalizedValues).size > 1;
  };

  return (
    <main className="compare-page">
      <section className="panel compare-header">
        <div>
          <h2>評比排行</h2>
          <p className="meta">欄位依總分排序顯示物件；項目列可拖拉調整順序，匯出排行對比表會沿用目前排序。</p>
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
      </div>

      <section className="comparison-table-wrap">
        <table className="comparison-table transposed">
          <thead>
            <tr>
              <th className="item-col">項目</th>
              {properties.map((property, index) => (
                <th key={property.id}>
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
                  className={[rawDiff ? 'raw-diff-row' : '', draggingRowId === row.id ? 'dragging-row' : '']
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
                    <strong><span className="drag-handle">≡</span>{row.label}</strong>
                    <span>{row.meta || row.section}</span>
                  </td>
                  {properties.map((property) => (
                    <td
                      className={[row.highlight ? 'score-cell' : '', getNumericState(row, property), rawDiff ? 'raw-diff-cell' : '']
                        .filter(Boolean)
                        .join(' ')}
                      key={property.id}
                    >
                      {row.getValue(property)}
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

function PropertyCard({
  calculated,
  distanceTargets,
  onDelete,
  onDistance,
  onName,
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
          <Metric label="權狀單坪售價" value={formatNumber(calculated?.derived.deedUnitPrice ?? 0)} />
          <Metric label="實際登記單價" value={formatNumber(calculated?.derived.registeredUnitPrice ?? 0)} />
          <Metric label="核心坪效單價" value={formatNumber(calculated?.derived.coreEfficiencyUnitPrice ?? 0)} />
        </div>
        <OfferAnalysis property={property} derived={calculated?.derived} />
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
