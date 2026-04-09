function canHoldPost({ memberYear, memberEcYears, post }) {
  if (post.minYear && memberYear < post.minYear) {
    return {
      allowed: false,
      reason: `Minimum year ${post.minYear} required for ${post.title}`,
    };
  }

  if (post.minEcYears && memberEcYears < post.minEcYears) {
    return {
      allowed: false,
      reason: `Minimum EC experience ${post.minEcYears} years required for ${post.title}`,
    };
  }

  return { allowed: true };
}

module.exports = { canHoldPost };
