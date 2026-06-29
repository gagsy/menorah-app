/**
 * UPIPaymentDetector.js
 * Save at: src/services/UPIPaymentDetector.js
 *
 * Detects UPI payment from bank SMS automatically.
 * Gracefully falls back if SMS package not installed.
 * No native build required for basic functionality.
 */
import { Platform, PermissionsAndroid } from 'react-native';

// ── UTR patterns from all major Indian banks ──────────────────────────────────
const UTR_PATTERNS = [
  /UPI Ref[:\s#.]*([A-Z0-9]{10,22})/i,
  /UTR[:\s#.]*([A-Z0-9]{10,22})/i,
  /Ref[.\s]?No[:\s#.]*([A-Z0-9]{10,22})/i,
  /Transaction[.\s]?ID[:\s#.]*([A-Z0-9]{10,22})/i,
  /Txn[.\s]?ID[:\s#.]*([A-Z0-9]{10,22})/i,
  /RRN[:\s#.]*([0-9]{12})/i,
  /UPI\/[A-Z0-9]+\/[A-Z0-9]+\/([A-Z0-9]{12,20})/i,
];

export function parseUTRFromSMS(smsBody) {
  if (!smsBody) return null;
  for (const pattern of UTR_PATTERNS) {
    const match = smsBody.match(pattern);
    if (match && match[1] && match[1].length >= 10) {
      return match[1].trim().toUpperCase();
    }
  }
  return null;
}

export function parseAmountFromSMS(smsBody) {
  if (!smsBody) return null;
  const match = smsBody.match(/(?:Rs|INR|₹)[.\s]*([0-9,]+\.?[0-9]*)/i);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

export function isUPIPaymentSMS(body) {
  if (!body) return false;
  const b = body.toLowerCase();
  return (
    (b.includes('upi') || b.includes('bhim')) &&
    (b.includes('debited') || b.includes('paid') || b.includes('credited')) &&
    /(?:rs|inr|₹)[.\s]*[0-9]/i.test(body)
  );
}

// ── Request SMS permission ────────────────────────────────────────────────────
export async function requestSMSPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title:          'SMS Permission',
        message:        'Allow Menorah app to read your bank SMS to automatically confirm UPI payment. No personal messages are accessed.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_) {
    return false;
  }
}

// ── Detect UPI payment from SMS ───────────────────────────────────────────────
// Tries react-native-sms-retriever if installed.
// If not installed, returns null → app falls back to manual UTR entry.
// Either way the app works — SMS detection is enhancement only.
export async function detectUPIPaymentFromSMS(expectedAmount, timeoutMs = 90000) {
  if (Platform.OS !== 'android') return null;

  try {
    const SmsRetriever = require('react-native-sms-retriever');

    const started = await SmsRetriever.startSmsRetriever();
    if (!started) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        try { SmsRetriever.removeSmsListener(); } catch (_) {}
        resolve(null);
      }, timeoutMs);

      SmsRetriever.addSmsListener((event) => {
        clearTimeout(timeout);
        try { SmsRetriever.removeSmsListener(); } catch (_) {}

        const sms = event && event.message;
        if (!sms || !isUPIPaymentSMS(sms)) { resolve(null); return; }

        const utr    = parseUTRFromSMS(sms);
        const amount = parseAmountFromSMS(sms);
        const amountOk = !expectedAmount || !amount || Math.abs(amount - expectedAmount) < 2;

        if (utr && amountOk) {
          resolve({ utr, amount, smsBody: sms });
        } else {
          resolve(null);
        }
      });
    });
  } catch (_) {
    // react-native-sms-retriever not installed → silent fallback
    return null;
  }
}