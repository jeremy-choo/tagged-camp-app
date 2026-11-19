// All camp content lives here so it's easy to edit. Times follow the 2026 spreadsheet for now.
// Evening worships are NOT in the sheet's visible range, so they're placeholders flagged tbc:true.
const t = (h, m = 0) => h * 60 + m;

window.CAMP = {
  name: 'TAGGED',
  days: [
    { id: 0, short: 'THU', long: 'Thursday', date: '25 Mar' },
    { id: 1, short: 'FRI', long: 'Friday', date: '26 Mar' },
    { id: 2, short: 'SAB', long: 'Sabbath', date: '27 Mar' },
    { id: 3, short: 'SUN', long: 'Sunday', date: '28 Mar' },
    { id: 4, short: 'MON', long: 'Monday', date: '29 Mar' },
  ],

  // game:false = tagging is paused during this kind of event
  types: {
    arrive:   { label: 'Arrivals',        color: '#9a968c', game: true  },
    worship:  { label: 'Main worship',    color: '#ff3b4e', game: false },
    devo:     { label: 'Devotional',      color: '#ffd60a', game: false },
    school:   { label: 'Sabbath School',  color: '#a259ff', game: false },
    meal:     { label: 'Meal',            color: '#ff8a1f', game: false },
    game:     { label: 'Games',           color: '#d6ff3d', game: true  },
    free:     { label: 'Free time',       color: '#14e0d0', game: true  },
    activity: { label: 'Activity',        color: '#ff4fb8', game: true  },
    offsite:  { label: 'Offsite',         color: '#2f8bff', game: false },
  },

  events: [
    { day: 0, s: t(13), e: t(17), title: 'People start arriving', type: 'arrive', place: 'Check-in' },
    { day: 0, s: t(19, 30), e: t(21), title: 'Worship #1', type: 'worship', place: 'Main hall', tbc: true },

    { day: 1, s: t(9), e: t(10), title: 'Breakfast + devotional', type: 'devo', place: 'Dining hall' },
    { day: 1, s: t(10), e: t(12, 30), title: 'Games – informal', type: 'game', place: 'Oval' },
    { day: 1, s: t(12, 30), e: t(13), title: 'Lunch', type: 'meal', place: 'Dining hall' },
    { day: 1, s: t(13), e: t(14), title: 'Free time', type: 'free' },
    { day: 1, s: t(14), e: t(16), title: 'Games – formal', type: 'game', place: 'Oval', tbc: true },
    { day: 1, s: t(19, 30), e: t(21), title: 'Worship #2', type: 'worship', place: 'Main hall', tbc: true },

    { day: 2, s: t(9), e: t(10), title: 'Breakfast + devotional', type: 'devo', place: 'Dining hall' },
    { day: 2, s: t(10), e: t(11), title: 'Sabbath School', type: 'school', place: 'Team spaces' },
    { day: 2, s: t(11), e: t(12, 30), title: 'Worship #3 – Church', type: 'worship', place: 'Main hall' },
    { day: 2, s: t(12, 30), e: t(13), title: 'Lunch', type: 'meal', place: 'Dining hall' },
    { day: 2, s: t(13), e: t(14, 30), title: 'Free time', type: 'free' },
    { day: 2, s: t(14, 30), e: t(16), title: 'Scavenger hunt / activity', type: 'activity', place: 'Whole camp', tbc: true },
    { day: 2, s: t(19, 30), e: t(21), title: 'Worship #4', type: 'worship', place: 'Main hall', tbc: true },

    { day: 3, s: t(9), e: t(9, 30), title: 'Breakfast + devotional', type: 'devo', place: 'Dining hall' },
    { day: 3, s: t(9, 30), e: t(16), title: 'Offsite activity', type: 'offsite', place: 'Meet at buses', tbc: true },
    { day: 3, s: t(19, 30), e: t(21), title: 'Worship #5', type: 'worship', place: 'Main hall', tbc: true },

    { day: 4, s: t(9), e: t(10), title: 'Breakfast + devotional', type: 'devo', place: 'Dining hall' },
    { day: 4, s: t(10), e: t(11, 30), title: 'Worship #6 – Sent', type: 'worship', place: 'Main hall' },
  ],

  // Sample daily twists for the tag game. Placeholders for the team to rewrite.
  twists: [
    'Chains are live. Your target is secret – tell no one.',
    'Safe zone today: the dining hall. Sacred ground, no tagging.',
    'Find the hidden token in the scavenger hunt for 1 hour of immunity.',
    'Offsite day: the chain freezes until we are back at camp.',
    'Final survivors are revealed at Worship #6. Pass it on.',
  ],

  teams: [
    { id: 'red',    name: 'Red',    color: '#ff3b4e', pts: 120 },
    { id: 'orange', name: 'Orange', color: '#ff8a1f', pts: 95 },
    { id: 'yellow', name: 'Yellow', color: '#ffd60a', pts: 140 },
    { id: 'green',  name: 'Green',  color: '#2ee66b', pts: 80 },
    { id: 'aqua',   name: 'Aqua',   color: '#14e0d0', pts: 110 },
    { id: 'blue',   name: 'Blue',   color: '#2f8bff', pts: 130 },
    { id: 'purple', name: 'Purple', color: '#a259ff', pts: 70 },
    { id: 'pink',   name: 'Pink',   color: '#ff4fb8', pts: 105 },
  ],

  missions: [
    { id: 'm1', title: 'Encourage someone outside your team', body: 'Send or say one encouragement (a verse works). Then ask them to pass it on.', pts: 10 },
    { id: 'm2', title: 'Hear a story', body: 'Ask someone: "How did you come to know Jesus?" Listen well.', pts: 10 },
    { id: 'm3', title: 'Pray with someone new', body: 'Find someone you have not prayed with yet and pray for one thing.', pts: 15 },
    { id: 'm4', title: 'Serve without being asked', body: 'Clean up, carry, set up. Do it quietly.', pts: 10 },
    { id: 'm5', title: 'Teach one thing', body: 'Share one thing you learned today with someone who missed it.', pts: 15 },
  ],

  // Swap the id when this year's playlist is out (the long ID in the Spotify share link).
  playlist: { id: '6oStdzgF8KgUVMVEbhzGUY', title: 'Camp playlist', note: "Last year's playlist, as a preview. Listen before, during or after camp." },

  announcements: [
    { when: 'Thu 12:40', text: 'Welcome to TAGGED. Find your colour team at check-in and grab your wristband.' },
    { when: 'Thu 13:05', text: 'Phones stay on you all weekend. Notifications will tell you where to be.' },
  ],
};
