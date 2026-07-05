// Mock data for PointPals frontend prototype.
// Everything lives client-side (useState) — swap for Supabase later.

export type PastelKey = "sky" | "butter" | "sage" | "blush" | "lilac" | "sand" | "foam";

export const PASTEL_HEX: Record<PastelKey, string> = {
  sky: "#B8D4EC",
  butter: "#F3E1A0",
  sage: "#C8DDBF",
  blush: "#EFC8CE",
  lilac: "#D4C4E8",
  sand: "#E8CFA8",
  foam: "#B8DDDC",
};

export const PASTEL_MUTED: Record<PastelKey, string> = {
  sky: "#CFD9E2",
  butter: "#E4DDC5",
  sage: "#D3D9CE",
  blush: "#DFCED2",
  lilac: "#D0CBD8",
  sand: "#DCD0BE",
  foam: "#CCD5D5",
};

export type Kid = {
  id: string;
  name: string;
  color: PastelKey;
  points: number; // personal
};

export type Chore = {
  id: string;
  name: string;
  icon: string; // emoji stand-in for the flat pastel icon (prototype only)
  color: PastelKey;
  points: number;
  recurrence: "none" | "daily" | "weekly";
};

export type Skill = {
  id: string;
  name: string;
  icon: string;
  color: PastelKey;
  points: number; // negative for "needs work"
  isPositive: boolean;
};

export type Companion = {
  id: string;
  name: string;
  trait: string;
  color: PastelKey;
  symbol: string; // emoji stand-in for the plush motif
  bodyShape: "dumpling" | "egg" | "pear";
  unlockAt: number; // household pool threshold
};

export type PointEvent = {
  id: string;
  kidId: string;
  itemName: string;
  itemIcon: string;
  points: number;
  at: number;
};

export type RewardProposal = {
  id: string;
  proposedByKidId: string;
  name: string;
  votes: string[]; // kid ids
};

// -------- Seed data --------

export const INITIAL_KIDS: Kid[] = [
  { id: "k1", name: "Nova", color: "blush", points: 34 },
  { id: "k2", name: "Milo", color: "sky", points: 22 },
  { id: "k3", name: "Wren", color: "sage", points: 18 },
];

export const INITIAL_CHORES: Chore[] = [
  { id: "c1", name: "Made the bed", icon: "i00", color: "sage", points: 2, recurrence: "daily" },
  {
    id: "c2",
    name: "Brushed teeth (AM)",
    icon: "i01",
    color: "butter",
    points: 1,
    recurrence: "daily",
  },
  {
    id: "c3",
    name: "Brushed teeth (PM)",
    icon: "i02",
    color: "lilac",
    points: 1,
    recurrence: "daily",
  },
  { id: "c4", name: "Got dressed", icon: "i03", color: "sand", points: 2, recurrence: "daily" },
  { id: "c5", name: "Cleared plate", icon: "i04", color: "sky", points: 1, recurrence: "daily" },
  { id: "c6", name: "Tidied bedroom", icon: "i16", color: "sand", points: 3, recurrence: "daily" },
  {
    id: "c7",
    name: "Packed school bag",
    icon: "i06",
    color: "sky",
    points: 2,
    recurrence: "daily",
  },
  {
    id: "c8",
    name: "Read 20 minutes",
    icon: "i12",
    color: "lilac",
    points: 3,
    recurrence: "daily",
  },
  { id: "c9", name: "Helped cook", icon: "i13", color: "sand", points: 3, recurrence: "none" },
  { id: "c10", name: "Fed the pet", icon: "i17", color: "sage", points: 2, recurrence: "daily" },
  {
    id: "c11",
    name: "Watered plants",
    icon: "i18",
    color: "butter",
    points: 2,
    recurrence: "weekly",
  },
  {
    id: "c12",
    name: "Folded laundry",
    icon: "i15",
    color: "blush",
    points: 3,
    recurrence: "weekly",
  },
  {
    id: "c13",
    name: "Emptied dishwasher",
    icon: "i35",
    color: "sand",
    points: 2,
    recurrence: "weekly",
  },
  {
    id: "c14",
    name: "Took out rubbish",
    icon: "i14",
    color: "sky",
    points: 2,
    recurrence: "weekly",
  },
  {
    id: "c15",
    name: "Vacuumed a room",
    icon: "i22",
    color: "blush",
    points: 3,
    recurrence: "weekly",
  },
];

export const INITIAL_SKILLS: Skill[] = [
  { id: "s1", name: "Being Brave", icon: "i53", color: "butter", points: 2, isPositive: true },
  { id: "s2", name: "Being Kind", icon: "i45", color: "blush", points: 2, isPositive: true },
  { id: "s3", name: "Being Honest", icon: "i60", color: "sky", points: 2, isPositive: true },
  { id: "s4", name: "Good Night", icon: "i51", color: "lilac", points: 2, isPositive: true },
  { id: "s5", name: "Helping Others", icon: "i47", color: "blush", points: 2, isPositive: true },
  { id: "s6", name: "Independent", icon: "i61", color: "sage", points: 2, isPositive: true },
  { id: "s7", name: "Keep Trying", icon: "i49", color: "sand", points: 2, isPositive: true },
  { id: "s8", name: "Being On Time", icon: "i38", color: "butter", points: 1, isPositive: true },
  { id: "s9", name: "Good Listening", icon: "i46", color: "lilac", points: 1, isPositive: true },
  { id: "s10", name: "Sharing", icon: "i44", color: "foam", points: 1, isPositive: true },
  // Needs work — negative values
  { id: "n1", name: "Hitting", icon: "i58", color: "blush", points: -2, isPositive: false },
  { id: "n2", name: "Yelling", icon: "i57", color: "sand", points: -1, isPositive: false },
  { id: "n3", name: "Refused a chore", icon: "i65", color: "sky", points: -2, isPositive: false },
  {
    id: "n4",
    name: "Not telling truth",
    icon: "i59",
    color: "lilac",
    points: -2,
    isPositive: false,
  },
  { id: "n5", name: "Name-calling", icon: "i56", color: "foam", points: -1, isPositive: false },
];

