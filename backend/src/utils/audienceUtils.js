/**
 * Audience targeting utilities
 * Used by Events, Workshops, Meetings to check batch/year eligibility
 */

/**
 * Check if a member matches a targetAudience spec.
 * Empty arrays = open to all.
 *
 * @param {object} targetAudience  - { allowedYears, allowedBatches, programType }
 * @param {object} member          - { batch, currentYear }
 * @returns {{ eligible: boolean, reason: string|null }}
 */
function checkAudienceEligibility(targetAudience, member) {
  if (!targetAudience) return { eligible: true, reason: null };

  const { allowedYears = [], allowedBatches = [] } = targetAudience;

  if (allowedYears.length > 0 && !allowedYears.includes(member.currentYear)) {
    return {
      eligible: false,
      reason: `This is targeted at Year ${allowedYears.join(', ')} students only (you are Year ${member.currentYear}).`,
    };
  }

  if (allowedBatches.length > 0 && !allowedBatches.includes(member.batch)) {
    return {
      eligible: false,
      reason: `This is targeted at Batch ${allowedBatches.join(', ')} only (you are Batch ${member.batch}).`,
    };
  }

  return { eligible: true, reason: null };
}

/**
 * Build a MongoDB filter query for audience targeting.
 * Returns a filter that matches items open to all OR specifically targeting this member.
 *
 * @param {object} member - { batch, currentYear }
 * @returns {object} MongoDB $or query fragment
 */
function buildAudienceFilter(member) {
  if (!member) return {};

  return {
    $or: [
      // Open to all (empty arrays)
      { 'targetAudience.allowedYears': { $size: 0 }, 'targetAudience.allowedBatches': { $size: 0 } },
      // No targetAudience field at all
      { targetAudience: { $exists: false } },
      // Matches this member's year
      { 'targetAudience.allowedYears': member.currentYear },
      // Matches this member's batch
      { 'targetAudience.allowedBatches': member.batch },
    ],
  };
}

/**
 * Annotate a list of items with audience relevance for a given member.
 * Adds `_audienceMatch` field: 'targeted' | 'open' | 'excluded'
 *
 * @param {Array} items
 * @param {object} member - { batch, currentYear }
 * @returns {Array}
 */
function annotateAudienceRelevance(items, member) {
  if (!member) return items.map(item => ({ ...item, _audienceMatch: 'open' }));

  return items.map(item => {
    const ta = item.targetAudience || {};
    const hasYears   = Array.isArray(ta.allowedYears)   && ta.allowedYears.length > 0;
    const hasBatches = Array.isArray(ta.allowedBatches) && ta.allowedBatches.length > 0;

    if (!hasYears && !hasBatches) {
      return { ...item, _audienceMatch: 'open' };
    }

    const yearMatch   = !hasYears   || ta.allowedYears.includes(member.currentYear);
    const batchMatch  = !hasBatches || ta.allowedBatches.includes(member.batch);

    if (yearMatch && batchMatch) {
      return { ...item, _audienceMatch: 'targeted' };
    }

    return { ...item, _audienceMatch: 'excluded' };
  });
}

module.exports = { checkAudienceEligibility, buildAudienceFilter, annotateAudienceRelevance };
