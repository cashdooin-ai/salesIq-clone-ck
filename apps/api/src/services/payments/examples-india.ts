/**
 * India Payment Gateways - Usage Examples
 * Demonstrates how to use Instamojo, Paytm, and UPI services
 */

import {
  createInstamojoService,
  createPaytmService,
  createUPIService,
  type InstamojoConfig,
  type PaytmConfig,
  type UPIConfig,
} from './index';

// ============================================================================
// Configuration
// ============================================================================

const instamojoConfig: InstamojoConfig = {
  apiKey: process.env.INSTAMOJO_API_KEY!,
  authToken: process.env.INSTAMOJO_AUTH_TOKEN!,
  sandbox: process.env.NODE_ENV !== 'production',
};

const paytmConfig: PaytmConfig = {
  merchantId: process.env.PAYTM_MERCHANT_ID!,
  merchantKey: process.env.PAYTM_MERCHANT_KEY!,
  website: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
  industryType: process.env.PAYTM_INDUSTRY_TYPE || 'Retail',
  channelId: 'WEB',
  sandbox: process.env.NODE_ENV !== 'production',
};

const upiConfig: UPIConfig = {
  defaultPayeeVPA: process.env.UPI_DEFAULT_PAYEE_VPA || 'merchant@paytm',
  merchantName: process.env.UPI_MERCHANT_NAME || 'My Business',
  merchantCode: process.env.UPI_MERCHANT_CODE || '1234',
  validationApiKey: process.env.UPI_VALIDATION_API_KEY,
  validationApiUrl: process.env.UPI_VALIDATION_API_URL,
};

// Initialize services
const instamojo = createInstamojoService(instamojoConfig);
const paytm = createPaytmService(paytmConfig);
const upi = createUPIService(upiConfig);

// ============================================================================
// Example 1: Instamojo Payment Flow
// ============================================================================

