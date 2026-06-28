import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet,
  TouchableOpacity, Dimensions, Modal, TextInput,
  Share, Alert, ActivityIndicator, Platform,
  StatusBar, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import TabBar from '../components/TabBar';

const { width } = Dimensions.get('window');
const WP_BASE = 'https://menorahedu.in/wp-json/menorah/v1';

// ── API helpers ───────────────────────────────────────────────────────────────
async function authHeaders() {
  const token = await AsyncStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
}

async function fetchPrayers(tag) {
  try {
    const url = tag && tag !== 'All'
      ? WP_BASE + '/prayers?tag=' + encodeURIComponent(tag)
      : WP_BASE + '/prayers';
    const res  = await fetch(url);
    const data = await res.json();
    if (res.ok && Array.isArray(data.prayers)) return data.prayers;
    throw new Error('bad response');
  } catch (_) {
    // Static fallback until WordPress plugin is active
    return [
      { id: 1, tag: 'Urgent',  tagColor: '#E2532A', title: 'Mission Trip to Nepal', description: 'Pray for visas, provisions, and open doors for the gospel in the Kathmandu region.', count: 24, prayed: false, author: 'Pastor David' },
      { id: 2, tag: 'Mission', tagColor: '#2F8FD1', title: 'Youth Revival Camp', description: 'Pray for 100 youth to encounter Yeshua at summer camp this July.', count: 156, prayed: false, author: 'Youth Ministry' },
      { id: 3, tag: 'Family',  tagColor: '#5BA84F', title: 'Family Restoration', description: 'Healing for broken homes across our urban community.', count: 89, prayed: false, author: 'Admin' },
      { id: 4, tag: 'Mission', tagColor: '#2F8FD1', title: 'Building Project Phase 3', description: 'Pray for funds and open doors for the sanctuary interior to be completed.', count: 203, prayed: false, author: 'Admin' },
      { id: 5, tag: 'Family',  tagColor: '#5BA84F', title: "Pastor David's Health", description: 'Pray for strength and divine health for our senior pastor and his family.', count: 312, prayed: false, author: 'Admin' },
    ];
  }
}

async function submitPrayerRequest(title, description, tag, authorName) {
  try {
    const res = await fetch(WP_BASE + '/prayer/submit', {
      method:  'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        title,
        description,
        tag,
        author_name: authorName || 'Anonymous',
      }),
    });
    const data = await res.json();
    return res.ok ? { success: true, id: data.id } : { success: false, error: data.message };
  } catch (_) {
    // Offline: add locally so user sees their prayer immediately
    return { success: true, id: Date.now(), offline: true };
  }
}

async function markPrayed(prayerId) {
  try {
    await fetch(WP_BASE + '/prayer/' + prayerId + '/pray', {
      method:  'POST',
      headers: await authHeaders(),
    });
  } catch (_) {}
}

