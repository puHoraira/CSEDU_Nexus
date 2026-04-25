const axios = require("axios");
const { PaymentStrategy } = require("./PaymentStrategy");
const { ApiError } = require("../../core/ApiError");

/**
 * bKash Payment Gateway Strategy
 * Implements bKash PGW API for payment processing
 */
class BkashPaymentStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.baseUrl = process.env.BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    this.appKey = process.env.BKASH_APP_KEY;
    this.appSecret = process.env.BKASH_APP_SECRET;
    this.username = process.env.BKASH_USERNAME;
    this.password = process.env.BKASH_PASSWORD;
    this.callbackUrl = process.env.BKASH_CALLBACK_URL || "http://localhost:5000/api/v1/payments/bkash/callback";
    this.token = null;
    this.tokenExpiry = null;
  }

  async getAuthToken() {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/token/grant`,
        {
          app_key: this.appKey,
          app_secret: this.appSecret,
        },
        {
          headers: {
            "Content-Type": "application/json",
            username: this.username,
            password: this.password,
          },
        }
      );

      this.token = response.data.id_token;
      // Token expires in 1 hour, cache for 55 minutes
      this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
      return this.token;
    } catch (error) {
      console.error("bKash auth error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to authenticate with bKash");
    }
  }

  async initiatePayment(params) {
    const { transactionId, amount, customerInfo, metadata } = params;

    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/create`,
        {
          mode: "0011", // Tokenized checkout
          payerReference: customerInfo.phone || customerInfo.email,
          callbackURL: this.callbackUrl,
          amount: amount.toString(),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: transactionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
            "X-APP-Key": this.appKey,
          },
        }
      );

      return {
        success: true,
        paymentId: response.data.paymentID,
        bkashURL: response.data.bkashURL,
        transactionId,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("bKash payment initiation error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to initiate bKash payment");
    }
  }

  async verifyPayment(transactionId, gatewayResponse) {
    const { paymentID } = gatewayResponse;

    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/execute`,
        {
          paymentID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
            "X-APP-Key": this.appKey,
          },
        }
      );

      const isSuccess = response.data.transactionStatus === "Completed";

      return {
        success: isSuccess,
        transactionId: response.data.trxID,
        paymentId: response.data.paymentID,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        status: response.data.transactionStatus,
        paymentTime: response.data.paymentExecuteTime,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("bKash payment verification error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || "Payment verification failed",
        gatewayResponse: error.response?.data,
      };
    }
  }

  async processRefund(transactionId, amount, reason) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/payment/refund`,
        {
          paymentID: transactionId,
          amount: amount.toString(),
          trxID: transactionId,
          sku: "refund",
          reason: reason || "Customer requested refund",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
            "X-APP-Key": this.appKey,
          },
        }
      );

      return {
        success: response.data.transactionStatus === "Completed",
        refundId: response.data.refundTrxID,
        originalTransactionId: response.data.originalTrxID,
        amount: parseFloat(response.data.amount),
        status: response.data.transactionStatus,
        refundTime: response.data.completedTime,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("bKash refund error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to process bKash refund");
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/payment/status`,
        {
          paymentID: transactionId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
            "X-APP-Key": this.appKey,
          },
        }
      );

      return {
        success: true,
        status: response.data.transactionStatus,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("bKash status check error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to check bKash payment status");
    }
  }
}

module.exports = { BkashPaymentStrategy };
