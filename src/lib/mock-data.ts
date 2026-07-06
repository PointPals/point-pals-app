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
  currentPoints: number; // resets to 0 when a reward is claimed
  allTimePoints: number; // never resets, cumulative forever
  companionId?: string; // chosen mascot (matches COMPANIONS.id)
  // Individual jar (optional — see split_jars_enabled on household)
  personalPool: number; // points in the kid's personal jar
  personalTarget: number; // points needed to fill personal jar (0 = disabled)
  personalReward?: string; // reward name when personal jar fills
};

export type Chore = {
  id: string;
  name: string;
  icon: string; // full image URL, "iXX" registry key, or emoji
  color: PastelKey;
  points: number;
  recurrence: "none" | "daily" | "weekly";
  tags: string[];
  // null/undefined/[] = universal (applies to every kid, incl. kids added
  // later). A non-empty array = a static allow-list of kid ids.
  assignedKidIds?: string[] | null;
};

export type Skill = {
  id: string;
  name: string;
  icon: string;
  color: PastelKey;
  points: number; // negative for "needs work"
  isPositive: boolean;
  assignedKidIds?: string[] | null;
};

/** Does this chore/skill apply to the given kid? Empty/absent list = everyone. */
export function appliesToKid(item: { assignedKidIds?: string[] | null }, kidId: string): boolean {
  return !item.assignedKidIds?.length || item.assignedKidIds.includes(kidId);
}

export type Companion = {
  id: string;
  name: string;
  trait: string;
  color: PastelKey;
  symbol: string; // emoji stand-in for the plush motif (fallback when art is absent)
  motif: string; // human description of the mascot's symbol, for the about page
  quote: string; // shown as a subtitle in the picker + character detail
  bodyShape: "dumpling" | "egg" | "pear";
};

export type PointEvent = {
  id: string;
  kidId: string;
  itemName: string;
  itemIcon: string;
  points: number;
  at: number;
  batchId?: string | null;
  // "correction" = a parent's manual fix (double-tap, wrong kid). Rendered
  // neutral/grey and excluded from behaviour stats — never a red/green event.
  type?: "award" | "correction";
};

export type RewardHistory = {
  id: string;
  rewardName: string;
  targetPoints: number;
  achievedAt: number;
  contributingKidIds: string[];
};

export type MemoryLike = {
  postId: string;
  userId: string;
  createdAt: number;
};

export type MemoryComment = {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: number;
};

// -------- Seed data --------

export const SUPABASE_ASSET_BASE =
  "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets";
const A = (file: string) => `${SUPABASE_ASSET_BASE}/${file}`;

export const INITIAL_KIDS: Kid[] = [
  {
    id: "k1",
    name: "Nova",
    color: "blush",
    currentPoints: 34,
    allTimePoints: 145,
    companionId: "sunny",
    personalPool: 0,
    personalTarget: 0,
  },
  {
    id: "k2",
    name: "Milo",
    color: "sky",
    currentPoints: 22,
    allTimePoints: 98,
    companionId: "pip",
    personalPool: 0,
    personalTarget: 0,
  },
  {
    id: "k3",
    name: "Wren",
    color: "sage",
    currentPoints: 18,
    allTimePoints: 72,
    companionId: "fern",
    personalPool: 0,
    personalTarget: 0,
  },
];

