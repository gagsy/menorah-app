import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet,
  TouchableOpacity, Dimensions, Alert,
  Platform, StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/Colors';
import {
  registerForPushNotifications,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  addNotificationListeners,
} from '../services/NotificationService';

const { width } = Dimensions.get('window');

const TYPE_ICON = {
  event:        { icon: '📖', color: '#7B3FA0' },
  prayer:       { icon: '🙏', color: '#059669' },
  donation:     { icon: '❤️', color: '#DC2626' },
  announcement: { icon: '🔔', color: '#D97706' },
  camp:         { icon: '🏕️', color: '#2563EB' },
  sermon:       { icon: '🎙️', color: '#6E3FA3' },
};

const FILTERS = ['All', 'Unread', 'Events', 'Prayer', 'Donation'];

const NotificationScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState('All');

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadNotifications();
    setupPush();

    // Listen for push notifications arriving while app is open
    const cleanup = addNotificationListeners(
      (notification) => {
        // Notification received while app is in foreground — prepend to list
        const payload = notification.request.content;
        const newItem = {
          id:      'push_' + Date.now(),
          type:    payload.data?.type || 'announcement',
          title:   payload.title      || 'New Notification',
          message: payload.body       || '',
          time:    'Just now',
          read:    false,
          icon:    TYPE_ICON[payload.data?.type]?.icon  || '🔔',
          color:   TYPE_ICON[payload.data?.type]?.color || '#6E3FA3',
        };
        setNotifications(prev => [newItem, ...prev]);
      },
      (response) => {
        // User tapped a push notification — navigate if needed
        const data = response.notification.request.content.data;
        if (data?.screen) {
          navigation.navigate(data.screen);
        }
      }
    );
    return cleanup;
  }, []);

  const setupPush = async () => {
    try {
      await registerForPushNotifications();
    } catch (_) {}
  };

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchNotifications();
    setNotifications(data);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await fetchNotifications();
    setNotifications(data);
    setRefreshing(false);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleMarkRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead();
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredNotifications = (() => {
    if (filter === 'All')     return notifications;
    if (filter === 'Unread')  return notifications.filter(n => !n.read);
    if (filter === 'Events')  return notifications.filter(n => n.type === 'event' || n.type === 'camp');
    if (filter === 'Prayer')  return notifications.filter(n => n.type === 'prayer');
    if (filter === 'Donation')return notifications.filter(n => n.type === 'donation');
    return notifications;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgLight} />

      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 54 },
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleMarkAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.markAllText, unreadCount === 0 && { opacity: 0.4 }]}>
            Mark all read
          </Text>
        </TouchableOpacity>
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
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'Unread' ? 'You are all caught up!' : 'Nothing here yet.'}
              </Text>
            </View>
          ) : (
            filteredNotifications.map((n, index) => {
              const meta = TYPE_ICON[n.type] || { icon: '🔔', color: '#6E3FA3' };
              return (
                <Animated.View
                  key={n.id}
                  style={[
                    styles.card,
                    !n.read && styles.cardUnread,
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
                  <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() => handleMarkRead(n.id)}
                    activeOpacity={0.8}
                  >
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: (n.color || meta.color) + '18' }]}>
                      <Text style={styles.iconText}>{n.icon || meta.icon}</Text>
                    </View>

                    {/* Text */}
                    <View style={styles.textWrap}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                        {!n.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.cardMessage} numberOfLines={3}>{n.message}</Text>
                      <Text style={styles.cardTime}>{n.time}</Text>
                    </View>

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(n.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.deleteIcon}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn:         { width: 40 },
  backIcon:        { fontSize: 24, color: Colors.primary, fontWeight: '600' },
  headerCenter:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: Colors.textDark },
  headerBadge: {
    backgroundColor: '#E2532A',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  markAllText:     { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  filterScroll:    { maxHeight: 52, marginBottom: 8 },
  filterContainer: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:       { fontSize: 13, fontWeight: '600', color: Colors.textGray },
  filterTextActive: { color: '#FFF' },

  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { color: Colors.textGray, marginTop: 12, fontSize: 14 },

  listContent: { paddingHorizontal: 20, paddingTop: 4 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconText: { fontSize: 22 },

  textWrap:  { flex: 1, paddingRight: 8 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textDark, flex: 1, marginRight: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, flexShrink: 0 },
  cardMessage:{ fontSize: 13, color: Colors.textGray, lineHeight: 19, marginBottom: 5 },
  cardTime:   { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  deleteBtn:  { padding: 4, marginTop: -2 },
  deleteIcon: { fontSize: 18, color: '#C0C0C0', fontWeight: '400' },

  emptyState:   { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon:    { fontSize: 64, marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  emptySubtitle:{ fontSize: 14, color: Colors.textGray },
});

export default NotificationScreen;