import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet,
  TouchableOpacity, Dimensions, Image, Modal,
  TextInput, Share, Alert, ActivityIndicator,
  Platform, StatusBar, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import TabBar from '../components/TabBar';

const { width } = Dimensions.get('window');
const WP_BASE = 'https://menorahedu.in/wp-json/menorah/v1';

// ── Fetch today's devotion from WordPress ─────────────────────────────────────
async function fetchTodayDevotion() {
  try {
    const res  = await fetch(`${WP_BASE}/devotion/today`);
    const data = await res.json();
    if (res.ok && data.id) return data;
    throw new Error('no data');
  } catch (_) {
    // Static fallback while WordPress endpoint is being set up
    return {
      id:           1,
      date:         new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      verse_text:   '"The Lord is close to the brokenhearted and saves those who are crushed in spirit."',
      verse_ref:    'Psalm 34:18',
      full_text:    'God does not despise a broken heart. In fact, He is drawn to it. When we feel shattered by circumstances, grief, or failure — that is the very moment He draws near. David, who wrote this psalm, knew what it meant to be brought low. He had experienced loss, betrayal, and shame. Yet in all of it, he found that the Lord was not distant but near.\n\nToday, whatever has broken your heart, invite Him into that tender place. He is not just watching from a distance — He is close. He saves. He restores.',
      reflection:   'Take a moment to reflect on today\'s verse and how it speaks to your heart. Where do you feel brokenhearted today? Can you trust that God is especially near to you in that place?',
      audio_url:    '',
      image_url:    '',
    };
  }
}

// ── Streak helpers ────────────────────────────────────────────────────────────
async function getStreak() {
  try {
    const raw = await AsyncStorage.getItem('devotion_streak');
    if (!raw) return { count: 0, lastDate: null };
    return JSON.parse(raw);
  } catch (_) { return { count: 0, lastDate: null }; }
}

async function updateStreak() {
  const today = new Date().toDateString();
  const data  = await getStreak();
  if (data.lastDate === today) return data.count; // already read today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = data.lastDate === yesterday.toDateString();
  const newCount = isConsecutive ? data.count + 1 : 1;

  await AsyncStorage.setItem('devotion_streak', JSON.stringify({
    count: newCount,
    lastDate: today,
  }));
  return newCount;
}

// ── Personal reflections store ────────────────────────────────────────────────
async function saveReflection(devotionId, text) {
  try {
    const key  = 'reflection_' + devotionId;
    await AsyncStorage.setItem(key, text);
  } catch (_) {}
}

