import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { useSettings, setSetting } from "@/lib/settings";
import { Paywall } from "@/components/Paywall";
import { trackParent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { PASTEL_HEX } from "@/lib/mock-data";
import { useHouseholdRole, type HouseholdRole } from "@/lib/use-household-role";
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
  Users,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  UserRound,
  Trash,
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

const SUPPORT_EMAIL = "support@pointpals.co.nz";

function SettingsPage() {
  const { household, kids, setHouseholdName, setRewardTarget, exportData, resetHousehold } =
    useApp();
  const settings = useSettings();
  const navigate = useNavigate();
  const [name, setName] = useState(household.name);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<"contributor" | "viewer">("contributor");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { role, userId, isAdmin } = useHouseholdRole(household.id);
  const isLive = !!userId; // signed in against Supabase household
  const [members, setMembers] = useState<
    { user_id: string; role: string; created_at: string }[]
  >([]);
  const [invites, setInvites] = useState<
    { id: string; code: string; role: string; expires_at: string; used_at: string | null }[]
  >([]);
  const [membersLoading, setMembersLoading] = useState(false);

  async function loadMembersAndInvites() {
    if (!isLive) return;
    setMembersLoading(true);
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase
        .from("household_members")
        .select("user_id, role, created_at")
        .eq("household_id", household.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("household_invites")
        .select("id, code, role, expires_at, used_at")
        .eq("household_id", household.id)
        .is("used_at", null)
        .order("created_at", { ascending: false }),
    ]);
    setMembers(m ?? []);
    setInvites(inv ?? []);
    setMembersLoading(false);
  }

  useEffect(() => {
    void loadMembersAndInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, household.id]);

  const revokeInvite = async (id: string) => {
    if (!window.confirm("Revoke this invite? The code will stop working immediately.")) return;
    const { error } = await supabase.from("household_invites").delete().eq("id", id);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== id));
  };

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

      {/* Extended Family */}
      <section className="space-y-3">
        <SectionTitle icon={<Users className="h-4 w-4" />}>Extended family</SectionTitle>

        {isLive && (
          <div className="card-soft p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Members
              </h3>
              {role && <RoleBadge role={role} />}
            </div>
            {membersLoading ? (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </div>
            ) : members.length === 0 ? (
              <div className="text-xs text-muted-foreground">No members yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3 py-2.5">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <UserRound className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {m.user_id === userId ? "You" : `Member · ${m.user_id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(m.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <RoleBadge role={m.role as HouseholdRole} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="card-soft p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            {isLive && !isAdmin
              ? "Only admins can invite new family members. Ask a family admin to generate an invite code."
              : "Generate an invite code so grandparents or other family members can join your household. Contributors can award points and add memories; viewers see everything but can't award."}
          </p>

          {(!isLive || isAdmin) && (
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex gap-2">
              {[
                { value: "contributor" as const, label: "Can give points" },
                { value: "viewer" as const, label: "View only" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInviteRole(opt.value)}
                  className={`tap px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    inviteRole === opt.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setGenerating(true);
                setInviteError(null);
                setCopied(false);
                try {
                  const { data, error: fnErr } = await supabase.functions.invoke(
                    "generate-invite",
                    { body: { household_id: household.id, role: inviteRole } },
                  );
                  if (fnErr) throw fnErr;
                  if (data.error) throw new Error(data.error);
                  setInviteCode(data.code ?? data.invite_code ?? "");
                  void loadMembersAndInvites();
                } catch (err) {
                  setInviteError(
                    err instanceof Error ? err.message : "Failed to generate invite",
                  );
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={generating}
              className="tap rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Generate invite
                </>
              )}
            </button>
          </div>
          )}

          {inviteCode && (
            <div className="flex items-center gap-3 card-soft p-3">
              <code className="text-2xl font-display font-bold tracking-[0.3em] select-all">
                {inviteCode}
              </code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="tap rounded-full bg-muted p-2 hover:bg-muted/80 transition"
                title="Copy code"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-sage-foreground" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {inviteCode && (
            <div className="text-xs text-muted-foreground">
              Share this link with your family member:
              <br />
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/join?code=${inviteCode}`;
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="tap text-foreground font-semibold underline underline-offset-2 hover:no-underline"
              >
                {window.location.origin}/join?code={inviteCode}
              </button>
            </div>
          )}

          {inviteError && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}
        </div>

        {isLive && isAdmin && invites.length > 0 && (
          <div className="card-soft p-5 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Active invites
            </h3>
            <ul className="divide-y divide-border">
              {invites.map((inv) => {
                const expiresIn = Math.max(
                  0,
                  Math.round((new Date(inv.expires_at).getTime() - Date.now()) / 86400000),
                );
                return (
                  <li key={inv.id} className="flex items-center gap-3 py-2.5">
                    <code className="font-display font-bold tracking-[0.2em] text-sm">
                      {inv.code}
                    </code>
                    <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                      <RoleBadge role={inv.role as HouseholdRole} /> · expires in {expiresIn}d
                    </div>
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="tap rounded-full bg-muted p-2 hover:bg-destructive/10 hover:text-destructive transition"
                      title="Revoke invite"
                      aria-label="Revoke invite"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
