import { COMPANIONS, type Kid, type PastelKey } from "@/lib/mock-data";

export const KID_PALETTE: PastelKey[] = [
  "sky",
  "butter",
  "sage",
  "blush",
  "lilac",
  "sand",
  "foam",
  "orange",
];

/** A colour and character no one in the family has yet, so siblings are easy to tell apart. */
export function suggestKidLook(kids: Pick<Kid, "color" | "companionId">[]) {
  const usedColors = new Set(kids.map((k) => k.color));
  const usedPals = new Set(kids.map((k) => k.companionId));
  return {
    color:
      KID_PALETTE.find((c) => !usedColors.has(c)) ?? KID_PALETTE[kids.length % KID_PALETTE.length],
    companionId:
      COMPANIONS.find((c) => !usedPals.has(c.id))?.id ??
      COMPANIONS[kids.length % COMPANIONS.length].id,
  };
}
