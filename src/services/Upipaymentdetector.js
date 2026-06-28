/**
 * UPIPaymentDetector.js
 * Place at: src/services/UPIPaymentDetector.js
 *
 * Reads bank SMS to automatically detect UPI payment success
 * and extract the UTR/Transaction ID.
 *
 * Works like GPay/PhonePe internally — they also read bank SMS
 * to confirm payment status without any payment gateway API.
 *
 * Setup:
 * npm install react-native-get-sms-android
 * eas build --profile development --platform android  (rebuild needed)
 *
 * Permissions added automatically via the package.
 */
import { PermissionsAndroid, Platform } from 'react-native';

// ── Request SMS permission ────────────────────────────────────────────────────
export async function requestSMSPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title:   'SMS Permission Required',
        message: 'Menorah app needs to read your bank SMS to automatically confirm your UPI payment. No personal messages are accessed.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_) {
    return false;
  }
}

// ── Bank SMS patterns for UTR/Transaction ID ──────────────────────────────────
// Covers: SBI, ICICI, HDFC, Axis, Yes Bank, IndusInd, Kotak, PNB, BOI, Canara
const SMS_PATTERNS = [
  // UTR number patterns
  /UPI Ref[:\s#]*([A-Z0-9]{12,20})/i,
  /UTR[:\s#]*([A-Z0-9]{12,20})/i,
  /Ref[:\s#]?No[:\s#]*([A-Z0-9]{12,20})/i,
  /Transaction ID[:\s#]*([A-Z0-9]{10,20})/i,
  /Txn ID[:\s#]*([A-Z0-9]{10,20})/i,
  /RRN[:\s#]*([0-9]{12})/i,

  // ICICI Bank
  /ICICI Bank[^:]*UPI[^:]*:([A-Z0-9]{12,20})/i,

  // Yes Bank (YBL)
  /YBL[^:]*Ref[:\s]*([A-Z0-9]{12,20})/i,
  /UPI\/[A-Z0-9]+\/[A-Z0-9]+\/([A-Z0-9]{12,20})/i,

  // Generic UPI success with amount
  /debited.*?UPI.*?([A-Z0-9]{12,20})/i,
  /paid.*?UPI.*?Ref[:\s]*([A-Z0-9]{12,20})/i,
];

// ── Parse UTR from SMS body ───────────────────────────────────────────────────
export function parseUTRFromSMS(smsBody) {
  if (!smsBody) return null;
  for (const pattern of SMS_PATTERNS) {
    const match = smsBody.match(pattern);
    if (match && match[1] && match[1].length >= 10) {
      return match[1].trim().toUpperCase();
    }
  }
  return null;
}

// ── Parse amount from SMS ─────────────────────────────────────────────────────
export function parseAmountFromSMS(smsBody) {
  if (!smsBody) return null;
  const match = smsBody.match(/(?:Rs|INR|₹)[.\s]*([0-9,]+\.?[0-9]*)/i);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

// ── Check if SMS is a UPI debit/payment SMS ───────────────────────────────────
export function isUPIPaymentSMS(smsBody) {
  if (!smsBody) return false;
  const body = smsBody.toLowerCase();
  const hasUPI    = body.includes('upi') || body.includes('bhim');
  const hasDebit  = body.includes('debited') || body.includes('paid') || body.includes('sent') || body.includes('transferred');
  const hasAmount = /(?:rs|inr|₹)[.\s]*[0-9]/i.test(smsBody);
  return hasUPI && (hasDebit || hasAmount);
}

// ── Read recent SMS and find UPI payment confirmation ─────────────────────────
export async function detectUPIPaymentFromSMS(expectedAmount, timeoutMs = 60000) {
  if (Platform.OS !== 'android') return null;

  let SmsAndroid;
  try {
    SmsAndroid = require('react-native-get-sms-android').default;
  } catch (_) {
    console.log('react-native-get-sms-android not installed');
    return null;
  }

  const hasPermission = await requestSMSPermission();
  if (!hasPermission) return null;

  const startTime = Date.now();
  const minTime   = startTime; // Only look at SMS received after this moment

  return new Promise((resolve) => {
    const checkSMS = () => {
      const filter = {
        box:       'inbox',
        minDate:   minTime - 5000, // 5 seconds before payment started
        maxCount:  5,
      };

      SmsAndroid.list(
        JSON.stringify(filter),
        (fail) => {
          console.log('SMS read failed:', fail);
          resolve(null);
        },
        (count, smsList) => {
          const messages = JSON.parse(smsList);
          for (const sms of messages) {
            if (isUPIPaymentSMS(sms.body)) {
              const utr    = parseUTRFromSMS(sms.body);
              const amount = parseAmountFromSMS(sms.body);

              // Check if amount matches (within ₹1 tolerance for floating point)
              const amountMatches = !expectedAmount ||
                (amount && Math.abs(amount - expectedAmount) < 1);

              if (utr && amountMatches) {
                console.log('UPI SMS detected! UTR:', utr, '| Amount:', amount);
                resolve({ utr, amount, smsBody: sms.body });
                return;
              }
            }
          }

          // Keep polling until timeout
          if (Date.now() - startTime < timeoutMs) {
            setTimeout(checkSMS, 3000); // Check every 3 seconds
          } else {
            console.log('SMS detection timed out');
            resolve(null);
          }
        }
      );
    };

    // Start checking after 2 seconds (time for SMS to arrive)
    setTimeout(checkSMS, 2000);
  });
}