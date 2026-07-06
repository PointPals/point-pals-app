# Individual Jars + Shared Jar — Analysis for PointPals

> Exploring: each child has their own personal jar (working toward their own reward) alongside the existing shared family jar.
>
> Your scenario: "In my house, each child works towards their own reward as well."

---

## 1. Pros — Why individual jars would add value

### Motivates differently-abled kids fairly
A 4-year-old and a 10-year-old sharing the same jar means either the older kid does most of the earning (resentment) or the younger kid never feels like they contribute (discouragement). Individual jars let a toddler earn marbles for "put your shoes away" while the older kid earns for "unpack the dishwasher" — same effort, different tasks, both see their own jar fill.

### Allows different reward preferences
One kid wants "extra bedtime story," another wants "bake cookies with Mum." Individual jars mean each child chooses their own target reward. The shared jar stays for the family outing everyone agrees on.

### Teaches personal goal-setting
The "competence" pillar of Self-Determination Theory works best when goals are calibrated to the individual. A child sees their own jar fill and feels "I did that" — not "my sibling helped more than me."

### Reduces sibling comparison
With only a shared jar, faster-earning kids see their proportion of contribution. With personal jars, each child has their own progress bar and only their own effort matters. The shared jar still remains for the team moment.

### Works for single-child families
Already maps naturally — the one child IS the shared jar. This is just making the mechanic explicit.

---

## 2. Cons — What you'd be trading away

### Weakens the teamwork narrative
The most repeated message across your blog, FAQ, research page, and welcome page is *"We are filling the jar together."* Individual jars shift the framing to *"You fill yours, I fill mine, and we also fill one together."* That's a harder sell in one sentence.

### Adds complexity to an app trying to be simple
The current flow: kid does task → parent taps → marble drops → jar fills → reward. Adding individual jars means: which jar? Both? The kid's? The shared? That's extra taps, extra decision points, more cognitive load for parents in the moment.

### Risk of highlighting disparity
If one child consistently fills their jar faster, it's visible. "Why does your jar always fill before mine?" becomes a new negotiation. Comparison moves from *who earns more points* to *who fills their jar faster* — same problem, different container.

### Setting individual targets scales linearly
Instead of setting one reward target per family, you now set N + 1 targets (one per kid + shared). For a family of 4 kids, that's 5 targets to configure and maintain. Multiple kids = multiple different reward preferences to track.

### The research framing is built around "shared"
Your about page says: *"Relatedness: points fill a shared jar, so progress belongs to the family."* Individual jars are not called out in any of the 10 books you cite, and the shared jar is a deliberate part of your design philosophy. Adding individual needs new justification.

---

## 3. What the research actually says about shared vs individual

| Research principle | Shared jar aligns | Individual jar aligns |
|---|---|---|
| **Relatedness** (SDT) | ✓ "We did this together" via shared pool | ✗ Individual jars don't contribute to family connection directly — but they don't prevent it either |
| **Competence** (SDT) | ~ "We succeeded" can feel abstract for young kids | ✓ "I filled MY jar" is highly concrete, especially for 3-7 year olds |
| **Autonomy** (SDT) | ~ Shared goal picked together | ✓ Personal reward chosen by the child themselves |
| **Teamwork / cooperation** (Doucleff, Lythcott-Haims) | ✓ Strongly aligns — "you are a member of this family" | ~ Neutral — individual jars don't harm cooperation, but they don't actively build it either |
| **Immediate feedback** (Jensen, Fogg) | ~ The jar fills incrementally but shared pool pace depends on everyone | ✓ Personal jar fills faster = more frequent reward cycles = tighter feedback loop |
| **Fading rewards** (Kazdin, token economy) | ✓ Works fine — thin the shared jar over time | ✓ Also works — thin each kid's individual jar independently |
| **Screen-free counter-culture** (Doucleff dopamine kids) | ✓ Shared reward = family connection, not individual consumption | ~ Individual reward could be screen-free OR screen-based — depends on parent's reward choice |

