import type { PastelKey } from "@/lib/mock-data";
import { Pal } from "@/components/pals/Pal";

// Each kid is shown as their chosen Pal (§2). `companionId` may be a new Pal
// id ("orbit") or a legacy companion id saved before the cast redesign
// ("pip") — <Pal> resolves both, and falls back to a stable per-kid Pal from
// `seed` when nothing was picked. `color` is kept for call-site compatibility;
// the circle behind the avatar (owned by the caller) still uses the kid colour.
export function CompanionAvatar({
  seed,
  size = 60,
  companionId,
  mood,
  animate = false,
}: {
  seed: string;
  color?: PastelKey;
  size?: number;
  companionId?: string;
  mood?: "idle" | "happy" | "wow" | "sleepy";
  animate?: boolean;
}) {
  return (
    <Pal
      id={companionId}
      seed={seed}
      size="100%"
      mood={mood}
      animate={animate}
      shadow={false}
      // The Pal art fills a 200-unit box with appendages near the edges; a
      // small inset keeps ears/antennae inside the round avatar mask.
      className="h-full w-full p-[6%] pointer-events-none"
      style={{ maxWidth: size, maxHeight: size }}
    />
  );
}
