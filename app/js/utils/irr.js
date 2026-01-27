/**
 * Inter-Rater Reliability calculations.
 *
 * Approach: divide document text into fixed-size character units.
 * For each unit, record which codes each coder applied.
 * Calculate agreement from the resulting contingency matrix.
 */

/**
 * Cohen's Kappa for two coders.
 * @param {Object[]} coder1Segments - segments from coder 1: [{codeId, start:{offset}, end:{offset}}]
 * @param {Object[]} coder2Segments - segments from coder 2
 * @param {string[]} codeIds - the code IDs to evaluate
 * @param {number} docLength - total document character length
 * @param {number} unitSize - size of each unit in characters (default 50)
 * @returns {number} kappa value (-1 to 1)
 */
export function cohensKappa(coder1Segments, coder2Segments, codeIds, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  if (numUnits === 0) return 1;

  // For each code, build binary vectors for each coder
  let totalPo = 0;
  let totalPe = 0;
  let numCategories = 0;

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    let a = 0, b = 0, c = 0, d = 0; // a=both yes, b=c1 yes c2 no, c=c1 no c2 yes, d=both no
    for (let i = 0; i < numUnits; i++) {
      if (c1[i] && c2[i]) a++;
      else if (c1[i] && !c2[i]) b++;
      else if (!c1[i] && c2[i]) c++;
      else d++;
    }

    const po = (a + d) / numUnits;
    const pe = ((a + b) / numUnits) * ((a + c) / numUnits) +
               ((c + d) / numUnits) * ((b + d) / numUnits);

    totalPo += po;
    totalPe += pe;
    numCategories++;
  }

  if (numCategories === 0) return 1;
  const avgPo = totalPo / numCategories;
  const avgPe = totalPe / numCategories;

  if (avgPe === 1) return 1;
  return (avgPo - avgPe) / (1 - avgPe);
}

/**
 * Simple percent agreement between two coders.
 */
export function percentAgreement(coder1Segments, coder2Segments, codeIds, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  if (numUnits === 0) return 1;

  let totalAgree = 0;
  let totalUnits = 0;

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    for (let i = 0; i < numUnits; i++) {
      if (c1[i] === c2[i]) totalAgree++;
      totalUnits++;
    }
  }

  return totalUnits > 0 ? totalAgree / totalUnits : 1;
}

/**
 * Generate disagreement report.
 */
export function disagreementReport(coder1Segments, coder2Segments, codeIds, codes, docLength, unitSize = 50) {
  const numUnits = Math.ceil(docLength / unitSize);
  const codeMap = {};
  for (const c of codes) codeMap[c.id] = c;
  const disagreements = [];

  for (const codeId of codeIds) {
    const c1 = buildCodingVector(coder1Segments, codeId, numUnits, unitSize);
    const c2 = buildCodingVector(coder2Segments, codeId, numUnits, unitSize);

    for (let i = 0; i < numUnits; i++) {
      if (c1[i] !== c2[i]) {
        const offset = i * unitSize;
        disagreements.push({
          codeId,
          codeName: codeMap[codeId]?.name || codeId,
          unitIndex: i,
          offsetStart: offset,
          offsetEnd: Math.min(offset + unitSize, docLength),
          coder1Applied: c1[i],
          coder2Applied: c2[i]
        });
      }
    }
  }

  return disagreements;
}

function buildCodingVector(segments, codeId, numUnits, unitSize) {
  const vector = new Uint8Array(numUnits);
  for (const seg of segments) {
    if (seg.codeId !== codeId) continue;
    const start = seg.start?.offset || 0;
    const end = seg.end?.offset || 0;
    const startUnit = Math.floor(start / unitSize);
    const endUnit = Math.min(Math.ceil(end / unitSize), numUnits);
    for (let i = startUnit; i < endUnit; i++) {
      vector[i] = 1;
    }
  }
  return vector;
}