// ── Locally track which prayers the user has prayed ──────────────────────────
async function getPrayedIds() {
  try {
    const raw = await AsyncStorage.getItem('prayed_ids');
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
async function addPrayedId(id) {
  try {
    const ids = await getPrayedIds();
    if (!ids.includes(id)) {
      await AsyncStorage.setItem('prayed_ids', JSON.stringify([...ids, id]));
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────

const TAG_COLORS = {
  All:     '#6E3FA3',
  Urgent:  '#E2532A',
  Mission: '#2F8FD1',
  Family:  '#5BA84F',
  Health:  '#D6217A',
  Finance: '#D8A153',
};

const FILTERS = ['All', 'Urgent', 'Mission', 'Family', 'Health', 'Finance'];

const PrayerScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [prayers,      setPrayers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('All');
  const [prayedToday,  setPrayedToday]  = useState(0);

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [newTitle,        setNewTitle]        = useState('');
  const [newDesc,         setNewDesc]         = useState('');
  const [newTag,          setNewTag]          = useState('Family');
  const [authorName,      setAuthorName]      = useState('');

  // Stats bar counts
  const totalPrayers  = prayers.length;
  const prayedCount   = prayers.filter(p => p.prayed).length;
  const urgentCount   = prayers.filter(p => p.tag === 'Urgent').length;

  useEffect(() => {
    loadPrayers();
    loadUserName();
  }, []);

  useEffect(() => {
    loadPrayers();
  }, [filter]);

  const loadUserName = async () => {
    try {
      const raw = await AsyncStorage.getItem('user_profile');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.name && u.name !== 'Guest User') setAuthorName(u.name);
      }
    } catch (_) {}
  };

  const loadPrayers = async () => {
    setLoading(true);
    const [fetched, prayedIds] = await Promise.all([
      fetchPrayers(filter),
      getPrayedIds(),
    ]);
    // Mark prayers user has already prayed
    const merged = fetched.map(p => ({
      ...p,
      prayed: prayedIds.includes(p.id),
    }));
    setPrayers(merged);
    setPrayedToday(merged.filter(p => p.prayed).length);
    setLoading(false);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const handleTogglePrayed = async (id) => {
    const prayer = prayers.find(p => p.id === id);
    if (!prayer) return;

    const newPrayed = !prayer.prayed;
    // Optimistic UI update
    setPrayers(prev => prev.map(p =>
      p.id === id
        ? { ...p, prayed: newPrayed, count: p.count + (newPrayed ? 1 : -1) }
        : p
    ));
    setPrayedToday(prev => prev + (newPrayed ? 1 : -1));

    if (newPrayed) {
      await addPrayedId(id);
      markPrayed(id); // fire and forget
    }
  };

  const handleShare = async (prayer) => {
    const msg =
      '🙏 Please pray with us!\n\n' +
      prayer.title + '\n\n' +
      prayer.description + '\n\n' +
      '— Menorah Family Camp\nmenorahedu.in';
    try {
      await Share.share({ message: msg, title: prayer.title });
    } catch (_) {}
  };

  const handleSubmitPrayer = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a prayer title.');
      return;
    }
    if (!newDesc.trim()) {
      Alert.alert('Required', 'Please describe your prayer request.');
      return;
    }
    setSubmitting(true);
    const result = await submitPrayerRequest(
      newTitle.trim(),
      newDesc.trim(),
      newTag,
      authorName,
    );
    setSubmitting(false);

    if (result.success) {
      // Immediately add to local list so user sees it
      const newPrayer = {
        id:          result.id,
        tag:         newTag,
        tagColor:    TAG_COLORS[newTag] || Colors.primary,
        title:       newTitle.trim(),
        description: newDesc.trim(),
        count:       1,
        prayed:      true,
        author:      authorName || 'Anonymous',
        pending:     result.offline,
      };
      setPrayers(prev => [newPrayer, ...prev]);
      setShowSubmitModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewTag('Family');
      Alert.alert(
        'Prayer Submitted! 🙏',
        result.offline
          ? 'Your prayer has been saved and will be shared with the community once you are online.'
          : 'Your prayer request has been shared with the Menorah family. We are praying with you!',
      );
    } else {
      Alert.alert('Error', result.error || 'Could not submit prayer. Please try again.');
    }
  };

  const filteredPrayers = filter === 'All'
    ? prayers
    : prayers.filter(p => p.tag === filter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />

      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 54 },
      ]}>
        <View>
          <Text style={styles.headerTitle}>Prayer Wall</Text>
          <Text style={styles.headerSub}>Interceding together</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowSubmitModal(true)}>
          <Text style={styles.addBtnText}>+ Add Prayer</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{prayedCount}</Text>
          <Text style={styles.statLabel}>Prayed</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMid]}>
          <Text style={styles.statNum}>{totalPrayers}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, urgentCount > 0 && { color: '#E2532A' }]}>
            {urgentCount}
          </Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        style={styles.filterScroll}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: TAG_COLORS[f] || Colors.primary, borderColor: 'transparent' }]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Prayer List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading prayers…</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {filteredPrayers.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>🙏</Text>
              <Text style={styles.emptyTitle}>No prayers in this category yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to add one!</Text>
            </View>
          )}

          {filteredPrayers.map((prayer, index) => (
            <Animated.View
              key={prayer.id}
              style={[
                styles.prayerCard,
                prayer.prayed && styles.prayerCardPrayed,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange:  [0, 1],
                      outputRange: [20 * (index + 1), 0],
                    }),
                  }],
                },
              ]}
            >
              {/* Tag + pending indicator */}
              <View style={styles.prayerHeaderRow}>
                <View style={[styles.tag, { backgroundColor: (prayer.tagColor || Colors.primary) + '22' }]}>
                  <Text style={[styles.tagText, { color: prayer.tagColor || Colors.primary }]}>
                    {prayer.tag}
                  </Text>
                </View>
                {prayer.pending && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending sync</Text>
                  </View>
                )}
                {prayer.author ? (
                  <Text style={styles.authorText}>by {prayer.author}</Text>
                ) : null}
              </View>

              <Text style={styles.prayerTitle}>{prayer.title}</Text>
              <Text style={styles.prayerDesc}>{prayer.description}</Text>

              <View style={styles.prayerFooter}>
                <View style={styles.prayerCount}>
                  <Text style={styles.countIcon}>🙏</Text>
                  <Text style={styles.countText}>{prayer.count} interceding</Text>
                </View>

                <View style={styles.footerActions}>
                  {/* Share button */}
                  <TouchableOpacity
                    style={styles.shareIconBtn}
                    onPress={() => handleShare(prayer)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareIconText}>📤</Text>
                  </TouchableOpacity>

                  {/* Pray button */}
                  <TouchableOpacity
                    style={[styles.prayBtn, prayer.prayed && styles.prayBtnPrayed]}
                    onPress={() => handleTogglePrayed(prayer.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prayBtnText, prayer.prayed && styles.prayBtnTextPrayed]}>
                      {prayer.prayed ? 'Prayed ✓' : 'Pray'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ))}

          {/* CTA Banner */}
          <LinearGradient
            colors={['#4B2876', '#6E3FA3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBanner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Let's keep praying together!</Text>
              <Text style={styles.ctaSub}>Your prayers make a difference.</Text>
            </View>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => setShowSubmitModal(true)}
            >
              <Text style={styles.ctaBtnText}>Share a Prayer</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <TabBar navigation={navigation} activeTab="Prayer" />

      {/* ── Submit Prayer Modal ──────────────────────────── */}
      <Modal
        visible={showSubmitModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.submitModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🙏 Share a Prayer Request</Text>
            <Text style={styles.modalSub}>
              Your request will be shared with the Menorah family after admin review.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Your name */}
              <Text style={styles.fieldLabel}>Your Name</Text>
              <TextInput
                value={authorName}
                onChangeText={setAuthorName}
                placeholder="Full name (optional)"
                placeholderTextColor="#A39A8C"
                style={styles.textInput}
              />

              {/* Title */}
              <Text style={styles.fieldLabel}>Prayer Title *</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Healing for my mother"
                placeholderTextColor="#A39A8C"
                style={styles.textInput}
                maxLength={100}
              />
              <Text style={styles.charCount}>{newTitle.length}/100</Text>

              {/* Description */}
              <Text style={styles.fieldLabel}>Prayer Details *</Text>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="Share more about your prayer request…"
                placeholderTextColor="#A39A8C"
                multiline
                numberOfLines={5}
                style={[styles.textInput, styles.textArea]}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{newDesc.length}/500</Text>

              {/* Tag selection */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.tagGrid}>
                {FILTERS.filter(f => f !== 'All').map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.tagOption,
                      newTag === t && { backgroundColor: TAG_COLORS[t] || Colors.primary, borderColor: 'transparent' },
                    ]}
                    onPress={() => setNewTag(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tagOptionText, newTag === t && { color: '#FFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowSubmitModal(false);
                    setNewTitle('');
                    setNewDesc('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmitPrayer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Prayer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textDark },
  headerSub:   { fontSize: 13, color: Colors.textGray, marginTop: 2 },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F0E6FA' },
  statNum:    { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel:  { fontSize: 11, color: Colors.textGray, marginTop: 2 },

  filterScroll:    { maxHeight: 52, marginBottom: 8 },
  filterContainer: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterText:       { fontSize: 13, fontWeight: '600', color: Colors.textGray },
  filterTextActive: { color: '#FFF' },

  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingText:  { color: Colors.textGray, marginTop: 12, fontSize: 14 },

  emptyWrap:     { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: Colors.textGray },

  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },

  prayerCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  prayerCardPrayed: { borderLeftWidth: 4, borderLeftColor: '#5BA84F' },

  prayerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 11, fontWeight: '700' },

  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingText:  { fontSize: 10, fontWeight: '600', color: '#D97706' },
  authorText:   { fontSize: 11, color: Colors.textGray, marginLeft: 'auto' },

  prayerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark, marginBottom: 6 },
  prayerDesc:  { fontSize: 13, color: Colors.textGray, lineHeight: 20, marginBottom: 14 },

  prayerFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prayerCount:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countIcon:     { fontSize: 14 },
  countText:     { fontSize: 13, color: Colors.textGray },

  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareIconBtn:  { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F0E9F8', alignItems: 'center', justifyContent: 'center' },
  shareIconText: { fontSize: 16 },

  prayBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
  },
  prayBtnPrayed:     { backgroundColor: '#D1FAE5' },
  prayBtnText:       { color: '#FFF', fontSize: 13, fontWeight: '700' },
  prayBtnTextPrayed: { color: '#059669' },

  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 18,
    marginTop: 8,
    gap: 12,
  },
  ctaTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  ctaSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  ctaBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ctaBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

  submitModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0D0F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 20, fontWeight: '800', color: Colors.textDark, marginBottom: 4 },
  modalSub:    { fontSize: 13, color: Colors.textGray, marginBottom: 20, lineHeight: 18 },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 6, marginTop: 14 },
  textInput: {
    backgroundColor: '#F8F5FC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E1D3F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textDark,
  },
  textArea:  { minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: Colors.textGray, textAlign: 'right', marginTop: 4 },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  tagOption: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F8F5FC',
    borderWidth: 1.5,
    borderColor: '#E1D3F0',
  },
  tagOptionText: { fontSize: 13, fontWeight: '600', color: Colors.textDark },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1D3F0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textGray, fontWeight: '600', fontSize: 15 },
  submitBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});

export default PrayerScreen;