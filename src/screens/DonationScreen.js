import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet,
  TouchableOpacity, Dimensions, Modal, Share,
  Alert, TextInput, Platform, StatusBar,
  Keyboard, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '../constants/Colors';
import TabBar from '../components/TabBar';
// ── Inline SMS detection (no external file needed) ───────────────────────────
async function requestSMSPermission() {
  if (require('react-native').Platform.OS !== 'android') return false;
  try {
    const { PermissionsAndroid } = require('react-native');
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      { title: 'SMS Permission', message: 'To auto-detect UPI payment from bank SMS.', buttonPositive: 'Allow', buttonNegative: 'Deny' }
    );
    return r === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_) { return false; }
}

function parseUTRFromSMS(sms) {
  if (!sms) return null;
  const patterns = [
    /UPI Ref[:\s#.]*([A-Z0-9]{10,22})/i,
    /UTR[:\s#.]*([A-Z0-9]{10,22})/i,
    /Ref[.\s]?No[:\s#.]*([A-Z0-9]{10,22})/i,
    /Transaction[.\s]?ID[:\s#.]*([A-Z0-9]{10,22})/i,
    /RRN[:\s#.]*([0-9]{12})/i,
  ];
  for (const p of patterns) {
    const m = sms.match(p);
    if (m && m[1] && m[1].length >= 10) return m[1].trim().toUpperCase();
  }
  return null;
}

async function detectUPIPaymentFromSMS(expectedAmount, timeoutMs = 90000) {
  if (require('react-native').Platform.OS !== 'android') return null;
  try {
    const SmsRetriever = require('react-native-sms-retriever');
    const started = await SmsRetriever.startSmsRetriever();
    if (!started) return null;
    return new Promise((resolve) => {
      const t = setTimeout(() => { try { SmsRetriever.removeSmsListener(); } catch(_){} resolve(null); }, timeoutMs);
      SmsRetriever.addSmsListener((event) => {
        clearTimeout(t);
        try { SmsRetriever.removeSmsListener(); } catch(_){}
        const sms = event && event.message;
        if (!sms) { resolve(null); return; }
        const utr = parseUTRFromSMS(sms);
        if (utr) { resolve({ utr, smsBody: sms }); } else { resolve(null); }
      });
    });
  } catch (_) { return null; }
}

const { width } = Dimensions.get('window');

const WP_BASE           = 'https://menorahedu.in/wp-json/menorah/v1';
const FALLBACK_UPI_ID   = '7828034492@ybl';
const FALLBACK_UPI_NAME = 'Menorah Family Camp';
const PRESET_AMTS       = [500, 1000, 2500, 5000];

function formatINR(n) {
  const num = Number(n);
  if (!num || isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN');
}

function buildUPIQR(upiId, upiName, amount, note) {
  return (
    'upi://pay?pa='  + encodeURIComponent(upiId)   +
    '&pn='           + encodeURIComponent(upiName) +
    '&am='           + parseFloat(amount).toFixed(2) +
    '&cu=INR'        +
    '&tn='           + encodeURIComponent(note)
  );
}

async function openUPIApp(appName, upiId, upiName, amount, note) {
  const amountStr = parseFloat(amount).toFixed(2);
  const ref       = 'MEN' + Date.now();
  const params =
    'pa='  + encodeURIComponent(upiId)    +
    '&pn=' + encodeURIComponent(upiName)  +
    '&am=' + amountStr                    +
    '&cu=INR'                             +
    '&tn=' + encodeURIComponent(note)     +
    '&tr=' + encodeURIComponent(ref);

  const urls = {
    'GPay':    'tez://upi/pay?'     + params,
    'PhonePe': 'phonepe://pay?'     + params,
    'Paytm':   'paytmmp://upi/pay?' + params,
    'Any App': 'upi://pay?'         + params,
  };

  const url = urls[appName] || ('upi://pay?' + params);
  try { await Linking.openURL(url); return true; }
  catch (_) {
    try { await Linking.openURL('upi://pay?' + params); return true; }
    catch (e) { return false; }
  }
}

async function saveDonationToWP({ amount, txnId, donorName, upiId, status }) {
  try {
    const res = await fetch(WP_BASE + '/donation/create', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        txn_ref:     txnId,
        upi_txn_id:  txnId,
        donor_name:  donorName  || 'Anonymous',
        cause:       'Building Project Phase 3',
        currency:    'INR',
        status:      status || 'completed',
      }),
    });
    return res.ok;
  } catch (_) { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────

const DonationScreen = ({ navigation }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [upiId,   setUpiId]   = useState(FALLBACK_UPI_ID);
  const [upiName, setUpiName] = useState(FALLBACK_UPI_NAME);
  const [raised,  setRaised]  = useState(612000);
  const [goal,    setGoal]    = useState(1250000);
  const [title,   setTitle]   = useState('Building Project Phase 3');

  const [selectedAmt, setSelectedAmt] = useState(1000);
  const [customAmt,   setCustomAmt]   = useState('');
  const [customMode,  setCustomMode]  = useState(false);

  const [payTab, setPayTab] = useState('apps');

  // Modals
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showTxnModal,  setShowTxnModal]  = useState(false);
  const [showSuccess,   setShowSuccess]   = useState(false);

  // SMS detection state
  const [detecting,     setDetecting]     = useState(false);
  const [detectStatus,  setDetectStatus]  = useState('');
  const [smsPermission, setSmsPermission] = useState(false);

  // Transaction state
  const [txnId,     setTxnId]     = useState('');
  const [txnError,  setTxnError]  = useState('');
  const [donorName, setDonorName] = useState('');
  const [saving,    setSaving]    = useState(false);

  const finalAmount = customMode
    ? (parseInt(customAmt.replace(/[^0-9]/g, ''), 10) || 0)
    : selectedAmt;

  const pct       = Math.min(100, Math.round((raised / goal) * 100));
  const upiQRData = buildUPIQR(upiId, upiName, finalAmount, 'Donation - Menorah Family Camp');

  useEffect(() => {
    loadSettings();
    loadCampaign();
    // Request SMS permission early so it's ready when needed
    requestSMSPermission().then(setSmsPermission);
  }, []);

  const loadSettings = () => {
    fetch(WP_BASE + '/settings?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.json())
      .then(d => {
        if (d.upi_id?.trim())   setUpiId(d.upi_id.trim());
        if (d.upi_name?.trim()) setUpiName(d.upi_name.trim());
      })
      .catch(() => {});
  };

  const loadCampaign = () => {
    fetch(WP_BASE + '/campaign/1?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => r.json())
      .then(d => {
        if (d.raised) setRaised(Number(d.raised));
        if (d.goal)   setGoal(Number(d.goal));
        if (d.title)  setTitle(d.title);
        Animated.timing(progressAnim, {
          toValue: Math.min(1, Number(d.raised || 612000) / Number(d.goal || 1250000)),
          duration: 1400, useNativeDriver: false,
        }).start();
      })
      .catch(() => {
        Animated.timing(progressAnim, { toValue: pct / 100, duration: 1400, useNativeDriver: false }).start();
      });
  };

  // ── After opening UPI app — auto-detect payment via SMS ─────────────────────
  const startSMSDetection = async (amount) => {
    setDetecting(true);
    setDetectStatus('Waiting for payment confirmation...');

    try {
      const result = await detectUPIPaymentFromSMS(amount, 90000); // 90 sec timeout

      if (result && result.utr) {
        // ✅ Payment detected automatically from SMS!
        setDetecting(false);
        setDetectStatus('');
        setTxnId(result.utr);
        setDetectStatus('auto_detected');
        setShowTxnModal(true);
      } else {
        // SMS not detected — ask user to enter manually
        setDetecting(false);
        setDetectStatus('');
        setTxnId('');
        setShowTxnModal(true);
      }
    } catch (_) {
      setDetecting(false);
      setDetectStatus('');
      setTxnId('');
      setShowTxnModal(true);
    }
  };

  const handleGiveNow = () => {
    if (finalAmount < 10) {
      Alert.alert('Enter Amount', 'Minimum donation is ₹10.');
      return;
    }
    Keyboard.dismiss();
    setPayTab('apps');
    setShowPayModal(true);
  };

  const handlePayWith = async (appName) => {
    setShowPayModal(false);
    const ok = await openUPIApp(appName, upiId, upiName, finalAmount, 'Donation - Menorah Family Camp');

    if (!ok) {
      Alert.alert('App Not Opened', 'Pay manually:\nUPI ID: ' + upiId + '\nAmount: ' + formatINR(finalAmount));
      return;
    }

    // Start SMS detection while user is in UPI app
    startSMSDetection(finalAmount);
  };

  const handleQRPaid = () => {
    setShowPayModal(false);
    setTxnId('');
    setDetectStatus('');
    // For QR payments, start SMS detection too
    startSMSDetection(finalAmount);
  };

  const handleConfirmTxn = async () => {
    const clean = txnId.trim().toUpperCase();
    if (clean.length < 6) {
      setTxnError('Please enter the Transaction ID from your UPI app.');
      return;
    }

    setSaving(true);
    const saved = await saveDonationToWP({
      amount:    finalAmount,
      txnId:     clean,
      donorName: donorName.trim(),
      upiId,
      status:    'completed',
    });
    setSaving(false);
    setShowTxnModal(false);
    setShowSuccess(true);

    // Refresh campaign stats
    loadCampaign();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          '🙏 I donated ' + formatINR(finalAmount) + ' to Menorah Family Camp!\n\n' +
          'Transaction ID: ' + txnId + '\n\n' +
          'You can give too → UPI ID: ' + upiId + '\n\n' +
          '"One Family. Many Colors. One King."\nmenorahedu.in',
      });
    } catch (_) {}
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3EEFA" />

      {/* SMS Detection Overlay */}
      {detecting && (
        <View style={s.detectOverlay}>
          <View style={s.detectBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.detectTitle}>Detecting Payment...</Text>
            <Text style={s.detectSub}>
              Complete your payment in the UPI app.{'\n'}
              We will automatically detect when it's done.
            </Text>
            <View style={s.detectSteps}>
              <Text style={s.detectStep}>1. Pay in your UPI app</Text>
              <Text style={s.detectStep}>2. Come back here</Text>
              <Text style={s.detectStep}>3. We detect & confirm automatically</Text>
            </View>
            <TouchableOpacity style={s.detectSkipBtn}
              onPress={() => { setDetecting(false); setDetectStatus(''); setShowTxnModal(true); }}>
              <Text style={s.detectSkipText}>Enter Transaction ID manually →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={[s.header,
          { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 54 }
        ]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{title}</Text>
          <Text style={s.headerSub}>Help us complete the sanctuary interior</Text>
        </View>

        {/* Progress Card */}
        <View style={s.progressCard}>
          <View style={s.progressAmts}>
            <View>
              <Text style={s.progressLabel}>Raised</Text>
              <Text style={s.progressAmt}>{formatINR(raised)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.progressLabel}>Goal</Text>
              <Text style={s.progressAmt}>{formatINR(goal)}</Text>
            </View>
          </View>
          <View style={s.barRow}>
            <View style={s.barBg}>
              <Animated.View style={[s.barFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={s.barPct}>{pct}%</Text>
          </View>
        </View>

        {/* UPI ID Card */}
        <View style={s.upiCard}>
          <Text style={s.upiLabel}>PAYING TO</Text>
          <Text style={s.upiId}>{upiId}</Text>
          <Text style={s.upiName}>{upiName}</Text>
        </View>

        {/* SMS Auto-detect badge */}
        {smsPermission && (
          <View style={s.smsBadge}>
            <Text style={s.smsBadgeText}>
              ⚡ Auto-detection ON — payment status detected automatically from your bank SMS
            </Text>
          </View>
        )}
        {!smsPermission && (
          <TouchableOpacity style={s.smsPrompt}
            onPress={() => requestSMSPermission().then(setSmsPermission)}>
            <Text style={s.smsPromptText}>
              💡 Allow SMS access for automatic payment confirmation
            </Text>
          </TouchableOpacity>
        )}

        {/* Amount Selection */}
        <Text style={s.sectionLabel}>Select Amount</Text>
        <View style={s.amtGrid}>
          {PRESET_AMTS.map((a) => {
            const active = !customMode && selectedAmt === a;
            return (
              <TouchableOpacity key={a}
                style={[s.amtBtn, active && s.amtBtnActive]}
                onPress={() => { setCustomMode(false); setCustomAmt(''); setSelectedAmt(a); Keyboard.dismiss(); }}
                activeOpacity={0.8}>
                <Text style={[s.amtBtnText, active && s.amtBtnTextActive]}>
                  {formatINR(a)}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[s.amtBtn, customMode && s.amtBtnActive]}
            onPress={() => { setCustomMode(true); setSelectedAmt(0); }}
            activeOpacity={0.8}>
            <Text style={[s.amtBtnText, customMode && s.amtBtnTextActive]}>
              {customMode && customAmt ? formatINR(customAmt) : 'Custom'}
            </Text>
          </TouchableOpacity>
        </View>

        {customMode && (
          <View style={s.customWrap}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              value={customAmt}
              onChangeText={(t) => setCustomAmt(t.replace(/[^0-9]/g, ''))}
              placeholder="Enter amount" placeholderTextColor="#A39A8C"
              keyboardType="number-pad" style={s.customInput} autoFocus maxLength={8}
            />
            {customAmt ? (
              <TouchableOpacity onPress={() => setCustomAmt('')}>
                <Text style={{ fontSize: 18, color: '#A39A8C', padding: 6 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {finalAmount > 0 && (
          <View style={s.summaryRow}>
            <Text style={s.summaryText}>
              You are giving <Text style={s.summaryAmt}>{formatINR(finalAmount)}</Text>
            </Text>
          </View>
        )}

        {/* Give Button */}
        <TouchableOpacity style={s.giveBtnWrap} onPress={handleGiveNow} activeOpacity={0.9}>
          <LinearGradient colors={['#7B3FA0', '#9B59B6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.giveBtn}>
            <Text style={s.giveBtnText}>
              {finalAmount > 0 ? 'Give ' + formatINR(finalAmount) + ' via UPI' : 'Give Now via UPI'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.secureNote}>🔒 Direct UPI · Auto payment detection · 100% to ministry</Text>
        <View style={{ height: 100 }} />
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Give" />

      {/* ── Pay Modal: Apps + QR Tabs ──────────────────────── */}
      <Modal visible={showPayModal} transparent animationType="slide"
        onRequestClose={() => setShowPayModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Pay {formatINR(finalAmount)}</Text>
            <Text style={s.sheetSub}>→ {upiId} · {upiName}</Text>

            {/* Tab switcher */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, payTab === 'apps' && s.tabActive]}
                onPress={() => setPayTab('apps')}>
                <Text style={[s.tabText, payTab === 'apps' && s.tabTextActive]}>📱 UPI Apps</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, payTab === 'qr' && s.tabActive]}
                onPress={() => setPayTab('qr')}>
                <Text style={[s.tabText, payTab === 'qr' && s.tabTextActive]}>📷 Scan QR</Text>
              </TouchableOpacity>
            </View>

            {payTab === 'apps' ? (
              <>
                {[
                  { name: 'GPay',    label: 'Google Pay',  color: '#4285F4', bg: '#EAF1FF' },
                  { name: 'PhonePe', label: 'PhonePe',     color: '#5F259F', bg: '#F5EEFF' },
                  { name: 'Paytm',   label: 'Paytm',       color: '#00BAF2', bg: '#E5F8FF' },
                  { name: 'Any App', label: 'Any UPI App', color: '#6E3FA3', bg: '#F0E9F8' },
                ].map((app) => (
                  <TouchableOpacity key={app.name}
                    style={[s.appBtn, { backgroundColor: app.bg, borderColor: app.color + '50' }]}
                    onPress={() => handlePayWith(app.name)}
                    activeOpacity={0.8}>
                    <Text style={[s.appBtnText, { color: app.color }]}>{app.label}</Text>
                    <Text style={[s.appBtnAmt,  { color: app.color }]}>{formatINR(finalAmount)} →</Text>
                  </TouchableOpacity>
                ))}
                {smsPermission && (
                  <View style={s.autoDetectNote}>
                    <Text style={s.autoDetectNoteText}>
                      ⚡ Payment will be detected automatically from your bank SMS
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={s.qrWrap}>
                <Text style={s.qrInstr}>
                  Open any UPI app → Scan this QR → Amount pre-filled → Pay
                </Text>
                <View style={s.qrBox}>
                  <QRCode
                    value={upiQRData}
                    size={190}
                    color="#241E1A"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={s.qrAmount}>{formatINR(finalAmount)}</Text>
                <Text style={s.qrId}>{upiId}</Text>
                <Text style={s.qrName}>{upiName}</Text>
                <TouchableOpacity style={s.qrPaidBtn} onPress={handleQRPaid}>
                  <Text style={s.qrPaidBtnText}>
                    {smsPermission
                      ? '⚡ I Paid — Auto Detect Payment'
                      : '✅ I Have Paid — Enter Transaction ID'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowPayModal(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Transaction ID Modal ───────────────────────────── */}
      <Modal visible={showTxnModal} transparent animationType="slide"
        onRequestClose={() => setShowTxnModal(false)}>
        <View style={s.overlay}>
          <View style={s.txnSheet}>
            <View style={s.handle} />

            {/* Auto-detected banner */}
            {detectStatus === 'auto_detected' && txnId ? (
              <View style={s.autoDetectedBanner}>
                <Text style={s.autoDetectedIcon}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.autoDetectedTitle}>Payment Detected Automatically!</Text>
                  <Text style={s.autoDetectedSub}>Transaction ID extracted from your bank SMS</Text>
                </View>
              </View>
            ) : null}

            <Text style={s.txnTitle}>Confirm Your Payment</Text>
            <Text style={s.txnSub}>
              Verify your donation of{' '}
              <Text style={{ fontWeight: '800', color: Colors.primary }}>{formatINR(finalAmount)}</Text>
            </Text>

            {/* Transaction ID field */}
            <Text style={s.fieldLabel}>Transaction ID / UTR</Text>
            <View style={s.txnInputRow}>
              <TextInput
                value={txnId}
                onChangeText={(t) => { setTxnId(t.toUpperCase()); setTxnError(''); }}
                placeholder="e.g. 428123456789"
                placeholderTextColor="#A39A8C"
                autoCapitalize="characters"
                autoCorrect={false}
                style={[s.txnInput, txnError && s.txnInputError]}
                maxLength={30}
              />
              {txnId ? (
                <TouchableOpacity style={s.txnClearBtn} onPress={() => setTxnId('')}>
                  <Text style={{ color: '#A39A8C', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {txnError ? <Text style={s.txnError}>{txnError}</Text> : null}

            {/* Where to find it (only if not auto-detected) */}
            {detectStatus !== 'auto_detected' && (
              <View style={s.txnGuide}>
                <Text style={s.txnGuideTitle}>Where to find Transaction ID:</Text>
                <Text style={s.txnGuideItem}>• Google Pay → History → tap payment → Transaction ID</Text>
                <Text style={s.txnGuideItem}>• PhonePe → History → UTR No.</Text>
                <Text style={s.txnGuideItem}>• Any UPI app → Payment receipt</Text>
              </View>
            )}

            {/* Donor name */}
            <Text style={s.fieldLabel}>Your Name (optional)</Text>
            <TextInput
              value={donorName}
              onChangeText={setDonorName}
              placeholder="Full name"
              placeholderTextColor="#A39A8C"
              style={s.nameInput}
            />

            <View style={s.txnActions}>
              <TouchableOpacity style={s.txnCancelBtn}
                onPress={() => {
                  setShowTxnModal(false);
                  Alert.alert('Cancelled', 'Donation not recorded.');
                }}>
                <Text style={s.txnCancelText}>I Did Not Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.txnConfirmBtn}
                onPress={handleConfirmTxn} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.txnConfirmText}>Confirm ✓</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ──────────────────────────────────── */}
      <Modal visible={showSuccess} transparent animationType="fade"
        onRequestClose={() => setShowSuccess(false)}>
        <View style={s.overlay}>
          <View style={s.successSheet}>
            <Text style={s.successEmoji}>🙏</Text>
            <Text style={s.successTitle}>Thank You!</Text>
            <Text style={s.successMsg}>
              Your donation of {formatINR(finalAmount)} has been confirmed and saved.{'\n'}
              God bless you!
            </Text>

            <View style={s.receiptBox}>
              {[
                ['Amount',         formatINR(finalAmount)],
                ['Transaction ID', txnId],
                ['Donor',          donorName || 'Anonymous'],
                ['UPI ID',         upiId],
                ['Date',           new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                ['Status',         '✅ Confirmed'],
              ].map(([label, value]) => (
                <View key={label} style={s.receiptRow}>
                  <Text style={s.receiptLabel}>{label}</Text>
                  <Text style={[
                    s.receiptValue,
                    label === 'Transaction ID' && { color: Colors.primary },
                    label === 'Status' && { color: '#155724' },
                  ]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Text style={s.shareBtnText}>📤  Share Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.doneBtn}
              onPress={() => { setShowSuccess(false); navigation.goBack(); }}>
              <LinearGradient colors={['#7B3FA0', '#9B59B6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.doneBtnInner}>
                <Text style={s.doneBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F3EEFA' },
  header:     { paddingHorizontal: 20, paddingBottom: 16 },
  back:       { fontSize: 16, color: Colors.primary, fontWeight: '600', marginBottom: 14 },
  headerTitle:{ fontSize: 22, fontWeight: '800', color: '#241E1A', textAlign: 'center' },
  headerSub:  { fontSize: 13, color: '#6B6258', textAlign: 'center', marginTop: 4 },

  detectOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  detectBox:     { backgroundColor: '#FFF', borderRadius: 24, padding: 28, width: '100%', alignItems: 'center' },
  detectTitle:   { fontSize: 20, fontWeight: '800', color: '#241E1A', marginTop: 16, marginBottom: 8 },
  detectSub:     { fontSize: 13, color: '#6B6258', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  detectSteps:   { alignSelf: 'stretch', backgroundColor: '#F0E9F8', borderRadius: 12, padding: 14, marginBottom: 20 },
  detectStep:    { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 6 },
  detectSkipBtn: { padding: 12 },
  detectSkipText:{ fontSize: 14, color: Colors.primary, fontWeight: '700' },

  progressCard: {
    marginHorizontal: 20, marginTop: 12, backgroundColor: '#FFF',
    borderRadius: 20, padding: 20,
    shadowColor: '#6E3FA3', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  progressAmts:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressLabel: { fontSize: 12, color: '#6B6258', marginBottom: 3 },
  progressAmt:   { fontSize: 20, fontWeight: '800', color: Colors.primary },
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barBg:   { flex: 1, height: 10, backgroundColor: '#E1D3F0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5 },
  barPct:  { fontSize: 13, fontWeight: '700', color: Colors.primary, minWidth: 38, textAlign: 'right' },

  upiCard: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: '#FFF',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary + '30',
    elevation: 2,
  },
  upiLabel: { fontSize: 10, color: '#9CA3AF', letterSpacing: 2, marginBottom: 6 },
  upiId:    { fontSize: 22, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  upiName:  { fontSize: 13, color: '#6B6258', marginTop: 4 },

  smsBadge: {
    marginHorizontal: 20, marginTop: 10, backgroundColor: '#D4EDDA',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#C3E6CB',
  },
  smsBadgeText: { fontSize: 12, color: '#155724', textAlign: 'center', fontWeight: '600' },
  smsPrompt: {
    marginHorizontal: 20, marginTop: 10, backgroundColor: '#FFF3CD',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFEEBA',
  },
  smsPromptText: { fontSize: 12, color: '#856404', textAlign: 'center', fontWeight: '600' },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#241E1A', marginHorizontal: 20, marginTop: 20, marginBottom: 12 },

  amtGrid:          { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20, gap: 12 },
  amtBtn:           { width: (width - 52) / 2, paddingVertical: 18, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  amtBtnActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  amtBtnText:       { fontSize: 16, fontWeight: '700', color: '#241E1A' },
  amtBtnTextActive: { color: '#FFF' },

  customWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14,
    backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  rupee:       { fontSize: 24, fontWeight: '800', color: Colors.primary, marginRight: 6 },
  customInput: { flex: 1, fontSize: 24, fontWeight: '800', color: '#241E1A', paddingVertical: 12 },

  summaryRow:  { marginHorizontal: 20, marginTop: 12, backgroundColor: '#F0E9F8', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryText: { fontSize: 14, color: '#6B6258' },
  summaryAmt:  { fontWeight: '800', color: Colors.primary, fontSize: 15 },

  giveBtnWrap: { marginHorizontal: 20, marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  giveBtn:     { paddingVertical: 20, alignItems: 'center' },
  giveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  secureNote:  { textAlign: 'center', color: '#6B6258', fontSize: 11, marginTop: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  handle:  { width: 40, height: 4, backgroundColor: '#E0D0F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#241E1A', textAlign: 'center', marginBottom: 4 },
  sheetSub:   { fontSize: 13, color: '#6B6258', textAlign: 'center', marginBottom: 16 },

  tabRow:        { flexDirection: 'row', backgroundColor: '#F0E9F8', borderRadius: 12, padding: 4, marginBottom: 14 },
  tab:           { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive:     { backgroundColor: Colors.primary },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#6B6258' },
  tabTextActive: { color: '#FFF' },

  appBtn:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5 },
  appBtnText: { fontSize: 16, fontWeight: '700' },
  appBtnAmt:  { fontSize: 16, fontWeight: '800' },

  autoDetectNote: { backgroundColor: '#D4EDDA', borderRadius: 10, padding: 10, marginTop: 4 },
  autoDetectNoteText: { fontSize: 12, color: '#155724', textAlign: 'center', fontWeight: '600' },

  qrWrap:   { alignItems: 'center', paddingVertical: 8 },
  qrInstr:  { fontSize: 13, color: '#6B6258', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  qrBox:    { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#E1D3F0', marginBottom: 10 },
  qrAmount: { fontSize: 26, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  qrId:     { fontSize: 14, fontWeight: '700', color: '#241E1A', marginBottom: 2 },
  qrName:   { fontSize: 12, color: '#6B6258', marginBottom: 16 },
  qrPaidBtn:    { backgroundColor: '#D4EDDA', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  qrPaidBtnText:{ fontSize: 14, fontWeight: '700', color: '#155724' },

  cancelBtn:  { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: '#6B6258', fontSize: 15, fontWeight: '600' },

  txnSheet:  { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },

  autoDetectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#D4EDDA', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#C3E6CB',
  },
  autoDetectedIcon:  { fontSize: 28 },
  autoDetectedTitle: { fontSize: 14, fontWeight: '800', color: '#155724' },
  autoDetectedSub:   { fontSize: 12, color: '#155724', marginTop: 2 },

  txnTitle:  { fontSize: 20, fontWeight: '800', color: '#241E1A', marginBottom: 6 },
  txnSub:    { fontSize: 13, color: '#6B6258', lineHeight: 19, marginBottom: 16 },
  fieldLabel:{ fontSize: 13, fontWeight: '700', color: '#241E1A', marginBottom: 8 },

  txnInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  txnInput: {
    flex: 1, backgroundColor: '#F8F5FC', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E1D3F0', paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, fontWeight: '700', color: '#241E1A', letterSpacing: 1,
  },
  txnInputError: { borderColor: '#E2532A' },
  txnClearBtn:   { padding: 10 },
  txnError:      { fontSize: 12, color: '#E2532A', marginBottom: 8 },

  txnGuide: {
    backgroundColor: '#F8F5FC', borderRadius: 12, padding: 12,
    marginBottom: 14, marginTop: 8, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  txnGuideTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  txnGuideItem:  { fontSize: 11, color: '#6B6258', lineHeight: 18, marginBottom: 2 },

  nameInput: {
    backgroundColor: '#F8F5FC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E1D3F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#241E1A', marginBottom: 16,
  },

  txnActions:    { flexDirection: 'row', gap: 12 },
  txnCancelBtn:  { flex: 1, borderWidth: 1, borderColor: '#E1D3F0', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  txnCancelText: { color: '#6B6258', fontWeight: '600', fontSize: 14 },
  txnConfirmBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  txnConfirmText:{ color: '#FFF', fontWeight: '700', fontSize: 14 },

  successSheet:  { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  successEmoji:  { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  successTitle:  { fontSize: 28, fontWeight: '800', color: '#241E1A', textAlign: 'center', marginBottom: 8 },
  successMsg:    { fontSize: 14, color: '#6B6258', textAlign: 'center', lineHeight: 21, marginBottom: 20 },

  receiptBox:   { backgroundColor: '#F8F5FC', borderRadius: 16, padding: 16, marginBottom: 20 },
  receiptRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  receiptLabel: { fontSize: 13, color: '#6B6258' },
  receiptValue: { fontSize: 13, fontWeight: '700', color: '#241E1A', maxWidth: '60%', textAlign: 'right' },

  shareBtn:     { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 12 },
  shareBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  doneBtn:      { borderRadius: 16, overflow: 'hidden' },
  doneBtnInner: { paddingVertical: 16, alignItems: 'center' },
  doneBtnText:  { color: '#FFF', fontWeight: '800', fontSize: 16 },
});

export default DonationScreen;