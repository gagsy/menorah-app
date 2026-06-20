export const ONBOARDING_DATA = [
  {
    id: 1,
    title: 'Light to\nthe Nations',
    subtitle: 'Get ministry updates, pray together, and stay connected to the Menorah family.',
    image: require('../../assets/images/onboarding1.png'),
  },
  {
    id: 2,
    title: 'Pray\nTogether',
    subtitle: 'Join a growing prayer movement for families, missions, and revival.',
    image: require('../../assets/images/onboarding2.png'),
  },
  {
    id: 3,
    title: 'Give with\nJoy',
    subtitle: 'Secure giving with instant receipts and transparent impact tracking.',
    image: require('../../assets/images/onboarding3.png'),
  },
];

export const PRAYER_DATA = [
  {
    id: 1,
    title: 'Mission Trip to Nepal',
    description: 'Pray for visas, provisions, and open doors for the gospel in Kathmandu region.',
    count: 312,
    tag: 'Urgent',
    tagColor: '#EF4444',
    prayed: false,
  },
  {
    id: 2,
    title: 'Youth Revival',
    description: 'Pray for 100 youth to encounter Yeshua at summer camp.',
    count: 156,
    tag: 'Weekly',
    tagColor: '#8B5CF6',
    prayed: true,
  },
  {
    id: 3,
    title: 'Family Restoration',
    description: 'Healing for broken homes and relationships.',
    count: 89,
    tag: 'Daily',
    tagColor: '#10B981',
    prayed: false,
  },
];

export const DONATION_AMOUNTS = [
  { amount: '₹500', impact: 'Supplies for a family' },
  { amount: '₹1,000', impact: 'Supports materials' },
  { amount: '₹2,500', impact: 'Helps outreach programs' },
  { amount: '₹5,000', impact: 'Sponsors a child' },
  { amount: 'Custom', impact: 'Any amount' },
];

export const PROFILE_MENU = [
  { icon: '💰', title: 'Giving History', screen: 'Donation' },
  { icon: '🙏', title: 'My Prayers', screen: 'Prayer' },
  { icon: '🔖', title: 'Bookmarks', screen: 'DailyWord' },
  { icon: '📅', title: 'Events Joined', screen: 'Home' },
  { icon: '🔔', title: 'Notifications', screen: 'Home' },
  { icon: '⚙️', title: 'Settings', screen: 'Home' },
  { icon: '❓', title: 'Help & Support', screen: 'Home' },
  { icon: '🚪', title: 'Logout', screen: 'Login' },
];