async function loadReflection(devotionId) {
  try {
    const key = 'reflection_' + devotionId;
    return await AsyncStorage.getItem(key) || '';
  } catch (_) { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────────

const DailyWordScreen = ({ navigation }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [devotion,       setDevotion]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [streak,         setStreak]         = useState(0);
  const [myReflection,   setMyReflection]   = useState('');
  const [draftReflection,setDraftReflection]= useState('');

  // Modals
  const [showReadModal,    setShowReadModal]    = useState(false);
  const [showReflectModal, setShowReflectModal] = useState(false);
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [dev, streakCount] = await Promise.all([
      fetchTodayDevotion(),
      updateStreak(),
    ]);
    setDevotion(dev);
    setStreak(streakCount);

    const saved = await loadReflection(dev.id);
    setMyReflection(saved);
    setDraftReflection(saved);

    setLoading(false);

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7,   useNativeDriver: false }),
    ]).start();
  };

  // ── Action: Read (full devotion text) ───────────────────────────────────────
  const handleRead = () => {
    if (!devotion) return;
    setShowReadModal(true);
  };

  // ── Action: Listen ──────────────────────────────────────────────────────────
  const handleListen = () => {
    if (devotion && devotion.audio_url) {
      Alert.alert('Audio Devotion', 'Opening audio player…');
      // TODO: integrate expo-av for audio playback
    } else {
      Alert.alert('Coming Soon', 'Audio devotions will be available soon!');
    }
  };

  // ── Action: Reflect ─────────────────────────────────────────────────────────
  const handleReflect = () => {
    setDraftReflection(myReflection);
    setShowReflectModal(true);
  };

  const handleSaveReflection = async () => {
    if (!devotion) return;
    setSavingReflection(true);
    await saveReflection(devotion.id, draftReflection);
    setMyReflection(draftReflection);
    setSavingReflection(false);
    setShowReflectModal(false);
    Alert.alert('Saved!', 'Your reflection has been saved.');
  };

  // ── Action: Share ───────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!devotion) return;
    const msg =
      devotion.verse_text + '\n\n' +
      '— ' + devotion.verse_ref + '\n\n' +
      'Daily devotion from Menorah Family Camp\n' +
      'menorahedu.in';
    try {
      await Share.share({ message: msg, title: 'Today\'s Verse — ' + devotion.verse_ref });
    } catch (_) {}
  };

  const ACTIONS = [
    { icon: '📖', label: 'Read',    onPress: handleRead    },
    { icon: '🎧', label: 'Listen',  onPress: handleListen  },
    { icon: '💭', label: 'Reflect', onPress: handleReflect },
    { icon: '🔗', label: 'Share',   onPress: handleShare   },
  ];

  const todayLabel = devotion
    ? devotion.date
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading today's word…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity:   fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: Platform.OS === 'android'
                ? (StatusBar.currentHeight || 24) + 12
                : 54,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>📖</Text>
            <View>
              <Text style={styles.headerTitle}>Today's Word</Text>
              <Text style={styles.headerDate}>{todayLabel}</Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>Streak {streak} 🔥</Text>
          </View>
        </Animated.View>

        {/* Verse Card */}
        <Animated.View
          style={[styles.verseCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {devotion && devotion.image_url ? (
            <Image
              source={{ uri: devotion.image_url }}
              style={styles.verseImage}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../../assets/images/devotion-bg.png')}
              style={styles.verseImage}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(75,24,118,0.88)', 'rgba(110,63,163,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verseGradient}
          >
            <Text style={styles.quoteIcon}>❝</Text>
            <Text style={styles.verseText}>
              {devotion ? devotion.verse_text : ''}
            </Text>
            <Text style={styles.verseRef}>
              {devotion ? devotion.verse_ref : ''}
            </Text>
            <TouchableOpacity style={styles.readMoreBtn} onPress={handleRead}>
              <Text style={styles.readMoreText}>Read full devotion →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconWrap}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Reflection (from WordPress) */}
        <Animated.View
          style={[
            styles.reflectionCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.reflectionTitle}>📝 Daily Reflection</Text>
          <Text style={styles.reflectionText}>
            {devotion ? devotion.reflection : ''}
          </Text>

          {/* My personal reflection */}
          {myReflection ? (
            <View style={styles.myReflectionWrap}>
              <Text style={styles.myReflectionLabel}>✨ My Reflection</Text>
              <Text style={styles.myReflectionText}>{myReflection}</Text>
              <TouchableOpacity onPress={handleReflect} style={styles.editReflectionBtn}>
                <Text style={styles.editReflectionText}>Edit →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.writeReflectionBtn} onPress={handleReflect}>
              <Text style={styles.writeReflectionText}>✏️  Write your reflection</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Streak Card */}
        <Animated.View style={[styles.streakCard, { opacity: fadeAnim }]}>
          <Text style={styles.streakCardTitle}>Your Reading Streak</Text>
          <View style={styles.streakDots}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[styles.streakDot, i < (streak % 7 || (streak > 0 ? 7 : 0)) && styles.streakDotActive]}
              />
            ))}
          </View>
          <Text style={styles.streakCardSub}>
            {streak > 0
              ? 'You have read ' + streak + ' day' + (streak === 1 ? '' : 's') + ' in a row. Keep it up!'
              : 'Start your streak by reading today!'}
          </Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button — write reflection */}
      <TouchableOpacity style={styles.fab} onPress={handleReflect} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>

      <TabBar navigation={navigation} activeTab="Word" />

      {/* ── Modal: Full Devotion Text ─────────────────────────── */}
      <Modal
        visible={showReadModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReadModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.readModal}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.readModalHeader}>
                <Text style={styles.readModalRef}>
                  {devotion ? devotion.verse_ref : ''}
                </Text>
                <Text style={styles.readModalDate}>{todayLabel}</Text>
              </View>

              <LinearGradient
                colors={['#F0E9F8', '#FBF1E4']}
                style={styles.readVerseBox}
              >
                <Text style={styles.readVerseQuote}>❝</Text>
                <Text style={styles.readVerseText}>
                  {devotion ? devotion.verse_text : ''}
                </Text>
                <Text style={styles.readVerseRef}>
                  — {devotion ? devotion.verse_ref : ''}
                </Text>
              </LinearGradient>

              <Text style={styles.readBodyTitle}>Devotion</Text>
              <Text style={styles.readBodyText}>
                {devotion ? devotion.full_text : ''}
              </Text>

              <TouchableOpacity style={styles.shareFromReadBtn} onPress={handleShare}>
                <Text style={styles.shareFromReadText}>📤  Share this verse</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowReadModal(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Write Reflection ───────────────────────────── */}
      <Modal
        visible={showReflectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReflectModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.reflectModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.reflectModalTitle}>💭 My Reflection</Text>
            <Text style={styles.reflectModalSub}>
              {devotion ? devotion.verse_ref : ''} · {todayLabel}
            </Text>

            <View style={styles.reflectInputWrap}>
              <TextInput
                value={draftReflection}
                onChangeText={setDraftReflection}
                placeholder="Write what this verse means to you today…"
                placeholderTextColor="#A39A8C"
                multiline
                numberOfLines={8}
                style={styles.reflectInput}
                returnKeyType="default"
                blurOnSubmit={false}
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {draftReflection.length}/1000
              </Text>
            </View>

            <View style={styles.reflectActions}>
              <TouchableOpacity
                style={styles.reflectCancelBtn}
                onPress={() => {
                  setDraftReflection(myReflection);
                  setShowReflectModal(false);
                }}
              >
                <Text style={styles.reflectCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reflectSaveBtn}
                onPress={handleSaveReflection}
                disabled={savingReflection}
              >
                {savingReflection ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.reflectSaveText}>Save Reflection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bgLight },
  centered:    { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, color: Colors.textGray, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center' },
  headerIcon:  { fontSize: 28, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  headerDate:  { fontSize: 13, color: Colors.textGray, marginTop: 2 },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  verseCard: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  verseImage: {
    width: '100%',
    height: 340,
    position: 'absolute',
  },
  verseGradient: {
    padding: 28,
    minHeight: 340,
    justifyContent: 'center',
  },
  quoteIcon:    { fontSize: 40, color: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  verseText:    { fontSize: 21, fontWeight: '700', color: '#FFF', lineHeight: 33, marginBottom: 20 },
  verseRef:     { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 20 },
  readMoreBtn:  { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  readMoreText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  actionsRow:    { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 24 },
  actionButton:  { alignItems: 'center' },
  actionIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon:  { fontSize: 26 },
  actionLabel: { fontSize: 12, color: Colors.textGray, fontWeight: '600' },

  reflectionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 22,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  reflectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  reflectionText:  { fontSize: 14, color: Colors.textGray, lineHeight: 22, marginBottom: 16 },

  myReflectionWrap: {
    backgroundColor: '#F8F5FC',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  myReflectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  myReflectionText:  { fontSize: 13, color: Colors.textDark, lineHeight: 20 },
  editReflectionBtn: { alignSelf: 'flex-end', marginTop: 8 },
  editReflectionText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  writeReflectionBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  writeReflectionText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },

  streakCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  streakCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textDark, marginBottom: 14 },
  streakDots:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  streakDot:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E1D3F0' },
  streakDotActive: { backgroundColor: Colors.primary },
  streakCardSub:   { fontSize: 13, color: Colors.textGray, textAlign: 'center', lineHeight: 18 },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  fabIcon: { fontSize: 22 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  // Read Modal
  readModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHandle:      { width: 40, height: 4, backgroundColor: '#E0D0F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  readModalHeader:  { marginBottom: 16 },
  readModalRef:     { fontSize: 22, fontWeight: '800', color: Colors.primary },
  readModalDate:    { fontSize: 13, color: Colors.textGray, marginTop: 2 },
  readVerseBox:     { borderRadius: 18, padding: 20, marginBottom: 20 },
  readVerseQuote:   { fontSize: 30, color: Colors.primary, opacity: 0.3, marginBottom: 6 },
  readVerseText:    { fontSize: 17, fontWeight: '700', color: Colors.textDark, lineHeight: 27, marginBottom: 10 },
  readVerseRef:     { fontSize: 14, fontWeight: '600', color: Colors.primary },
  readBodyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 12 },
  readBodyText:     { fontSize: 15, color: Colors.textGray, lineHeight: 26, marginBottom: 24 },
  shareFromReadBtn: { backgroundColor: '#F0E9F8', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16 },
  shareFromReadText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  closeBtn:          { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  closeBtnText:      { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Reflect Modal
  reflectModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  reflectModalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  reflectModalSub:   { fontSize: 13, color: Colors.textGray, marginBottom: 16 },
  reflectInputWrap:  {
    backgroundColor: '#F8F5FC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E1D3F0',
    marginBottom: 16,
  },
  reflectInput: {
    padding: 14,
    fontSize: 15,
    color: Colors.textDark,
    lineHeight: 24,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  charCount:       { textAlign: 'right', fontSize: 11, color: Colors.textGray, paddingRight: 12, paddingBottom: 8 },
  reflectActions:  { flexDirection: 'row', gap: 12 },
  reflectCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#E1D3F0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  reflectCancelText: { color: Colors.textGray, fontWeight: '600', fontSize: 15 },
  reflectSaveBtn:   { flex: 2, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  reflectSaveText:  { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default DailyWordScreen;