export const COMPANIONS: Companion[] = [
  {
    id: "sunny",
    name: "Sunny",
    trait: "Kindness",
    color: "butter",
    symbol: "☀️",
    bodyShape: "dumpling",
    unlockAt: 10,
  },
  {
    id: "bramble",
    name: "Bramble",
    trait: "Bravery",
    color: "sage",
    symbol: "⭐",
    bodyShape: "pear",
    unlockAt: 30,
  },
  {
    id: "pip",
    name: "Pip",
    trait: "Honesty",
    color: "sky",
    symbol: "📖",
    bodyShape: "egg",
    unlockAt: 55,
  },
  {
    id: "marlow",
    name: "Marlow",
    trait: "Helping",
    color: "blush",
    symbol: "🤝",
    bodyShape: "dumpling",
    unlockAt: 85,
  },
  {
    id: "coda",
    name: "Coda",
    trait: "Independence",
    color: "lilac",
    symbol: "👣",
    bodyShape: "pear",
    unlockAt: 120,
  },
  {
    id: "fern",
    name: "Fern",
    trait: "Gratitude",
    color: "foam",
    symbol: "🌿",
    bodyShape: "dumpling",
    unlockAt: 160,
  },
  {
    id: "ziggy",
    name: "Ziggy",
    trait: "Creativity",
    color: "sand",
    symbol: "🎨",
    bodyShape: "egg",
    unlockAt: 210,
  },
  {
    id: "ridge",
    name: "Ridge",
    trait: "Perseverance",
    color: "sky",
    symbol: "⛰️",
    bodyShape: "dumpling",
    unlockAt: 275,
  },
];

export const INITIAL_HOUSEHOLD = {
  name: "The Harper Family",
  sharedPool: 74,
  rewardTarget: 100,
  subscriptionStatus: "trialing" as const,
  // 14-day free trial by default (§5 default scaffolding).
  trialEndsAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
  onboarded: true,
};

const DAY = 1000 * 60 * 60 * 24;

// Seed a few days of history so streak flames + the weekly recap have something
// honest to read on first run. Nova has a 4-day daily-chore streak; Milo 2 days.
export const INITIAL_HISTORY: PointEvent[] = [
  {
    id: "e1",
    kidId: "k1",
    itemName: "Read 20 minutes",
    itemIcon: "i12",
    points: 3,
    at: Date.now() - 1000 * 60 * 12,
  },
  {
    id: "e2",
    kidId: "k2",
    itemName: "Brushed teeth (PM)",
    itemIcon: "i02",
    points: 1,
    at: Date.now() - 1000 * 60 * 45,
  },
  {
    id: "e3",
    kidId: "k3",
    itemName: "Being Kind",
    itemIcon: "i45",
    points: 2,
    at: Date.now() - 1000 * 60 * 90,
  },
  {
    id: "e4",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: "i00",
    points: 2,
    at: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: "e5",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: "i00",
    points: 2,
    at: Date.now() - DAY * 1 - 1000 * 60 * 60,
  },
  {
    id: "e6",
    kidId: "k1",
    itemName: "Brushed teeth (AM)",
    itemIcon: "i01",
    points: 1,
    at: Date.now() - DAY * 1 - 1000 * 60 * 30,
  },
  {
    id: "e7",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: "i00",
    points: 2,
    at: Date.now() - DAY * 2 - 1000 * 60 * 60,
  },
  {
    id: "e8",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: "i00",
    points: 2,
    at: Date.now() - DAY * 3 - 1000 * 60 * 60,
  },
  {
    id: "e9",
    kidId: "k2",
    itemName: "Made the bed",
    itemIcon: "i00",
    points: 2,
    at: Date.now() - DAY * 1 - 1000 * 60 * 90,
  },
  {
    id: "e10",
    kidId: "k2",
    itemName: "Fed the pet",
    itemIcon: "i17",
    points: 2,
    at: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: "e11",
    kidId: "k3",
    itemName: "Read 20 minutes",
    itemIcon: "i12",
    points: 3,
    at: Date.now() - DAY * 1 - 1000 * 60 * 120,
  },
];

export const INITIAL_PROPOSALS: RewardProposal[] = [
  { id: "p1", proposedByKidId: "k1", name: "Pizza & movie night", votes: ["k1", "k3"] },
  { id: "p2", proposedByKidId: "k2", name: "Trip to the trampoline park", votes: ["k2"] },
];
