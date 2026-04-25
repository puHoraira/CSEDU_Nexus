const { BkashPaymentStrategy } = require("./BkashPaymentStrategy");
const { SSLCommerzPaymentStrategy } = require("./SSLCommerzPaymentStrategy");
const { ApiError } = require("../../core/ApiError");

/**
 * Payment Factory
 * Creates appropriate payment strategy based on payment method
 */
class PaymentFactory {
  static strategies = {
    bKash: BkashPaymentStrategy,
    Nagad: null, // To be implemented
    Rocket: null, // To be implemented
    SSLCommerz: SSLCommerzPaymentStrategy,
    Stripe: null, // To be implemented
  };

  /**
   * Get payment processor for specified method
   * @param {string} paymentMethod - Payment method (bKash, Nagad, SSLCommerz, etc.)
   * @returns {PaymentStrategy} Payment strategy instance
   */
  static getPaymentProcessor(paymentMethod) {
    // Free and Cash don't need payment processors
    if (paymentMethod === "Free" || paymentMethod === "Cash") {
      return null;
    }

    const StrategyClass = this.strategies[paymentMethod];
    
    if (!StrategyClass) {
      throw new ApiError(400, `Payment method ${paymentMethod} is not supported yet`);
    }

    return new StrategyClass();
  }

  /**
   * Check if payment method is supported
   * @param {string} paymentMethod - Payment method to check
   * @returns {boolean} True if supported
   */
  static isSupported(paymentMethod) {
    if (paymentMethod === "Free" || paymentMethod === "Cash") {
      return true;
    }
    return this.strategies[paymentMethod] !== null && this.strategies[paymentMethod] !== undefined;
  }

  /**
   * Get list of supported payment methods
   * @returns {string[]} Array of supported payment methods
   */
  static getSupportedMethods() {
    const methods = ["Free", "Cash"];
    
    for (const [method, strategy] of Object.entries(this.strategies)) {
      if (strategy !== null) {
        methods.push(method);
      }
    }
    
    return methods;
  }
}

module.exports = { PaymentFactory };