**Verdict:** The research doesn't oppose individual jars — it just doesn't explicitly advocate for them. The strongest argument *for* individual jars comes from **competence** (visible personal progress) and **autonomy** (choosing your own reward). The strongest argument *against* comes from **relatedness** (the shared jar is where family connection lives).

These don't have to be in conflict. You can have both.

---

## 4. How it maps to your existing content

### Content that needs updating if you add individual jars

| Page | Current framing | What would need to change |
|------|-----------------|--------------------------|
| **Welcome page** | *"points your whole family pools into one shared jar"* | Add: "...while each child has their own jar too" |
| **FAQ: "How does the marble jar work?"** | *"The jar is shared — every child's contribution fills it together"* | Explain both jars, how they relate |
| **FAQ: "Can I use it with more than one child?"** | *"Earn points individually... see their contribution fill the shared jar"* | Add: "Each child also fills their own personal jar toward their own reward" |
| **Blog: Marble Jar Post** | *"A shared jar encourages teamwork... Instead of 'I am earning more than you'"* | Add a paragraph: "Some families also use personal jars alongside the shared jar — especially when kids have different reward preferences" |
| **Blog: Research Post** | *"Relatedness: points fill a shared jar, so progress belongs to the family"* | Could add: "Competence: personal jars let each child see their own progress" |
| **Blog: Chores Fun Post** | *"Family rewards feel different"* | Add: "But personal rewards have their place too — especially when kids have different goals" |
| **About page (SDT section)** | Only mentions shared jar under relatedness | Could add a personal-jar mention under competence or autonomy |

### Content that works fine as-is

| Page | Reason |
|------|--------|
| **FAQ: "What can children earn points for?"** | Points allocation doesn't change |
| **FAQ: "What kind of rewards work best?"** | Screen-free reward philosophy is the same |
| **FAQ: "Isn't this just bribery?"** | The distinction doesn't change |
| **About page: counter-argument section** | Extrinsic reward debate is the same either way |
| **About page: marble-loss section** | Consequences work the same on either jar |
| **Character blog post** | Unaffected — companions map to trait types, not jar mechanics |

---

## 5. Mechanics needed for individual jars + shared jar

### Data Model

#### Current:
```
kids: { currentPoints, allTimePoints }     ← per kid
household: { sharedPool }                  ← shared
```

#### Proposed:
```
kids: {
  currentPoints,       ← TOTAL points earned this cycle (across all jars)
  allTimePoints,       ← permanent record (unchanged)
  personalPool,        ← points in the kid's personal jar
  personalTarget,      ← points needed to fill personal jar
  personalReward,      ← reward for personal jar
}
household: {
  sharedPool,          ← points in the shared jar (unchanged)
  sharedTarget,        ← unchanged
  sharedReward,        ← unchanged
}
```

### Split mechanics

**When a parent awards points:**
- Points go to BOTH jars by default?
- Or parent chooses which jar?
- Or configurable per chore?

Three possible models:

| Model | How points flow | Complexity |
|-------|----------------|-----------|
| **A) Split automatically** | Each award adds X points to kid's personal jar AND X points to shared jar. One tap, both fill. | Low — no extra parent decision |
| **B) Parent picks per award** | Tap award → modal: "Which jar?" → Personal / Shared / Both. | Medium — extra tap every time |
| **C) Per-chore jar assignment** | Each chore is assigned to Personal, Shared, or Both at setup time. When awarded, points flow accordingly. | Higher setup cost, but zero friction during awarding |

**Recommendation:** **Model A** (split) as default with **Model C** (per-chore override) as an advanced option. Most parents don't want another decision at award time.

**Default split ratio:** 50/50 seems intuitive. Configurable in settings (slider: personal vs shared percentage).

### Reward cycle logic

| Event | Shared jar | Personal jar |
|-------|-----------|-------------|
| Award points | `sharedPool += points * splitRatio` | `personalPool += points * (1 - splitRatio)` |
| Undo points | Reverse the same split | Reverse the same split |
| Personal jar fills | Unaffected | Kid redeems personal reward → `personalPool = 0`, `currentPoints` retains value |
| Shared jar fills | Everyone celebrates → `sharedPool = 0`, all `currentPoints` = 0 | Unaffected |
| Correction tool | Works on sharedPool if selected | Works on personalPool if selected |

