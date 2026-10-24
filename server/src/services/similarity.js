const { db } = require('../storage/db');

// Common English and bureaucratic stopwords
const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'of', 'for', 'with', 'by',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
  'should', 'now', 'complaint', 'institution', 'college', 'regarding', 'reported', 'student',
  'students', 'faculty', 'management', 'campus', 'aicte', 'matter', 'submitted'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

function computeTermFrequency(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
}

function calculateCosineSimilarity(tf1, tf2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const word in tf1) {
    mag1 += tf1[word] * tf1[word];
    if (tf2[word]) {
      dotProduct += tf1[word] * tf2[word];
    }
  }

  for (const word in tf2) {
    mag2 += tf2[word] * tf2[word];
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Evaluates similarity between a target case and other cases at the same institution
 * @param {Object} targetCase - The newly registered or selected case
 * @returns {Promise<Array>} List of similar matches with scores, explanations, and shared keywords
 */
async function findSimilarCases(targetCase) {
  const allCases = await db.cases.find();
  const targetTokens = tokenize(`${targetCase.category} ${targetCase.description}`);
  const targetTf = computeTermFrequency(targetTokens);

  const results = [];

  for (const other of allCases) {
    if (other.id === targetCase.id) continue;

    // Signal 1: Same institution (heavy positive factor: 25 base points)
    const isSameInstitution = other.institutionId === targetCase.institutionId;
    
    // Signal 2: Category match (30 base points if exact, 15 if same department)
    let categoryScore = 0;
    if (other.category.toLowerCase().trim() === targetCase.category.toLowerCase().trim()) {
      categoryScore = 30;
    } else if (other.department.toLowerCase().trim() === targetCase.department.toLowerCase().trim()) {
      categoryScore = 15;
    }

    // Signal 3: Tokenized TF-IDF Cosine Similarity of description (0-45 points)
    const otherTokens = tokenize(`${other.category} ${other.description}`);
    const otherTf = computeTermFrequency(otherTokens);
    const cosineSim = calculateCosineSimilarity(targetTf, otherTf);
    const textScore = Math.round(cosineSim * 45);

    // Common extracted keywords
    const sharedKeywords = targetTokens.filter(token => otherTokens.includes(token));
    const uniqueSharedKeywords = Array.from(new Set(sharedKeywords)).slice(0, 6);

    let totalScore = 0;
    if (isSameInstitution) {
      totalScore = 25 + categoryScore + textScore;
    } else {
      // Cross-institution only matches if very high text & category similarity
      totalScore = Math.round((categoryScore + textScore) * 0.7);
    }

    // Cap at 98
    totalScore = Math.min(98, Math.max(0, totalScore));

    // Threshold for potential similar complaint: score >= 60
    if (totalScore >= 60) {
      let explanation = '';
      if (isSameInstitution) {
        explanation = `Shares identical institution (${targetCase.institutionName || 'Same Institution'})`;
        if (categoryScore >= 30) {
          explanation += `, identical complaint category "${targetCase.category}"`;
        }
        if (uniqueSharedKeywords.length > 0) {
          explanation += `, and key vocabulary: [${uniqueSharedKeywords.join(', ')}]`;
        }
      } else {
        explanation = `Cross-institution correlation with matching category and overlapping terminology: [${uniqueSharedKeywords.join(', ')}]`;
      }

      results.push({
        case: other,
        similarityScore: totalScore,
        sharedKeywords: uniqueSharedKeywords,
        isSameInstitution,
        categoryMatch: categoryScore >= 30,
        explanation
      });
    }
  }

  // Sort by highest similarity score first
  results.sort((a, b) => b.similarityScore - a.similarityScore);
  return results;
}

module.exports = {
  findSimilarCases,
  tokenize
};
