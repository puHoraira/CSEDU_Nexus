/**
 * Payment Strategy Interface
 * Base class for all payment gateway implementations
 */
class PaymentStrategy {
  /**
   * Initialize payment and get payment URL/data
   * @param {Object} params - Payment parameters
   * @param {string} params.transactionId - Unique transaction ID
   * @param {number} params.amount - Payment amount
   * @param {string} params.currency - Currency code (BDT, USD, etc.)
   * @param {Object} params.customerInfo - Customer information
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Payment initialization response
   */
  async initiatePayment(params) {
    throw new Error("initiatePayment() must be implemented by subclass");
  }

  /**
   * Verify payment status
   * @param {string} transactionId - Transaction ID to verify
   * @param {Object} gatewayResponse - Response from payment gateway
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(transactionId, gatewayResponse) {
    throw new Error("verifyPayment() must be implemented by subclass");
  }

  /**
   * Process refund
   * @param {string} transactionId - Original transaction ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(transactionId, amount, reason) {
    throw new Error("processRefund() must be implemented by subclass");
  }

  /**
   * Get payment status
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(transactionId) {
    throw new Error("getPaymentStatus() must be implemented by subclass");
  }
}

module.exports = { PaymentStrategy };