### UI changes

**Jar display:**
- Family tab: shared jar (existing) + small per-kid personal jar indicators
- Kid tab: the kid's personal jar gets equal billing — maybe shown as a smaller jar beside their avatar, or the kid's page shows their personal jar at the top

**Award confirmation:**
- "Points awarded! +2 to shared jar, +1 to [kid]'s jar"
- Brief toast, no modal

**Settings:**
- Split ratio slider (50/50 default)
- Individual targets per kid (default: half of shared target)
- Optional individual rewards per kid

**Reward redemption:**
- Kid's personal jar fills → notification: "[Kid]'s jar is full! Choose their reward."
- Parent picks from the child's reward menu
- Shared jar fills → existing celebration unaffected

### Migration path (existing households)

Data is clean: `currentPoints` was always the shared-jar contribution. For existing families:

```sql
-- For each kid, set personalPool = currentPoints * initialSplitRatio
-- Set personalTarget = sharedTarget * 0.5 (or some sensible default)
-- Leave sharedPool and currentPoints as-is
```

The key: **no data loss**. Existing families wake up with both jars populated proportionally. They can adjust ratios afterward.

### Edge cases

| Situation | What happens |
|-----------|-------------|
| Kid has no personal target set | Personal jar is hidden — they only participate in shared jar (backward compatible) |
| Parent splits 100% to shared | Personal jar effectively disabled per kid — same as today |
| One kid fills personal jar, shared jar still going | Kid's personal jar resets independently; they keep earning toward shared |
| Parent sets 0% to shared | Shared jar never fills — defeats the purpose; warn in UI |
| Young kid who can't conceptualise two jars | Parent sets 100% shared, or hides personal jar — works exactly like today |

---

## 6. Summary

| | Shared jar | Individual jars | Both |
|---|---|---|---|
| **Teamwork** | ✓ Strong | ✗ Absent | ✓ Best of both |
| **Personal motivation** | ~ Mediocre for some kids | ✓ Strong | ✓ Strong |
| **Parent effort** | ✓ Low | ~ Medium (N targets) | ~ Medium-High (N+1 targets) |
| **Sibling comparison** | ~ Possible | ~ Possible | ~ Still possible but diffused |
| **Feels fair** | ~ Can feel unfair to younger kids | ✓ Each kid's own pace | ✓ Best for mixed-age families |
| **Research alignment** | ✓ Cited in all content | ~ Neutral — not contradicted | ✓ Covers relatedness + competence |

**The real question:** Does your target parent *want* this?

Your brand positioning says: *"We are filling the jar together."* That's a strong, simple, emotional message. Adding personal jars doesn't break it — but it does complicate the pitch. The welcome page's one-line explanation goes from one sentence to two.

For **you personally** (your house, your kids), it makes perfect sense — different kids, different rewards, same family. The question is whether it's a feature toggle for advanced families or part of the core flow for everyone.

---

## 7. Recommendation

**Add a "split jar" toggle in household settings** that defaults to OFF. When toggled ON:

1. Each kid gets a `personalTarget` and `personalReward` (auto-set proportional to shared target)
2. Award points split using a configurable ratio (default 50/50)
3. Kids see both jars on their dashboard — a small personal jar beside the big shared jar
4. Personal rewards are redeemed independently; shared stays as-is

This keeps the simple "one jar" story for new families who don't need the complexity, and gives you the two-jar system you need. The code already has `currentPoints` per kid — most of the plumbing is already there, just disconnected from a visual personal jar.

**Estimated build effort:**
- Data: add `personalPool`, `personalTarget`, `personalReward` to the `Kid` type (3 fields)
- Settings: split-ratio slider + per-kid personal target config
- Award logic: split `awardPoints` to route to both pools
- Ui: personal jar indicator on kid badges and jar page
- Migration: trivial — seed personal targets = sharedTarget / kidCount, personalPool = 0

~1–2 solid coding sessions.
