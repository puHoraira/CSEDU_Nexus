# Event Registration & Payment System

## Overview
Complete event registration system with integrated payment gateway support for both Bangladeshi (bKash, SSLCommerz) and international payment methods.

## Architecture

### Design Patterns Used
1. **Strategy Pattern** - Payment gateway implementations
2. **Factory Pattern** - Payment processor creation
3. **Service Layer Pattern** - Business logic separation

## Backend Implementation

### Models
- **EventRegistration** (`backend/src/models/EventRegistration.js`)
  - Registration details with unique registration numbers
  - Payment tracking (status, method, transaction ID)
  - Attendee information
  - Attendance tracking
  - Support for multiple payment gateways

### Payment Strategy System
- **PaymentStrategy** (`backend/src/services/payment/PaymentStrategy.js`)
  - Base interface for all payment gateways
  - Methods: initiatePayment, verifyPayment, processRefund, getPaymentStatus

- **BkashPaymentStrategy** (`backend/src/services/payment/BkashPaymentStrategy.js`)
  - bKash PGW API integration
  - Token-based authentication with caching
  - Sandbox support

- **SSLCommerzPaymentStrategy** (`backend/src/services/payment/SSLCommerzPaymentStrategy.js`)
  - SSLCommerz payment gateway integration
  - Support for cards and mobile banking
  - Sandbox/production mode switching

- **PaymentFactory** (`backend/src/services/payment/PaymentFactory.js`)
  - Creates appropriate payment processor based on method
  - Validates payment method support
  - Returns null for Free/Cash payments

### Services
- **EventRegistrationService** (`backend/src/services/EventRegistrationService.js`)
  - `registerForEvent()` - Handle event registration with validation
  - `initiatePayment()` - Start payment process with gateway
  - `verifyPayment()` - Verify payment completion
  - `cancelRegistration()` - Cancel with automatic refund
  - `getRegistration()` - Get registration details
  - `getUserRegistrations()` - List user's registrations
  - `getEventRegistrations()` - List event registrations (organizers)

### Controllers & Routes
- **EventRegistrationController** (`backend/src/controllers/EventRegistrationController.js`)
- **Routes** (`backend/src/routes/eventRegistrationRoutes.js`)
  - `POST /api/v1/events/:eventId/register` - Register for event
  - `POST /api/v1/registrations/:registrationId/payment/initiate` - Start payment
  - `POST /api/v1/registrations/:registrationId/payment/verify` - Verify payment
  - `POST /api/v1/registrations/:registrationId/cancel` - Cancel registration
  - `GET /api/v1/registrations/my` - Get user's registrations
  - `GET /api/v1/registrations/:registrationId` - Get registration details
  - `GET /api/v1/events/:eventId/registrations` - Get event registrations (organizers)
  - Payment gateway callbacks (bKash, SSLCommerz)

## Frontend Implementation

### Pages
1. **EventRegistrationPage** (`frontend/src/pages/events/EventRegistrationPage.tsx`)
   - Event summary sidebar with details
   - Registration form with attendee information
   - Payment method selection (bKash, SSLCommerz, Cash)
   - Validation and error handling
   - Auto-redirect to payment page

2. **EventPaymentPage** (`frontend/src/pages/events/EventPaymentPage.tsx`)
   - Payment details display
   - Initiate payment button
   - Auto-verification from gateway callbacks
   - Payment status tracking
   - Success/failure handling

3. **EventDetailPage** (Updated)
   - Added "Register for Event" button in sidebar
   - Shows registration fee if applicable
   - Positioned above volunteer application

### Routes
- `/dashboard/events/:eventId/register` - Registration page
- `/dashboard/events/:eventId/registration/:registrationId/payment` - Payment page

### Styling
- Responsive layout with sidebar
- Payment method cards with radio selection
- Status badges for payment states
- Loading spinners and success animations
- Dark mode support

## Payment Gateway Configuration

