const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const {
  COMPLAINT_CATEGORIES,
  CATEGORY_DEPARTMENT_MAP,
  CATEGORY_SEVERITY_BASE,
  RESOLUTION_DAYS_ESTIMATE,
  PRIORITY,
} = require('../utils/constants');
const { haversineDistance } = require('../utils/geo');

const CATEGORY_KEYWORDS = {
  garbage: ['garbage', 'trash', 'waste', 'litter', 'bin', 'dump', 'kachra', 'kooda'],
  potholes: ['pothole', 'potholes', 'crater', 'hole', 'road hole', 'gaddha'],
  broken_streetlights: ['streetlight', 'street light', 'lamp', 'light pole', 'dark', 'bulb'],
  water_leakage: ['water leak', 'leakage', 'pipe burst', 'water pipe', 'tap', 'paani'],
  sewage_overflow: ['sewage', 'drain', 'manhole', 'overflow', 'sewer', 'gutter', 'nala'],
  illegal_dumping: ['illegal dump', 'dumping', 'unauthorized', 'waste dump'],
  road_damage: ['road damage', 'broken road', 'cracked road', 'damaged road', 'sadak'],
  public_toilets: ['toilet', 'restroom', 'washroom', 'public toilet', 'shauchalya'],
  snow_blockage: ['snow', 'ice', 'blocked road', 'snow clearance', 'barf'],
  dead_animals: ['dead animal', 'carcass', 'dead dog', 'dead cow', 'dead cat'],
  fallen_trees: ['fallen tree', 'tree fallen', 'broken tree', 'uprooted tree'],
};

const CATEGORY_LABELS = {
  en: {
    garbage: 'Garbage / Waste',
    potholes: 'Potholes',
    broken_streetlights: 'Broken Streetlights',
    water_leakage: 'Water Leakage',
    sewage_overflow: 'Sewage Overflow',
    illegal_dumping: 'Illegal Dumping',
    road_damage: 'Road Damage',
    public_toilets: 'Public Toilets',
    snow_blockage: 'Snow Blockage',
    dead_animals: 'Dead Animals',
    fallen_trees: 'Fallen Trees',
    others: 'Others',
  },
  hi: {
    garbage: 'कचरा / अपशिष्ट',
    potholes: 'गड्ढे',
    broken_streetlights: 'टूटी सड़क लाइट',
    water_leakage: 'पानी का रिसाव',
    sewage_overflow: 'सीवेज overflow',
    illegal_dumping: 'अवैध डंपिंग',
    road_damage: 'सड़क क्षति',
    public_toilets: 'सार्वजनिक शौचालय',
    snow_blockage: 'बर्फ अवरोध',
    dead_animals: 'मृत जानवर',
    fallen_trees: 'गिरे हुए पेड़',
    others: 'अन्य',
  },
  ur: {
    garbage: 'کچرا / فضلہ',
    potholes: 'گڑھے',
    broken_streetlights: 'ٹوٹی سڑک لائٹ',
    water_leakage: 'پانی کا رساؤ',
    sewage_overflow: 'سیوریج اوور فلو',
    illegal_dumping: 'غیر قانونی ڈumping',
    road_damage: 'سڑک کو نقصان',
    public_toilets: 'عوامی بیت الخلا',
    snow_blockage: 'برف کی رکاوٹ',
    dead_animals: 'مردہ جانور',
    fallen_trees: 'گرے ہوئے درخت',
    others: 'دیگر',
  },
};

const SEVERITY_KEYWORDS = {
  high: ['urgent', 'emergency', 'danger', 'hazard', 'critical', 'severe', 'immediate'],
  medium: ['moderate', 'needs attention', 'problem', 'issue'],
  low: ['minor', 'small', 'slight'],
};

const normalizeText = (text = '') =>
  text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (text) =>
  normalizeText(text).split(' ').filter((word) => word.length > 2);

const jaccardSimilarity = (a, b) => {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (setA.size === 0 && setB.size === 0) {
    return 0;
  }

  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
};

const scoreCategory = (text, category) => {
  const keywords = CATEGORY_KEYWORDS[category] || [];
  const normalized = normalizeText(text);
  let score = 0;

  keywords.forEach((keyword) => {
    if (normalized.includes(keyword)) {
      score += keyword.split(' ').length > 1 ? 2 : 1;
    }
  });

  return score;
};

const classifyCategory = (title = '', description = '') => {
  const combined = `${title} ${description}`;
  const scores = COMPLAINT_CATEGORIES.map((category) => ({
    category,
    score: scoreCategory(combined, category),
  }));

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score === 0) {
    return 'others';
  }

  return scores[0].category;
};