export async function exampleInstamojoPayment() {
  console.log('=== Instamojo Payment Example ===\n');

  try {
    // Step 1: Create payment request
    console.log('Step 1: Creating payment request...');
    const paymentRequest = await instamojo.createPaymentRequest({
      amount: 999.0,
      purpose: 'Pro Plan Subscription',
      buyerName: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '9876543210',
      redirectUrl: 'https://yourapp.com/payment/success',
      webhookUrl: 'https://yourapp.com/api/webhooks/instamojo',
      sendEmail: true,
      sendSms: true,
    });

    console.log('Payment request created!');
    console.log('Request ID:', paymentRequest.id);
    console.log('Payment URL:', paymentRequest.longurl);
    console.log('\nRedirect user to:', paymentRequest.longurl);

    // Simulate user completing payment...
    console.log('\n[User completes payment on Instamojo]');

    // Step 2: Get payment details (after callback)
    console.log('\nStep 2: Fetching payment details...');
    const payment = await instamojo.getPaymentDetails(paymentRequest.id);
    console.log('Payment Status:', payment.status);

    // Step 3: Verify payment
    if (payment.status === 'Credit') {
      console.log('Payment successful!');
      console.log('Amount:', payment.amount);
      console.log('Buyer:', payment.buyer_name);
    }

    return paymentRequest;
  } catch (error: any) {
    console.error('Instamojo Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 2: Instamojo Refund
// ============================================================================

export async function exampleInstamojoRefund(paymentId: string) {
  console.log('\n=== Instamojo Refund Example ===\n');

  try {
    const refund = await instamojo.createRefund({
      paymentId,
      type: 'RFD', // Duplicate/delayed payment
      body: 'Customer requested refund for duplicate payment',
    });

    console.log('Refund created successfully!');
    console.log('Refund ID:', refund.refund.id);
    console.log('Refund Amount:', refund.refund.refund_amount);
    console.log('Status:', refund.refund.status);

    return refund;
  } catch (error: any) {
    console.error('Refund Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 3: Paytm Payment Flow
// ============================================================================

export async function examplePaytmPayment() {
  console.log('\n=== Paytm Payment Example ===\n');

  try {
    const orderId = 'ORDER_' + Date.now();

    // Step 1: Initiate transaction
    console.log('Step 1: Initiating transaction...');
    const transaction = await paytm.initiateTransaction({
      orderId,
      amount: 1499.0,
      customerId: 'CUST_123',
      email: 'priya@example.com',
      mobile: '9876543210',
      callbackUrl: 'https://yourapp.com/api/payment/callback',
    });

    console.log('Transaction initiated!');
    console.log('Order ID:', transaction.orderId);
    console.log('Token:', transaction.txnToken);

    // Step 2: Get payment page URL
    const paymentUrl = paytm.getPaymentPageUrl(orderId, transaction.txnToken);
    console.log('\nPayment URL:', paymentUrl);
    console.log('\nRedirect user to:', paymentUrl);

    // Simulate user completing payment...
    console.log('\n[User completes payment on Paytm]');

    // Step 3: Check transaction status (after callback)
    console.log('\nStep 2: Checking transaction status...');
    const status = await paytm.getTransactionStatus(orderId);

    console.log('Transaction Status:', status.status);
    if (status.status === 'TXN_SUCCESS') {
      console.log('Payment successful!');
      console.log('Transaction ID:', status.txnId);
      console.log('Amount:', status.txnAmount);
      console.log('Payment Mode:', status.paymentMode);
      console.log('Bank:', status.bankName);
    }

    return { transaction, status };
  } catch (error: any) {
    console.error('Paytm Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 4: Paytm Subscription
// ============================================================================

export async function examplePaytmSubscription() {
  console.log('\n=== Paytm Subscription Example ===\n');

  try {
    const subscriptionId = 'SUB_' + Date.now();

    // Create subscription
    console.log('Creating monthly subscription...');
    const subscription = await paytm.createSubscription({
      subscriptionId,
      planId: 'PLAN_PRO_MONTHLY',
      customerId: 'CUST_123',
      amount: 499.0,
      frequency: 'MONTHLY',
      frequencyUnit: 1,
      startDate: '2026-01-15',
      expiryDate: '2027-01-15',
      enableRetry: true,
    });

    console.log('Subscription created!');
    console.log('Subscription ID:', subscriptionId);

    // Check subscription status
    const status = await paytm.fetchSubscriptionStatus(subscriptionId);
    console.log('Status:', status.status);
    console.log('Next Payment Date:', status.nextPaymentDate);

    return subscription;
  } catch (error: any) {
    console.error('Subscription Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 5: UPI Payment Link & QR Code
// ============================================================================

export async function exampleUPIPayment() {
  console.log('\n=== UPI Payment Example ===\n');

  try {
    // Step 1: Generate transaction reference
    const transactionRef = upi.generateTransactionRef('ORD');
    console.log('Transaction Reference:', transactionRef);

    // Step 2: Generate UPI link
    console.log('\nGenerating UPI payment link...');
    const upiLink = upi.generateUPILink({
      payeeVPA: 'merchant@paytm',
      payeeName: 'Nexvo SalesIQ',
      amount: 999.0,
      transactionNote: 'Pro Plan Purchase',
      transactionRef,
      merchantCode: '1234',
    });

    console.log('UPI Link:', upiLink);

    // Step 3: Generate QR code
    console.log('\nGenerating QR code...');
    const qrCodeDataUrl = await upi.generateQRCode(upiLink, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    console.log('QR Code generated (base64 data URL)');
    console.log('Length:', qrCodeDataUrl.length, 'characters');

    // Also generate as buffer for storage
    const qrCodeBuffer = await upi.generateQRCodeBuffer(upiLink);
    console.log('QR Code buffer size:', qrCodeBuffer.length, 'bytes');

    return {
      transactionRef,
      upiLink,
      qrCodeDataUrl,
      qrCodeBuffer,
    };
  } catch (error: any) {
    console.error('UPI Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 6: UPI VPA Validation
// ============================================================================

export async function exampleUPIVPAValidation() {
  console.log('\n=== UPI VPA Validation Example ===\n');

  try {
    const vpas = [
      'user@paytm',
      '9876543210@ybl',
      'invalid-vpa',
      'test.user@okaxis',
    ];

    for (const vpa of vpas) {
      console.log(`\nValidating: ${vpa}`);

      // Format validation (instant)
      const isValidFormat = upi.isValidVPAFormat(vpa);
      console.log('Valid format:', isValidFormat);

      if (isValidFormat) {
        // Full validation with API (requires API configuration)
        try {
          const validation = await upi.validateVPA(vpa);
          console.log('Account exists:', validation.accountExists);
          if (validation.nameAtBank) {
            console.log('Account holder:', validation.nameAtBank);
          }
        } catch (error) {
          console.log('API validation not available');
        }
      }
    }
  } catch (error: any) {
    console.error('Validation Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 7: UPI Collect Request
// ============================================================================

export async function exampleUPICollectRequest() {
  console.log('\n=== UPI Collect Request Example ===\n');

  try {
    const transactionRef = upi.generateTransactionRef('COL');

    console.log('Sending collect request to customer UPI...');
    const collectRequest = await upi.createCollectRequest({
      payerVPA: 'customer@paytm',
      amount: 999.0,
      note: 'Payment for Order #12345',
      transactionRef,
      merchantVPA: 'merchant@paytm',
      expiryMinutes: 15,
    });

    console.log('Collect request sent!');
    console.log('Customer will receive payment request in their UPI app');

    return collectRequest;
  } catch (error: any) {
    console.error('Collect Request Error:', error.message);
    // Note: This requires proper API integration
    console.log('Note: Collect requests require payment gateway API integration');
    throw error;
  }
}

// ============================================================================
// Example 8: Parse UPI Payment Response
// ============================================================================

export function exampleParseUPIResponse() {
  console.log('\n=== UPI Response Parsing Example ===\n');

  try {
    // Simulate response from UPI app
    const responseString =
      'txnId=ABC123456&txnRef=ORD1735689600000ABCD&Status=SUCCESS&responseCode=00&ApprovalRefNo=REF789&amount=999.00';

    console.log('Response string:', responseString);

    const response = upi.parseUPIResponse(responseString);

    console.log('\nParsed response:');
    console.log('Status:', response.status);
    console.log('Transaction ID:', response.txnId);
    console.log('Reference:', response.txnRef);
    console.log('Response Code:', response.responseCode);
    console.log('Approval Ref:', response.approvalRefNo);
    console.log('Amount:', response.amount);

    if (response.status === 'SUCCESS') {
      console.log('\nPayment successful! Update order status.');
    }

    return response;
  } catch (error: any) {
    console.error('Parse Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 9: Complete Payment Integration
// ============================================================================

export async function exampleCompleteIntegration() {
  console.log('\n=== Complete Payment Integration Example ===\n');

  const amount = 1999.0;
  const customerInfo = {
    id: 'CUST_123',
    name: 'Amit Sharma',
    email: 'amit@example.com',
    phone: '9876543210',
  };

  // Let user choose payment method
  const paymentMethod = 'upi'; // or 'instamojo', 'paytm'

  console.log('Customer:', customerInfo.name);
  console.log('Amount: ₹', amount);
  console.log('Payment Method:', paymentMethod);

  try {
    switch (paymentMethod) {
      case 'instamojo':
        console.log('\n--- Using Instamojo ---');
        const imojoPayment = await instamojo.createPaymentRequest({
          amount,
          purpose: 'Product Purchase',
          buyerName: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          redirectUrl: 'https://yourapp.com/payment/success',
          webhookUrl: 'https://yourapp.com/api/webhooks/instamojo',
        });
        console.log('Redirect to:', imojoPayment.longurl);
        return { method: 'instamojo', paymentUrl: imojoPayment.longurl };

      case 'paytm':
        console.log('\n--- Using Paytm ---');
        const orderId = 'ORDER_' + Date.now();
        const paytmTxn = await paytm.initiateTransaction({
          orderId,
          amount,
          customerId: customerInfo.id,
          email: customerInfo.email,
          mobile: customerInfo.phone,
          callbackUrl: 'https://yourapp.com/api/payment/callback',
        });
        const paymentUrl = paytm.getPaymentPageUrl(orderId, paytmTxn.txnToken);
        console.log('Redirect to:', paymentUrl);
        return { method: 'paytm', paymentUrl };

      case 'upi':
        console.log('\n--- Using UPI ---');
        const txnRef = upi.generateTransactionRef('ORD');
        const upiLink = upi.generateUPILink({
          payeeVPA: 'merchant@paytm',
          payeeName: 'Nexvo SalesIQ',
          amount,
          transactionNote: 'Product Purchase',
          transactionRef: txnRef,
        });
        const qrCode = await upi.generateQRCode(upiLink);
        console.log('UPI Link:', upiLink);
        console.log('QR Code generated');
        return {
          method: 'upi',
          upiLink,
          qrCode,
          transactionRef: txnRef,
        };

      default:
        throw new Error('Invalid payment method');
    }
  } catch (error: any) {
    console.error('Payment Error:', error.message);
    throw error;
  }
}

// ============================================================================
// Example 10: Popular UPI Apps
// ============================================================================

export function exampleUPIApps() {
  console.log('\n=== Popular UPI Apps ===\n');

  const apps = upi.getPopularUPIApps();

  apps.forEach((app, index) => {
    console.log(`${index + 1}. ${app.name}`);
    console.log(`   Package: ${app.package}`);
    console.log(`   VPA Pattern: ${app.vpaPattern}`);
    console.log();
  });

  return apps;
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   India Payment Gateways - Usage Examples               ║');
  console.log('║   Instamojo | Paytm | UPI                                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Uncomment to run specific examples

    // await exampleInstamojoPayment();
    // await examplePaytmPayment();
    // await exampleUPIPayment();
    // await exampleUPIVPAValidation();
    // exampleParseUPIResponse();
    // exampleUPIApps();
    // await exampleCompleteIntegration();

    console.log('\n✅ All examples completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}