export const INITIAL_CHORES: Chore[] = [
  {
    id: "c1",
    name: "Made the bed",
    icon: A("make-bed.png"),
    color: "sage",
    points: 1,
    recurrence: "daily",
    tags: ["Must Do"],
  },
  {
    id: "c2",
    name: "Brushed teeth (AM)",
    icon: A("brushteeth-morning-bed.png"),
    color: "butter",
    points: 1,
    recurrence: "daily",
    tags: ["Must Do"],
  },
  {
    id: "c3",
    name: "Brushed teeth (PM)",
    icon: A("brushteeth-night-bed.png"),
    color: "lilac",
    points: 1,
    recurrence: "daily",
    tags: ["Must Do"],
  },
  {
    id: "c4",
    name: "Got dressed",
    icon: A("get-dressed.png"),
    color: "sand",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c5",
    name: "Ate breakfast",
    icon: A("ate-breakfast.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c6",
    name: "Packed bag",
    icon: A("packed-bag.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c7",
    name: "Did homework",
    icon: A("did-homework.png"),
    color: "lilac",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c8",
    name: "Fed pets",
    icon: A("fed-pets.png"),
    color: "sage",
    points: 1,
    recurrence: "daily",
    tags: ["Must Do"],
  },
  {
    id: "c9",
    name: "Tidied room",
    icon: A("tidied-room.png"),
    color: "sand",
    points: 1,
    recurrence: "daily",
    tags: ["Must Do"],
  },
  {
    id: "c10",
    name: "Set the table",
    icon: A("set-the-table.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c11",
    name: "Washed hands",
    icon: A("washed-hands.png"),
    color: "blush",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c12",
    name: "Woke up on time",
    icon: A("woke-up-on-time.png"),
    color: "butter",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c13",
    name: "Went to bed by yourself",
    icon: A("went-to-bed-by-yourself.png"),
    color: "lilac",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c14",
    name: "Music practice",
    icon: A("music-practise.png"),
    color: "blush",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c15",
    name: "Bath or shower",
    icon: A("bath-or-shower.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: [],
  },
  {
    id: "c16",
    name: "Watered plants",
    icon: A("watered-plants.png"),
    color: "butter",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c17",
    name: "Emptied dishwasher",
    icon: A("emptied-or-loaded-dishwasher.png"),
    color: "sand",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c18",
    name: "Took out rubbish",
    icon: A("take-out-rubbish.png"),
    color: "sky",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c19",
    name: "Vacuumed a room",
    icon: A("vacuumn.png"),
    color: "blush",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c20",
    name: "Swept the room",
    icon: A("swept-the-room.png"),
    color: "foam",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c21",
    name: "Mopped the floor",
    icon: A("mopped-the-floor.png"),
    color: "foam",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c22",
    name: "Sorted recycling",
    icon: A("sorted-recycling.png"),
    color: "sage",
    points: 1,
    recurrence: "weekly",
    tags: [],
  },
  {
    id: "c23",
    name: "Drank 2L water",
    icon: A("adult-drank-21L-water.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c24",
    name: "30min exercise",
    icon: A("adult-exercised-30min.png"),
    color: "sage",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c25",
    name: "Meditated / 5min silence",
    icon: A("adult-meditated.png"),
    color: "lilac",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c26",
    name: "No phone first 30min",
    icon: A("adult-no-phone.png"),
    color: "butter",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c27",
    name: "Ate a vegetable",
    icon: A("adult-ate%20healthy.png"),
    color: "sage",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c28",
    name: "Took a lunch break",
    icon: A("adult-took-a-lunchbreak.png"),
    color: "blush",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c29",
    name: "Bed before target time",
    icon: A("adult-bed-before-targettime.png"),
    color: "lilac",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c30",
    name: "No doom-scroll before sleep",
    icon: A("adult-no%20doom%20scrolling.png"),
    color: "sky",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c31",
    name: "Journaled",
    icon: A("adult-journalling.png"),
    color: "sand",
    points: 1,
    recurrence: "daily",
    tags: ["Adult"],
  },
  {
    id: "c32",
    name: "Paid a bill",
    icon: A("adult-paid-a-bill.png"),
    color: "butter",
    points: 1,
    recurrence: "weekly",
    tags: ["Adult"],
  },
  {
    id: "c33",
    name: "Folded laundry same day",
    icon: A("adult-folded-and-put-away-on-same-day.png"),
    color: "foam",
    points: 1,
    recurrence: "weekly",
    tags: ["Adult"],
  },
];

export const INITIAL_SKILLS: Skill[] = [
  {
    id: "s1",
    name: "Being helpful",
    icon: A("being-helpful.png"),
    color: "butter",
    points: 1,
    isPositive: true,
  },
  {
    id: "s2",
    name: "Being independent",
    icon: A("being-independent.png"),
    color: "sage",
    points: 1,
    isPositive: true,
  },
  {
    id: "s3",
    name: "Being respectful",
    icon: A("being-respectful.png"),
    color: "sky",
    points: 1,
    isPositive: true,
  },
  {
    id: "s4",
    name: "Calmed down",
    icon: A("calmed-down-after-getting-mad.png"),
    color: "lilac",
    points: 1,
    isPositive: true,
  },
  {
    id: "s5",
    name: "Followed directions",
    icon: A("followed-directions.png"),
    color: "sand",
    points: 1,
    isPositive: true,
  },
  {
    id: "s6",
    name: "Helped without being asked",
    icon: A("helped-without-being-asked.png"),
    color: "blush",
    points: 1,
    isPositive: true,
  },
  {
    id: "s8",
    name: "Including others",
    icon: A("including-others.png"),
    color: "foam",
    points: 1,
    isPositive: true,
  },
  {
    id: "s9",
    name: "Sharing toys",
    icon: A("sharing-toys.png"),
    color: "foam",
    points: 1,
    isPositive: true,
  },
  {
    id: "s10",
    name: "Showing empathy",
    icon: A("showing-empathy.png"),
    color: "blush",
    points: 1,
    isPositive: true,
  },
  {
    id: "s11",
    name: "Tried your best",
    icon: A("tried-your-best.png"),
    color: "sand",
    points: 1,
    isPositive: true,
  },
  {
    id: "s12",
    name: "Used kind words",
    icon: A("used-kindwords.png"),
    color: "butter",
    points: 1,
    isPositive: true,
  },
  {
    id: "s13",
    name: "Using manners",
    icon: A("using-manners.png"),
    color: "sky",
    points: 1,
    isPositive: true,
  },
  {
    id: "s14",
    name: "Waiting patiently",
    icon: A("waiting-paitently.png"),
    color: "lilac",
    points: 1,
    isPositive: true,
  },
  // Needs work — negative values
  { id: "n1", name: "Argued", icon: A("argued.png"), color: "sand", points: -1, isPositive: false },
  {
    id: "n2",
    name: "Didn't follow instructions",
    icon: A("did-not-follow-instructions.png"),
    color: "sky",
    points: -1,
    isPositive: false,
  },
  {
    id: "n3",
    name: "Didn't listen",
    icon: A("didn't-listen.png"),
    color: "lilac",
    points: -1,
    isPositive: false,
  },
  {
    id: "n4",
    name: "Hit or pushed",
    icon: A("hit-or-pushed.png"),
    color: "blush",
    points: -1,
    isPositive: false,
  },
  {
    id: "n5",
    name: "Made a mess",
    icon: A("made-a-mess.png"),
    color: "sand",
    points: -1,
    isPositive: false,
  },
  {
    id: "n6",
    name: "Ran away",
    icon: A("ran-away.png"),
    color: "foam",
    points: -1,
    isPositive: false,
  },
  {
    id: "n7",
    name: "Refused to share",
    icon: A("refused-to-share.png"),
    color: "sky",
    points: -1,
    isPositive: false,
  },
  {
    id: "n8",
    name: "Tantrum",
    icon: A("tantrum.png"),
    color: "blush",
    points: -1,
    isPositive: false,
  },
  {
    id: "n9",
    name: "Threw things",
    icon: A("threw-things.png"),
    color: "sand",
    points: -1,
    isPositive: false,
  },
  {
    id: "n10",
    name: "Yelled or screamed",
    icon: A("yelled-or-screamed.png"),
    color: "butter",
    points: -1,
    isPositive: false,
  },
];

export const COMPANIONS: Companion[] = [
  {
    id: "sunny",
    name: "Sunny",
    trait: "Kindness",
    color: "butter",
    symbol: "☀️",
    motif: "Glowing heart with rays",
    quote: "The smallest kindness leaves the biggest glow.",
    bodyShape: "dumpling",
  },
  {
    id: "pip",
    name: "Pip",
    trait: "Learning",
    color: "sky",
    symbol: "📖",
    motif: "Open book",
    quote: "You don't have to know it yet. You just have to open the book.",
    bodyShape: "egg",
  },
  {
    id: "bramble",
    name: "Bramble",
    trait: "Goals",
    color: "sage",
    symbol: "⭐",
    motif: "Gold star",
    quote: "Every done thing is a star you made yourself.",
    bodyShape: "pear",
  },
  {
    id: "ziggy",
    name: "Ziggy",
    trait: "Creativity",
    color: "sand",
    symbol: "🎨",
    motif: "Purple swirl",
    quote: "The swirl never stops until something wonderful comes out.",
    bodyShape: "egg",
  },
  {
    id: "ridge",
    name: "Ridge",
    trait: "Perseverance",
    color: "sky",
    symbol: "⛰️",
    motif: "Mountain range",
    quote: "You don't climb the mountain all at once. You just take the next step.",
    bodyShape: "dumpling",
  },
  {
    id: "coda",
    name: "Coda",
    trait: "Independence",
    color: "lilac",
    symbol: "👣",
    motif: "Golden footprint",
    quote: "One brave step is all it takes to begin.",
    bodyShape: "pear",
  },
  {
    id: "fern",
    name: "Fern",
    trait: "Daily habits",
    color: "foam",
    symbol: "🌿",
    motif: "Leaf",
    quote: "Every leaf was once just a bud. Every habit was once just a start.",
    bodyShape: "dumpling",
  },
  {
    id: "marlow",
    name: "Marlow",
    trait: "Teamwork",
    color: "blush",
    symbol: "🤝",
    motif: "Clasped hands",
    quote: "The jar fills faster when everyone adds to it.",
    bodyShape: "dumpling",
  },
];

export const INITIAL_HOUSEHOLD = {
  id: "local",
  name: "The Harper Family",
  sharedPool: 74,
  rewardTarget: 100,
  subscriptionStatus: "trialing" as const,
  // 14-day free trial by default (§5 default scaffolding).
  trialEndsAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
  onboarded: true,
  splitJarsEnabled: false,
  splitRatio: 50,
};

const DAY = 1000 * 60 * 60 * 24;

// Seed a few days of history so streak flames + the weekly recap have something
// honest to read on first run. Nova has a 4-day daily-chore streak; Milo 2 days.
export const INITIAL_HISTORY: PointEvent[] = [
  {
    id: "e1",
    kidId: "k1",
    itemName: "Did homework",
    itemIcon: A("did-homework.png"),
    points: 1,
    at: Date.now() - 1000 * 60 * 12,
  },
  {
    id: "e2",
    kidId: "k2",
    itemName: "Brushed teeth (PM)",
    itemIcon: A("brushteeth-night-bed.png"),
    points: 1,
    at: Date.now() - 1000 * 60 * 45,
  },
  {
    id: "e3",
    kidId: "k3",
    itemName: "Helping others",
    itemIcon: A("helping-others.png"),
    points: 1,
    at: Date.now() - 1000 * 60 * 90,
  },
  {
    id: "e4",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: A("make-bed.png"),
    points: 1,
    at: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: "e5",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: A("make-bed.png"),
    points: 1,
    at: Date.now() - DAY * 1 - 1000 * 60 * 60,
  },
  {
    id: "e6",
    kidId: "k1",
    itemName: "Brushed teeth (AM)",
    itemIcon: A("brushteeth-morning-bed.png"),
    points: 1,
    at: Date.now() - DAY * 1 - 1000 * 60 * 30,
  },
  {
    id: "e7",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: A("make-bed.png"),
    points: 1,
    at: Date.now() - DAY * 2 - 1000 * 60 * 60,
  },
  {
    id: "e8",
    kidId: "k1",
    itemName: "Made the bed",
    itemIcon: A("make-bed.png"),
    points: 1,
    at: Date.now() - DAY * 3 - 1000 * 60 * 60,
  },
  {
    id: "e9",
    kidId: "k2",
    itemName: "Made the bed",
    itemIcon: A("make-bed.png"),
    points: 1,
    at: Date.now() - DAY * 1 - 1000 * 60 * 90,
  },
  {
    id: "e10",
    kidId: "k2",
    itemName: "Fed pets",
    itemIcon: A("fed-pets.png"),
    points: 1,
    at: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    id: "e11",
    kidId: "k3",
    itemName: "Did homework",
    itemIcon: A("did-homework.png"),
    points: 1,
    at: Date.now() - DAY * 1 - 1000 * 60 * 120,
  },
];
