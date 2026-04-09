class PolicyRegistry {
  constructor() {
    this.policies = new Map();
  }

  register(key, policyHandler) {
    this.policies.set(key, policyHandler);
  }

  get(key) {
    return this.policies.get(key);
  }

  async evaluate(key, input) {
    const policy = this.get(key);
    if (!policy) {
      throw new Error(`Policy not found: ${key}`);
    }
    return policy(input);
  }
}

const policyRegistry = new PolicyRegistry();

module.exports = { policyRegistry };