### Environment Variables (`.env`)
```env
# bKash (Sandbox)
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_APP_KEY=your_app_key
BKASH_APP_SECRET=your_app_secret
BKASH_USERNAME=your_username
BKASH_PASSWORD=your_password
BKASH_CALLBACK_URL=http://localhost:5000/api/v1/payments/bkash/callback

# SSLCommerz (Sandbox)
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_SUCCESS_URL=http://localhost:5000/api/v1/payments/sslcommerz/success
SSLCOMMERZ_FAIL_URL=http://localhost:5000/api/v1/payments/sslcommerz/fail
SSLCOMMERZ_CANCEL_URL=http://localhost:5000/api/v1/payments/sslcommerz/cancel
SSLCOMMERZ_IPN_URL=http://localhost:5000/api/v1/payments/sslcommerz/ipn

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## Features

### Registration Features
- ✅ Event capacity checking
- ✅ Registration date validation
- ✅ Waitlist support
- ✅ Approval workflow (optional)
- ✅ Unique registration numbers
- ✅ Attendee information collection
- ✅ Special requirements field

### Payment Features
- ✅ Multiple payment methods (bKash, SSLCommerz, Cash, Free)
- ✅ Secure payment gateway integration
- ✅ Payment verification
- ✅ Transaction tracking
- ✅ Automatic refunds on cancellation
- ✅ Payment status monitoring
- ✅ Gateway callback handling

### User Experience
- ✅ Clean, modern UI
- ✅ Step-by-step registration flow
- ✅ Real-time validation
- ✅ Payment status updates
- ✅ Email notifications (via NotificationService)
- ✅ Audit logging (via AuditService)

## Payment Flow

### Registration Flow
1. User clicks "Register for Event" on event detail page
2. Fills registration form with attendee info
3. Selects payment method (if fee required)
4. Submits registration
5. System creates registration record
6. If payment required and not Cash:
   - Redirects to payment page
   - User clicks "Pay" button
   - Redirects to payment gateway
   - User completes payment
   - Gateway redirects back with payment info
   - System verifies payment
   - Updates registration status to "Confirmed"
7. If Cash or Free:
   - Registration confirmed immediately (or pending approval)

### Cancellation Flow
1. User requests cancellation
2. System checks payment status
3. If payment completed:
   - Initiates refund with gateway
   - Updates payment status to "Refunded"
4. Updates registration status to "Cancelled"
5. Updates event statistics

## Database Schema

### EventRegistration Fields
- `eventId` - Reference to Event
- `userId` - Reference to User
- `memberId` - Reference to Member (optional)
- `registrationNumber` - Unique identifier (REG-XXXXXX-0001)
- `status` - Pending, Confirmed, Waitlisted, Cancelled, Attended
- `paymentRequired` - Boolean
- `paymentStatus` - Not_Required, Pending, Completed, Failed, Refunded
- `paymentAmount` - Registration fee
- `paymentMethod` - bKash, Nagad, Rocket, SSLCommerz, Stripe, Cash, Free
- `paymentTransactionId` - Gateway transaction ID
- `paymentGatewayResponse` - Full gateway response
- `paymentDate` - Payment completion date
- `attendeeInfo` - Name, email, phone, organization, designation, special requirements
- `checkInTime`, `checkOutTime`, `attendanceMarked` - Attendance tracking
- Timestamps and metadata

## Future Enhancements
- [ ] Nagad payment gateway integration
- [ ] Rocket payment gateway integration
- [ ] Stripe payment gateway integration
- [ ] QR code for registration confirmation
- [ ] Email receipts with PDF
- [ ] Bulk registration for groups
- [ ] Early bird pricing
- [ ] Discount codes/coupons
- [ ] Partial refunds
- [ ] Registration transfer between users

## Testing
To test payment gateways:
1. Get sandbox credentials from bKash/SSLCommerz
2. Add credentials to `.env` file
3. Create an event with registration fee
4. Register for the event
5. Complete payment using test credentials
6. Verify payment completion

## Dependencies
- `axios` - HTTP client for payment gateway APIs
- Existing: `mongoose`, `express`, `@tanstack/react-query`
