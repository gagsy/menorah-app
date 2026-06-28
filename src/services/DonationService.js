import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WP_BASE = 'https://menorahedu.in/wp-json/menorah/v1';

// ── Fetch UPI ID live from WordPress ─────────────────────────────────────────
// This is called every time the Give screen loads.
// Change the UPI ID in WordPress → Donations → App Settings
// and it updates in the app instantly — no code change needed.
export async function getSettings() {
  try {
    const res  = await fetch(WP_BASE + '/settings', { cache: 'no-store' });
    const data = await res.json();
    if (data && data.upi_id) {
      console.log('UPI ID from WordPress:', data.upi_id); // ← you'll see this in terminal
      return {
        upiId:   data.upi_id,
        upiName: data.upi_name || 'Menorah Family Camp',
      };
    }
    throw new Error('no upi_id in response');
  } catch (err) {
    console.log('getSettings fallback, error:', err.message);
    // FALLBACK — only used if WordPress API is unreachable
    return {
      upiId:   '7828034492@ybl',
      upiName: 'Menorah Family Camp',
    };
  }
}

// ── Build UPI deep link params ────────────────────────────────────────────────
function buildParams(upiId, upiName, amount, note, txnRef) {
  return (
    'pa='  + encodeURIComponent(upiId)   +
    '&pn=' + encodeURIComponent(upiName) +
    '&am=' + amount                      +
    '&cu=INR'                            +
    '&tn=' + encodeURIComponent(note)    +
    '&tr=' + encodeURIComponent(txnRef)
  );
}

// ── Open UPI App ──────────────────────────────────────────────────────────────
// Each app has its own deep link scheme — bypasses BHIM completely.
// Falls back to generic upi:// if app-specific scheme fails.
export async function openUPIApp(appName, amount, note, txnRef) {
  const settings = await getSettings();
  const params   = buildParams(settings.upiId, settings.upiName, amount, note, txnRef);

  const schemes = {
    'Google Pay':  'tez://upi/pay?'     + params,
    'PhonePe':     'phonepe://pay?'     + params,
    'Paytm':       'paytmmp://upi/pay?' + params,
    'BHIM':        'upi://pay?'         + params,
    'Amazon Pay':  'amz://pay?'         + params,
    'Any UPI App': 'upi://pay?'         + params,
  };

  const primaryUrl  = schemes[appName] || ('upi://pay?' + params);
  const fallbackUrl = 'upi://pay?'     + params;

  // Try app-specific URL first
  try {
    await Linking.openURL(primaryUrl);
    return { opened: true };
  } catch (_) {
    // Try intent-based (better on Android 11+)
    try {
      if (appName === 'Google Pay') {
        await Linking.openURL(
          'intent://pay?' + params +
          '#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end'
        );
        return { opened: true };
      }
      if (appName === 'PhonePe') {
        await Linking.openURL(
          'intent://pay?' + params +
          '#Intent;scheme=upi;package=com.phonepe.app;end'
        );
        return { opened: true };
      }
      // Generic fallback
      await Linking.openURL(fallbackUrl);
      return { opened: true };
    } catch (e) {
      return { opened: false, error: e.message };
    }
  }
}

// ── Create pending donation on WordPress ──────────────────────────────────────
export async function createDonation({ amount, frequency, cause, donorName, donorEmail, donorPhone }) {
  const txnRef = 'MEN-' + Date.now() + '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const res   = await fetch(WP_BASE + '/donation/create', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({
        amount, frequency, cause,
        donor_name:  donorName  || 'Anonymous',
        donor_email: donorEmail || '',
        donor_phone: donorPhone || '',
        txn_ref:     txnRef,
        currency:    'INR',
      }),
    });
    const data = await res.json();
    if (res.ok && data.donation_id) {
      return { success: true, donationId: data.donation_id, txnRef };
    }
    return { success: true, donationId: null, txnRef };
  } catch (_) {
    return { success: true, donationId: null, txnRef: 'MEN-OFFLINE-' + Date.now() };
  }
}

// ── Confirm donation with UTR number ──────────────────────────────────────────
export async function confirmDonation({ donationId, txnRef, upiTxnId, amount }) {
  if (!donationId) return { success: true };
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const res   = await fetch(WP_BASE + '/donation/confirm', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({
        donation_id: donationId,
        txn_ref:     txnRef,
        upi_txn_id:  upiTxnId || '',
        amount,
      }),
    });
    return res.ok ? { success: true } : { success: false };
  } catch (_) {
    return { success: true };
  }
}

// ── Get campaign stats ────────────────────────────────────────────────────────
export async function getCampaignStats(campaignId) {
  try {
    const res  = await fetch(WP_BASE + '/campaign/' + (campaignId || 1));
    const data = await res.json();
    if (res.ok && data.title) {
      return {
        success:  true,
        raised:   data.raised   || 612000,
        goal:     data.goal     || 1250000,
        title:    data.title,
        subtitle: data.subtitle || 'Help us complete the sanctuary interior',
      };
    }
    throw new Error('bad response');
  } catch (_) {
    return {
      success:  false,
      raised:   612000,
      goal:     1250000,
      title:    'Building Project Phase 3',
      subtitle: 'Help us complete the sanctuary interior',
    };
  }
}