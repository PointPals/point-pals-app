import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/app-store";
import { useSettings, setSetting } from "@/lib/settings";
import { Paywall } from "@/components/Paywall";
import { trackParent } from "@/lib/analytics";
import { PASTEL_HEX } from "@/lib/mock-data";
import {
  Volume2,
  Vibrate,
  Trophy,
  Download,
  Trash2,
  LifeBuoy,
  Eye,
  Target,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — PointPals" },
      {
        name: "description",
        content: "Manage your subscription, sound, family settings, and your data.",
      },
    ],
  }),
});

const SUPPORT_EMAIL = "support@pointpals.app";

function SettingsPage() {
  const { household, kids, setHouseholdName, setRewardTarget, exportData, resetHousehold } =
    useApp();
  const settings = useSettings();
  const [name, setName] = useState(household.name);

  const exportJson = () => {
    trackParent("data_export");
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pointpals-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAll = () => {
    if (!window.confirm("Delete all family data on this device? This can't be undone.")) return;
    trackParent("data_delete");
    resetHousehold();
    try {
      window.localStorage.removeItem("pointpals.state.v1");
    } catch {
      /* ignore */
    }
  };

  // Leaderboard is parent-controlled and OFF by default (§4). Framed as a recap,
  // never a live competitive ranking.
  const ranked = [...kids].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Parent controls, subscription, and your data.
        </p>
      </div>

      {/* Subscription / paywall — parent screen only */}
      <section className="space-y-3">
        <SectionTitle icon={<Sparkles className="h-4 w-4" />}>Subscription</SectionTitle>
        <Paywall />
      </section>

      {/* Household */}
      <section className="space-y-3">
        <SectionTitle icon={<Target className="h-4 w-4" />}>Family</SectionTitle>
        <div className="card-soft p-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Family name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && setHouseholdName(name.trim())}
              className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Reward goal (jar target)</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={400}
                step={10}
                value={household.rewardTarget}
                onChange={(e) => setRewardTarget(Number(e.target.value))}
                className="flex-1 accent-foreground"
              />
              <span className="font-display text-lg font-bold w-12 text-right">
                {household.rewardTarget}
              </span>
            </div>
          </label>
        </div>
      </section>

      {/* Sound & haptics */}
      <section className="space-y-3">
        <SectionTitle icon={<Volume2 className="h-4 w-4" />}>Sound &amp; feel</SectionTitle>
        <div className="card-soft divide-y divide-border">
          <ToggleRow
            icon={<Volume2 className="h-4 w-4" />}
            label="Sound effects"
            desc="Chimes and the marble clink. Respects your device's silent switch."
            checked={settings.sound}
            onChange={(v) => setSetting("sound", v)}
          />
          <ToggleRow
            icon={<Vibrate className="h-4 w-4" />}
            label="Haptics"
            desc="A light pulse on each award, where supported."
            checked={settings.haptics}
            onChange={(v) => setSetting("haptics", v)}
          />
          <ToggleRow
            icon={<Eye className="h-4 w-4" />}
            label="Reduced motion"
            desc="Calm the jar physics and confetti."
            checked={settings.reducedMotion}
            onChange={(v) => setSetting("reducedMotion", v)}
          />
        </div>
      </section>

      {/* Sibling leaderboard — off by default */}
      <section className="space-y-3">
        <SectionTitle icon={<Trophy className="h-4 w-4" />}>Sibling leaderboard</SectionTitle>
        <div className="card-soft p-1">
          <ToggleRow
            icon={<Trophy className="h-4 w-4" />}
            label="Show a friendly leaderboard"
            desc="Off by default. A gentle recap of who's earned what — not a live competition."
            checked={settings.leaderboard}
            onChange={(v) => {
              setSetting("leaderboard", v);
              trackParent("leaderboard_toggle", { on: v });
            }}
          />
        </div>
        {settings.leaderboard && (
          <div className="card-soft p-5">
            <ol className="space-y-2">
              {ranked.map((k, i) => (
                <li key={k.id} className="flex items-center gap-3">
                  <span className="w-5 text-center font-display font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: PASTEL_HEX[k.color] }}
                    aria-hidden
                  />
                  <span className="flex-1 font-semibold text-sm">{k.name}</span>
                  <span className="font-display font-bold">{k.points}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Everyone contributes to the same jar — this is just a recap, kept out of kids' award
              screen.
            </p>
          </div>
        )}
      </section>

      {/* Your data */}
      <section className="space-y-3">
        <SectionTitle icon={<Download className="h-4 w-4" />}>Your data</SectionTitle>
        <div className="card-soft p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            You can export or permanently delete your family's data at any time.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
            >
              <Download className="h-4 w-4" /> Export data (JSON)
            </button>
            <button
              onClick={deleteAll}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-card px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 className="h-4 w-4" /> Delete all data
            </button>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="space-y-3">
        <SectionTitle icon={<LifeBuoy className="h-4 w-4" />}>Support</SectionTitle>
        <div className="card-soft p-5">
          <p className="text-sm text-muted-foreground">
            Questions, feedback or trouble? We read every message.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition"
          >
            <LifeBuoy className="h-4 w-4" /> Email {SUPPORT_EMAIL}
          </a>
        </div>
      </section>

      <div className="pt-2 text-center text-xs text-muted-foreground space-x-3">
        <a href="/about" className="hover:text-foreground">
          About the research
        </a>
        <a href="/privacy" className="hover:text-foreground">
          Privacy
        </a>
        <a href="/terms" className="hover:text-foreground">
          Terms
        </a>
        <a href="/refunds" className="hover:text-foreground">
          Refunds
        </a>
        <a href="/contact" className="hover:text-foreground">
          Contact
        </a>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg font-bold">
      {icon}
      {children}
    </h2>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
