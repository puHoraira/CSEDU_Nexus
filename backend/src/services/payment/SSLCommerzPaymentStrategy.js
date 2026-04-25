const axios = require("axios");
const { PaymentStrategy } = require("./PaymentStrategy");
const { ApiError } = require("../../core/ApiError");

/**
 * SSLCommerz Payment Gateway Strategy
 * Implements SSLCommerz API for payment processing
 */
class SSLCommerzPaymentStrategy extends PaymentStrategy {
  constructor() {
    super();
    this.isSandbox = process.env.SSLCOMMERZ_MODE === "sandbox";
    this.baseUrl = this.isSandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    this.storeId = process.env.SSLCOMMERZ_STORE_ID;
    this.storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    this.successUrl = process.env.SSLCOMMERZ_SUCCESS_URL || "http://localhost:5000/api/v1/payments/sslcommerz/success";
    this.failUrl = process.env.SSLCOMMERZ_FAIL_URL || "http://localhost:5000/api/v1/payments/sslcommerz/fail";
    this.cancelUrl = process.env.SSLCOMMERZ_CANCEL_URL || "http://localhost:5000/api/v1/payments/sslcommerz/cancel";
    this.ipnUrl = process.env.SSLCOMMERZ_IPN_URL || "http://localhost:5000/api/v1/payments/sslcommerz/ipn";
  }

  async initiatePayment(params) {
    const { transactionId, amount, currency = "BDT", customerInfo, metadata } = params;

    try {
      const paymentData = {
        store_id: this.storeId,
        store_passwd: this.storePassword,
        total_amount: amount,
        currency: currency,
        tran_id: transactionId,
        success_url: this.successUrl,
        fail_url: this.failUrl,
        cancel_url: this.cancelUrl,
        ipn_url: this.ipnUrl,
        
        // Customer information
        cus_name: customerInfo.name,
        cus_email: customerInfo.email,
        cus_add1: customerInfo.address || "N/A",
        cus_city: customerInfo.city || "Dhaka",
        cus_country: customerInfo.country || "Bangladesh",
        cus_phone: customerInfo.phone,
        cus_postcode: customerInfo.postcode || "1000",
        
        // Product information
        product_name: metadata.productName || "Event Registration",
        product_category: metadata.category || "Event",
        product_profile: "general",
        
        // Shipping information (required by SSLCommerz)
        shipping_method: "NO",
        num_of_item: 1,
        
        // Additional parameters
        value_a: metadata.eventId || "",
        value_b: metadata.userId || "",
        value_c: metadata.registrationId || "",
      };

      const response = await axios.post(
        `${this.baseUrl}/gwprocess/v4/api.php`,
        new URLSearchParams(paymentData).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.status === "SUCCESS") {
        return {
          success: true,
          sessionKey: response.data.sessionkey,
          gatewayPageURL: response.data.GatewayPageURL,
          transactionId,
          gatewayResponse: response.data,
        };
      } else {
        throw new ApiError(500, response.data.failedreason || "Payment initiation failed");
      }
    } catch (error) {
      console.error("SSLCommerz payment initiation error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to initiate SSLCommerz payment");
    }
  }

  async verifyPayment(transactionId, gatewayResponse) {
    const { val_id } = gatewayResponse;

    if (!val_id) {
      return {
        success: false,
        error: "Missing validation ID",
      };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/validator/api/validationserverAPI.php`,
        {
          params: {
            val_id: val_id,
            store_id: this.storeId,
            store_passwd: this.storePassword,
            format: "json",
          },
        }
      );

      const isSuccess = response.data.status === "VALID" || response.data.status === "VALIDATED";

      return {
        success: isSuccess,
        transactionId: response.data.tran_id,
        validationId: response.data.val_id,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency,
        status: response.data.status,
        cardType: response.data.card_type,
        cardIssuer: response.data.card_issuer,
        bankTransactionId: response.data.bank_tran_id,
        paymentTime: response.data.tran_date,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("SSLCommerz payment verification error:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.failedreason || "Payment verification failed",
        gatewayResponse: error.response?.data,
      };
    }
  }

  async processRefund(transactionId, amount, reason) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        {
          params: {
            refund_amount: amount,
            refund_remarks: reason || "Customer requested refund",
            tran_id: transactionId,
            store_id: this.storeId,
            store_passwd: this.storePassword,
            format: "json",
          },
        }
      );

      return {
        success: response.data.status === "success",
        refundId: response.data.refund_ref_id,
        originalTransactionId: transactionId,
        amount: parseFloat(amount),
        status: response.data.status,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("SSLCommerz refund error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to process SSLCommerz refund");
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
        {
          params: {
            tran_id: transactionId,
            store_id: this.storeId,
            store_passwd: this.storePassword,
            format: "json",
          },
        }
      );

      return {
        success: true,
        status: response.data.status,
        amount: parseFloat(response.data.amount),
        currency: response.data.currency_type,
        gatewayResponse: response.data,
      };
    } catch (error) {
      console.error("SSLCommerz status check error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to check SSLCommerz payment status");
    }
  }
}

module.exports = { SSLCommerzPaymentStrategy };
