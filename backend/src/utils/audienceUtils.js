/**
 * Audience targeting utilities
 * Used by Events, Workshops, Meetings to check batch/year/role/invite eligibility
 */

/**
 * Check if a user matches a targetAudience spec.
 * Empty arrays = open to all.
 *
 * @param {object} targetAudience  - { allowedYears, allowedBatches, programType, allowedRoles, invitedUsers }
 * @param {object} member          - { batch, currentYear }
 * @param {string} userId          - The user ID to check
 * @param {Array<string>} userRoles - Array of role names the user has
 * @returns {{ eligible: boolean, reason: string|null }}
 */
function checkAudienceEligibility(targetAudience, member, userId = null, userRoles = []) {
  if (!targetAudience) return { eligible: true, reason: null };

  const { 
    allowedYears = [], 
    allowedBatches = [], 
    allowedRoles = [],
    invitedUsers = []
  } = targetAudience;

  // Check if user is explicitly invited
  if (invitedUsers.length > 0 && userId) {
    const isInvited = invitedUsers.some(id => id.toString() === userId.toString());
    if (isInvited) {
      return { eligible: true, reason: null }; // Invited users bypass other filters
    }
  }

  // Check role-based access
  if (allowedRoles.length > 0) {
    const hasRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return {
        eligible: false,
        reason: `This is restricted to users with roles: ${allowedRoles.join(', ')}.`,
      };
    }
  }

  // Check year-based access (if member info available)
  if (member && allowedYears.length > 0 && !allowedYears.includes(member.currentYear)) {
    return {
      eligible: false,
      reason: `This is targeted at Year ${allowedYears.join(', ')} students only (you are Year ${member.currentYear}).`,
    };
  }

  // Check batch-based access (if member info available)
  if (member && allowedBatches.length > 0 && !allowedBatches.includes(member.batch)) {
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

/**
 * Filter items to only show those relevant to the user's year/batch/role/invite.
 * Removes items that don't match the target audience.
 *
 * @param {Array} items
 * @param {object} member - { batch, currentYear }
 * @param {string} userId - The user ID to check invitations
 * @param {Array<string>} userRoles - Array of role names the user has
 * @returns {Array} Filtered items
 */
function filterByAudience(items, member = null, userId = null, userRoles = []) {
  return items.filter(item => {
    const ta = item.targetAudience || {};
    const hasYears    = Array.isArray(ta.allowedYears)   && ta.allowedYears.length > 0;
    const hasBatches  = Array.isArray(ta.allowedBatches) && ta.allowedBatches.length > 0;
    const hasRoles    = Array.isArray(ta.allowedRoles)   && ta.allowedRoles.length > 0;
    const hasInvites  = Array.isArray(ta.invitedUsers)   && ta.invitedUsers.length > 0;

    // If no targeting at all, it's open to all
    if (!hasYears && !hasBatches && !hasRoles && !hasInvites) return true;

    // Check if user is explicitly invited (bypasses other filters)
    if (hasInvites && userId) {
      const isInvited = ta.invitedUsers.some(id => id.toString() === userId.toString());
      if (isInvited) return true;
    }

    // Check role-based access
    if (hasRoles) {
      const hasRole = userRoles.some(role => ta.allowedRoles.includes(role));
      if (!hasRole) return false; // User doesn't have required role
    }

    // Check year/batch (if member info available)
    if (member) {
      const yearMatch   = !hasYears   || ta.allowedYears.includes(member.currentYear);
      const batchMatch  = !hasBatches || ta.allowedBatches.includes(member.batch);

      // If we're filtering by year/batch, user must match
      if (hasYears || hasBatches) {
        return yearMatch && batchMatch;
      }
    }

    // If we only have role filtering and user passed role check, show it
    if (hasRoles && !hasYears && !hasBatches) return true;

    return true; // Default: show it
  });
}

/**
 * Does the item have ANY custom targeting (batch / year / role / invited users)?
 * @param {object} targetAudience
 * @returns {boolean}
 */
function hasTargeting(targetAudience) {
  const ta = targetAudience || {};
  return (
    (Array.isArray(ta.allowedYears) && ta.allowedYears.length > 0) ||
    (Array.isArray(ta.allowedBatches) && ta.allowedBatches.length > 0) ||
    (Array.isArray(ta.allowedRoles) && ta.allowedRoles.length > 0) ||
    (Array.isArray(ta.invitedUsers) && ta.invitedUsers.length > 0)
  );
}

/**
 * Single source of truth for "can this user access this targeted item?".
 * Covers the whole custom system: invited users OR batch OR year OR role.
 * An item with no targeting is open to everyone.
 *
 * @param {object} targetAudience - { allowedYears, allowedBatches, allowedRoles, invitedUsers }
 * @param {object|null} member    - { batch, currentYear }
 * @param {string|null} userId
 * @param {Array<string>} userRoles
 * @returns {boolean}
 */
function isUserInAudience(targetAudience, member = null, userId = null, userRoles = []) {
  const ta = targetAudience || {};
  if (!hasTargeting(ta)) return true; // open to all

  const allowedYears = Array.isArray(ta.allowedYears) ? ta.allowedYears : [];
  const allowedBatches = Array.isArray(ta.allowedBatches) ? ta.allowedBatches : [];
  const allowedRoles = Array.isArray(ta.allowedRoles) ? ta.allowedRoles : [];
  const invitedUsers = Array.isArray(ta.invitedUsers) ? ta.invitedUsers : [];

  // Explicitly invited → always allowed.
  if (invitedUsers.length > 0 && userId) {
    if (invitedUsers.some((id) => id.toString() === userId.toString())) return true;
  }

  // Role match.
  if (allowedRoles.length > 0 && userRoles.some((r) => allowedRoles.includes(r))) return true;

  // Batch / year match (needs member context).
  if (member) {
    if (allowedYears.length > 0 && allowedYears.includes(member.currentYear)) return true;
    if (allowedBatches.length > 0 && allowedBatches.includes(member.batch)) return true;
  }

  return false;
}

module.exports = { 
  checkAudienceEligibility, 
  buildAudienceFilter, 
  annotateAudienceRelevance,
  filterByAudience,
  hasTargeting,
  isUserInAudience,
};