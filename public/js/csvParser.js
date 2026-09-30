/**
 * CSV 题库解析器（PWA 版）
 * 移植自小程序 utils/csvParser.js 的核心解析逻辑，
 * 保持与原版一致的数据结构：tiles / options / correctOption(0-based)
 * 牌名统一为「花色+数字」格式（如 w3 / 2l → l2）
 */

const CSV_FIELDS = [
  'id', 'title', 'desc',
  'card1', 'card2', 'card3', 'card4', 'card5', 'card6',
  'card7', 'card8', 'card9', 'card10', 'card11', 'card12', 'card13', 'card14',
  'opt1', 'opt2', 'opt3', 'opt4',
  'correct', 'explanation', 'diff', 'category',
];

/** 解析单行 CSV（支持引号包裹的跨逗号字段） */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** 按跨行引号切分行 */
function splitCsvLines(text) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines;
}

/** 统一牌名：数字+字母(3w) → 字母+数字(w3) */
function normalizeTileName(name) {
  const clean = String(name || '').trim().toLowerCase();
  return /^[1-9][lwt]$/.test(clean) ? clean.charAt(1) + clean.charAt(0) : clean;
}

/**
 * 解析并校验题库 CSV
 * @returns {{data: Array, errors: string[], isValid: boolean}}
 */
function parseAndValidateCSV(csvText) {
  const errors = [];
  const questions = [];
  const lines = splitCsvLines(csvText);

  // 跳过表头
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCsvLine(line);
    const row = {};
    CSV_FIELDS.forEach((field, idx) => { row[field] = (values[idx] || '').trim(); });

    if (!row.id) continue;

    if (questions.some(q => q.id === row.id)) {
      errors.push(`第${i + 1}行：题目 ID ${row.id} 重复`);
      continue;
    }

    // 手牌：card1-14 非空项
    const tiles = [];
    for (let c = 1; c <= 14; c++) {
      const card = normalizeTileName(row[`card${c}`]);
      if (card) tiles.push(card);
    }
    if (tiles.length === 0) {
      errors.push(`题目 ${row.id}：无有效手牌`);
      continue;
    }

    // 选项：opt1-4，统一牌名格式
    const options = [];
    for (let o = 1; o <= 4; o++) {
      const opt = row[`opt${o}`];
      options.push(opt ? normalizeTileName(opt) : '');
    }

    // 正确答案：CSV 1-based → 0-based
    const correctValue = parseInt(row.correct, 10) || 1;
    const correctOption = (correctValue >= 1 && correctValue <= 4) ? correctValue - 1 : 0;

    const category = row.category === 'error_prone' ? 'error_prone' : 'basic';

    questions.push({
      id: row.id,
      title: row.title || `题目 ${row.id}`,
      description: row.desc || '',
      tiles,
      options,
      correctOption,
      explanation: row.explanation || '',
      difficulty: row.diff || 'easy',
      category,
      type: category,
    });
  }

  return { data: questions, errors, isValid: errors.length === 0 };
}
