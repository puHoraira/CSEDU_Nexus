const { policyRegistry } = require("./PolicyRegistry");
const { canRegisterMember } = require("./membershipPolicies");
const { canHoldPost } = require("./ecPolicies");

policyRegistry.register("membership.register", canRegisterMember);
policyRegistry.register("ec.holdPost", canHoldPost);

module.exports = { policyRegistry };
