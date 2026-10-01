function canonicalLocale(raw) {
  try {
    return Intl.getCanonicalLocales(String(raw || '').trim())[0] || null;
  } catch {
    return null;
  }
}

function openingMetadata(content) {
  const text = String(content || '');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u);
  if (frontmatter) return frontmatter[1];

  const opening = text.slice(0, 3000).match(/(```|~~~)yaml\r?\n/iu);
  if (!opening || opening.index === undefined) return '';
  const prefix = text.slice(0, opening.index);
  if (!prefix.split(/\r?\n/u).every((line) => !line.trim() || /^#{1,6}\s+\S/u.test(line))) return '';
  const start = opening.index + opening[0].length;
  const closing = text.slice(start).match(new RegExp(`\\r?\\n${opening[1]}`));
  return closing ? text.slice(start, start + closing.index) : text.slice(start);
}

function declaredLocale(content) {
  const metadata = openingMetadata(content);
  const match = metadata.match(/^(?:source_locale|language|lang)\s*:\s*['"]?([^'"#\r\n]+)['"]?\s*(?:#.*)?$/imu);
  return match ? canonicalLocale(match[1]) : null;
}

const MIN_SCRIPT_CHARACTERS = 20;
const DOMINANT_SCRIPT_PERCENT = 65;
const MIN_VARIANT_SIGNALS = 5;
const DOMINANT_VARIANT_PERCENT = 80;

// The pair order is simplified → traditional. These are deliberately
// high-signal variants rather than a conversion table: classification must
// never rewrite source text or guess when the observed Han characters do not
// distinguish the two writing systems.
const HAN_VARIANT_PAIRS = [
  '汉漢', '语語', '简簡', '体體', '这這', '为為', '国國', '发發', '么麼', '个個',
  '来來', '时時', '会會', '应應', '对對', '与與', '从從', '开開', '关關', '门門',
  '过過', '还還', '进進', '远遠', '无無', '论論', '让讓', '气氣', '长長', '书書',
  '见見', '学學', '术術', '实實', '义義', '头頭', '条條', '变變', '当當', '将將',
  '种種', '样樣', '经經', '现現', '点點', '话話', '间間', '问問', '听聽', '说說',
  '读讀', '写寫', '网網', '数數', '据據', '处處', '区區', '东東', '万萬', '两兩',
  '并並', '业業', '产產', '认認', '识識', '众眾', '议議', '员員', '党黨', '习習',
  '龙龍', '凤鳳', '马馬', '爱愛', '乐樂', '欢歡', '画畫', '医醫', '药藥', '风風',
  '电電', '车車', '飞飛', '广廣', '达達', '华華', '务務', '机機', '标標', '备備',
  '显顯', '观觀', '结結', '线線', '报報', '记記', '录錄', '历歷', '档檔', '页頁',
  '号號', '态態', '递遞', '审審', '扩擴', '连連', '选選', '择擇', '严嚴', '权權',
  '属屬', '质質', '层層', '确確', '独獨', '项項', '师師', '验驗', '设設', '络絡',
  '别別', '觉覺', '构構', '双雙', '联聯', '径徑', '边邊', '护護', '级級', '际際',
  '较較', '统統', '词詞', '汇彙', '压壓', '块塊', '节節', '闻聞', '声聲', '导導',
  '却卻',
];

const SIMPLIFIED_SIGNALS = new Set(HAN_VARIANT_PAIRS.map((pair) => pair[0]));
const TRADITIONAL_SIGNALS = new Set([
  ...HAN_VARIANT_PAIRS.map((pair) => pair[1]),
  ...'後裡於雲臺準係葉內',
]);
if (HAN_VARIANT_PAIRS.some((pair) => [...pair].length !== 2)
  || new Set(HAN_VARIANT_PAIRS).size !== HAN_VARIANT_PAIRS.length
  || [...SIMPLIFIED_SIGNALS].some((signal) => TRADITIONAL_SIGNALS.has(signal))) {
  throw new Error('source locale 的繁簡訊號表不合法。');
}
const HAN_CHARACTER = /\p{Script=Han}/u;
const LATIN_CHARACTER = /\p{Script=Latin}/u;
const ASCII_PATH_TOKEN = /(?<![A-Za-z0-9])[A-Za-z0-9.-]*(?:[_/\\][A-Za-z0-9._/\\-]*)+(?![A-Za-z0-9])/gu;
const ASCII_FILE_TOKEN = /(?<![A-Za-z0-9])[A-Za-z0-9][A-Za-z0-9_-]*\.(?:md|ya?ml|json|tsx?|jsx?|mjs|cjs|py|sh|html?|css|tex|pdf|csv|txt)(?![A-Za-z0-9])/giu;
const ASCII_ID_TOKEN = /(?<![A-Za-z0-9])(?=[A-Za-z0-9._·-]*[0-9])[A-Za-z][A-Za-z0-9._·-]*(?![A-Za-z0-9])/gu;
const ASCII_ACRONYM = /(?<![A-Za-z0-9])[A-Z]{2,}(?:-[A-Z]{2,})*(?![A-Za-z0-9])/gu;

function stripTechnicalTokens(line) {
  return line
    .replace(ASCII_PATH_TOKEN, ' ')
    .replace(ASCII_FILE_TOKEN, ' ')
    .replace(ASCII_ID_TOKEN, ' ')
    .replace(ASCII_ACRONYM, ' ');
}

function proseForClassification(content) {
  const lines = String(content || '')
    .normalize('NFC')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .split(/\r?\n/u);
  const prose = [];
  let frontmatter = lines[0]?.trim() === '---';
  let fence = null;

  for (let index = frontmatter ? 1 : 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (frontmatter) {
      if (line.trim() === '---') frontmatter = false;
      continue;
    }
    if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/u);
      if (closing && closing[1][0] === fence.character && closing[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (opening) {
      fence = { character: opening[1][0], length: opening[1].length };
      continue;
    }

    if (/^\s*\[[^\]]+\]:\s*\S+.*$/u.test(line)) continue;
    prose.push(stripTechnicalTokens(line
      .replace(/`[^`\r\n]*`/gu, ' ')
      .replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/gu, '$1')
      .replace(/https?:\/\/[^\s<>)]+/giu, ' ')
      .replace(/<[^>]+>/gu, ' ')
      .replace(/&[A-Za-z][A-Za-z0-9]+;/gu, ' ')));
  }

  return prose.join('\n');
}

