# ShramSaathi Razorpay Test-Mode Payment Integration

This patch replaces the existing mock customer payment completion flow with Razorpay Standard Checkout in Test Mode.

## Payment flow

1. Worker completes the booking.
2. The booking's existing `final_amount` becomes the amount payable by the customer.
3. Customer taps **Pay** on the completed booking.
4. Backend validates the customer owns the booking and creates a Razorpay Order using the exact final amount (INR paise).
5. Mobile opens Razorpay Checkout with that server-created `order_id`.
6. Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` after a successful test payment.
7. Backend verifies the signature using the server-side Razorpay secret and confirms the Razorpay payment is captured and matches the stored order/amount.
8. Backend marks the existing `payments` row as `paid` and creates the existing fair-share ledger.
9. The worker dashboard refreshes from the booking/payment state and shows the worker's existing 80% share as received.

## Backend environment

Add these to the backend `.env` using **Razorpay Test Mode** credentials:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
```

Never put `RAZORPAY_KEY_SECRET` in the mobile app.

## Mobile native dependency

From `MobileApp`:

```bash
npx expo install react-native-razorpay expo-dev-client
npx expo prebuild
npx expo run:android --device
```

After the development build is installed:

```bash
npx expo start --dev-client
```

Razorpay's React Native SDK is a native module, so the payment checkout does not run inside Expo Go. A development/native build is required.

## Test payment

Use only Razorpay Test Mode keys while testing. Test-mode payments are simulated and do not deduct real money.

## Database

No Prisma schema or database migration is required. The existing `payments` fields (`provider`, `provider_payment_id`, `status`, `paid_at`) are reused for Razorpay, and the existing `fair_share_ledger` is reused after successful payment.

## Files changed for Razorpay

- `backend/src/controllers/payment.controller.js`
- `backend/src/routes/payment.routes.js`
- `MobileApp/src/api.ts`
- `MobileApp/src/app/userdashboard/UserDashboard.tsx`
- `MobileApp/src/types-razorpay.d.ts`
- `MobileApp/package.json`

`backend/src/services/booking.service.js` is included in this patch only to preserve the previously fixed raw-SQL worker acceptance/subskill issue; it is not otherwise modified for payments.

## Important

The existing worker earning calculation is not replaced with a second payment calculation. It continues to use the booking amount and existing 80% share, and only paid bookings contribute to the worker's paid earnings.