const detectDuplicates = (complaint, nearbyComplaints = [], options = {}) => {
  const {
    textWeight = 0.6,
    distanceWeight = 0.4,
    maxDistanceKm = 2,
    minScore = 0.35,
  } = options;

  const sourceText = `${complaint.title || ''} ${complaint.description || ''}`;
  const sourceLat = complaint.latitude ?? complaint.location?.coordinates?.[1];
  const sourceLng = complaint.longitude ?? complaint.location?.coordinates?.[0];

  return nearbyComplaints
    .filter((candidate) => {
      const candidateId = candidate._id?.toString() || candidate.id?.toString();
      const complaintId = complaint._id?.toString() || complaint.id?.toString();
      return candidateId !== complaintId;
    })
    .map((candidate) => {
      const candidateText = `${candidate.title || ''} ${candidate.description || ''}`;
      const textScore = jaccardSimilarity(sourceText, candidateText);

      let distanceScore = 0;
      let distanceKm = null;

      const candidateLat = candidate.latitude ?? candidate.location?.coordinates?.[1];
      const candidateLng = candidate.longitude ?? candidate.location?.coordinates?.[0];

      if (
        sourceLat != null
        && sourceLng != null
        && candidateLat != null
        && candidateLng != null
      ) {
        distanceKm = haversineDistance(sourceLat, sourceLng, candidateLat, candidateLng);
        distanceScore = Math.max(0, 1 - distanceKm / maxDistanceKm);
      }

      const categoryBonus =
        complaint.category && candidate.category && complaint.category === candidate.category
          ? 0.1
          : 0;

      const score = Math.min(
        1,
        textScore * textWeight + distanceScore * distanceWeight + categoryBonus
      );

      return {
        complaintId: candidate._id || candidate.id,
        score: Math.round(score * 1000) / 1000,
        textScore: Math.round(textScore * 1000) / 1000,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 1000) / 1000 : null,
        title: candidate.title,
        category: candidate.category,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
};

const estimateSeverity = (category = 'others', description = '', priority = PRIORITY.MEDIUM) => {
  let severity = CATEGORY_SEVERITY_BASE[category] ?? CATEGORY_SEVERITY_BASE.others;
  const normalized = normalizeText(description);

  SEVERITY_KEYWORDS.high.forEach((keyword) => {
    if (normalized.includes(keyword)) {
      severity += 0.1;
    }
  });

  SEVERITY_KEYWORDS.low.forEach((keyword) => {
    if (normalized.includes(keyword)) {
      severity -= 0.05;
    }
  });

  const priorityBoost = {
    [PRIORITY.CRITICAL]: 0.15,
    [PRIORITY.HIGH]: 0.08,
    [PRIORITY.MEDIUM]: 0,
    [PRIORITY.LOW]: -0.05,
  };

  severity += priorityBoost[priority] ?? 0;
  severity = Math.max(0, Math.min(1, Math.round(severity * 1000) / 1000));

  let suggestedPriority = PRIORITY.MEDIUM;
  if (severity >= 0.85) {
    suggestedPriority = PRIORITY.CRITICAL;
  } else if (severity >= 0.65) {
    suggestedPriority = PRIORITY.HIGH;
  } else if (severity <= 0.35) {
    suggestedPriority = PRIORITY.LOW;
  }

  return {
    severity,
    suggestedPriority,
  };
};

const predictDepartment = (category = 'others') =>
  CATEGORY_DEPARTMENT_MAP[category] || CATEGORY_DEPARTMENT_MAP.others;

const estimateResolutionDays = (priority = PRIORITY.MEDIUM, severity = 0.5) => {
  const baseDays = RESOLUTION_DAYS_ESTIMATE[priority] ?? RESOLUTION_DAYS_ESTIMATE.medium;

  if (severity >= 0.85) {
    return Math.max(1, Math.ceil(baseDays * 0.5));
  }
  if (severity >= 0.65) {
    return Math.max(1, Math.ceil(baseDays * 0.75));
  }
  if (severity <= 0.35) {
    return Math.ceil(baseDays * 1.25);
  }

  return baseDays;
};

const truncateSummary = (title = '', description = '', maxLength = 200) => {
  const combined = `${title.trim()}. ${description.trim()}`.replace(/\s+/g, ' ').trim();

  if (combined.length <= maxLength) {
    return combined;
  }

  const truncated = combined.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
};

const generateSummaryWithOpenAI = async (title, description) => {
  if (!config.openaiApiKey) {
    return null;
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Summarize municipal grievance reports in 1-2 concise sentences for government officers. Use plain English.',
          },
          {
            role: 'user',
            content: `Title: ${title}\nDescription: ${description}`,
          },
        ],
        max_tokens: 120,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const summary = response.data?.choices?.[0]?.message?.content?.trim();
    return summary || null;
  } catch (error) {
    logger.warn('OpenAI summary generation failed', { message: error.message });
    return null;
  }
};

const generateSummary = async (title = '', description = '') => {
  const aiSummary = await generateSummaryWithOpenAI(title, description);
  if (aiSummary) {
    return aiSummary;
  }

  return truncateSummary(title, description);
};

const getCategoryLabel = (category, language = 'en') => {
  const lang = CATEGORY_LABELS[language] ? language : 'en';
  return CATEGORY_LABELS[lang][category] || CATEGORY_LABELS.en[category] || category;
};

const getCategoryLabels = (category) => ({
  en: getCategoryLabel(category, 'en'),
  hi: getCategoryLabel(category, 'hi'),
  ur: getCategoryLabel(category, 'ur'),
});

const analyzeComplaint = async ({
  title,
  description,
  priority,
  latitude,
  longitude,
  nearbyComplaints = [],
}) => {
  const category = classifyCategory(title, description);
  const { severity, suggestedPriority } = estimateSeverity(category, description, priority);
  const department = predictDepartment(category);
  const estimatedDays = estimateResolutionDays(suggestedPriority, severity);
  const summary = await generateSummary(title, description);
  const duplicates = detectDuplicates(
    { title, description, category, latitude, longitude },
    nearbyComplaints
  );

  return {
    category,
    severity,
    suggestedPriority,
    department,
    estimatedDays,
    summary,
    duplicates,
    labels: getCategoryLabels(category),
  };
};

module.exports = {
  classifyCategory,
  detectDuplicates,
  estimateSeverity,
  predictDepartment,
  estimateResolutionDays,
  generateSummary,
  getCategoryLabel,
  getCategoryLabels,
  analyzeComplaint,
  CATEGORY_LABELS,
};