function deterministicLocale(content) {
  let han = 0;
  let latin = 0;
  let simplified = 0;
  let traditional = 0;

  for (const character of proseForClassification(content)) {
    if (HAN_CHARACTER.test(character)) {
      han += 1;
      if (SIMPLIFIED_SIGNALS.has(character)) simplified += 1;
      if (TRADITIONAL_SIGNALS.has(character)) traditional += 1;
    } else if (LATIN_CHARACTER.test(character)) {
      latin += 1;
    }
  }

  const scriptCharacters = han + latin;
  if (scriptCharacters < MIN_SCRIPT_CHARACTERS) return null;
  if (han * 100 >= scriptCharacters * DOMINANT_SCRIPT_PERCENT) {
    const variantSignals = simplified + traditional;
    if (variantSignals < MIN_VARIANT_SIGNALS) return null;
    if (traditional * 100 >= variantSignals * DOMINANT_VARIANT_PERCENT) return 'zh-TW';
    if (simplified * 100 >= variantSignals * DOMINANT_VARIANT_PERCENT) return 'zh-Hans';
    return null;
  }
  if (latin * 100 >= scriptCharacters * DOMINANT_SCRIPT_PERCENT) return 'en';
  return null;
}

export function sourceLocaleFor(entry, policy) {
  const override = policy.sourceLocaleOverrides?.[entry.path];
  if (override) {
    const locale = canonicalLocale(override);
    if (!locale) throw new Error(`無效的 sourceLocale override：${entry.path} → ${override}`);
    return { sourceLocale: locale, sourceLocaleBasis: 'catalog-override' };
  }

  const metadata = declaredLocale(entry.content);
  if (metadata) return { sourceLocale: metadata, sourceLocaleBasis: 'metadata' };

  const deterministic = deterministicLocale(entry.content);
  if (deterministic) {
    return { sourceLocale: deterministic, sourceLocaleBasis: 'script-dominance' };
  }
  return { sourceLocale: 'und', sourceLocaleBasis: 'und' };
}
