import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-store";
import { useSettings, setSetting } from "@/lib/settings";
import { Paywall } from "@/components/Paywall";
import { trackParent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { primeAudio } from "@/lib/feedback";
import { PASTEL_HEX, type Kid } from "@/lib/mock-data";
import { useHouseholdRole, type HouseholdRole } from "@/lib/use-household-role";
import { ToggleRow } from "@/components/jar-settings";
import { fetchKidsViewToken, regenerateKidsViewToken, kidsViewLinkUrl } from "@/lib/kids-view-link";
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
  Check,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  Shield,
  UserRound,
  UserCog,
  Trash,
  BarChart3,
  LogOut,
  Send,
  MailQuestion,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
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

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { submitContactForm } from "@/lib/emails.functions";
import { fetchSeasonInfo, setSeasonRefreshEnabled } from "@/lib/montage";
import { exportMemoriesZip } from "@/lib/montage";

const SUPPORT_EMAIL = "support@pointpals.co.nz";

function SettingsPage() {
  const { household, kids, setHouseholdName, setRewardTarget, exportData, deleteAccount } =
    useApp();
  const settings = useSettings();
  const navigate = useNavigate();
  const [name, setName] = useState(household.name);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<"contributor" | "viewer">("contributor");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [myDisplayName, setMyDisplayName] = useState("");
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [kidPin, setKidPin] = useState("");

  const { role, userId, isAdmin } = useHouseholdRole(household.id);
  const isLive = !!userId; // signed in against Supabase household

  // Seasonal memory refresh (retention opt-out). null = not loaded / demo mode.
  const [seasonRefresh, setSeasonRefresh] = useState<boolean | null>(null);
  const [seasonDays, setSeasonDays] = useState(90);
  const [memoryCount, setMemoryCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!isLive) return;
    void fetchSeasonInfo(household.id).then((s) => {
      if (s) {
        setSeasonRefresh(s.enabled);
        setSeasonDays(s.retentionDays);
      }
    });
    // Count memories for this household
    void supabase
      .from("memory_posts")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id)
      .then(({ count }) => {
        if (count !== null) setMemoryCount(count);
      });
  }, [isLive, household.id]);
  async function saveSeasonRefresh(enabled: boolean) {
    setSeasonRefresh(enabled); // optimistic
    const ok = await setSeasonRefreshEnabled(household.id, enabled);
    if (!ok) setSeasonRefresh(!enabled);
    else trackParent("memory_season_refresh_toggled", { enabled });
  }
  async function handleExportMemories() {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportMemoriesZip(household.id);
      if (!result.ok) {
        setExportError(result.error ?? "Export failed");
        return;
      }
      if (result.format === "zip" && result.download_url) {
        // Trigger browser download via hidden link (window.open can be blocked by popup blockers)
        const a = document.createElement("a");
        a.href = result.download_url;
        a.download = `pointpals-memories-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (result.format === "urls" && result.urls) {
        // Fallback: open the first URL
        const a = document.createElement("a");
        a.href = result.urls[0];
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (result.urls.length > 1) {
          setExportError(
            `${result.urls.length} files available — downloading first one. ` +
              `Open Settings again to download the rest.`,
          );
        }
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }
  const [members, setMembers] = useState<
    { user_id: string; role: string; created_at: string; display_name: string | null }[]
  >([]);
  const [invites, setInvites] = useState<
    { id: string; code: string; role: string; expires_at: string; used_at: string | null }[]
  >([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [extFamilyNeedsWork, setExtFamilyNeedsWork] = useState(false);
  const [extFamilyNeedsWorkLoading, setExtFamilyNeedsWorkLoading] = useState(false);

  async function loadMembersAndInvites() {
    if (!isLive) return;
    setMembersLoading(true);
    const [{ data: m }, { data: inv }] = await Promise.all([
      supabase
        .from("household_members")
        .select("user_id, role, created_at, display_name")
        .eq("household_id", household.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("household_invites")
        .select("id, code, role, expires_at, used_at")
        .eq("household_id", household.id)
        .is("used_at", null)
        .order("created_at", { ascending: false }),
    ]);
    setMembers((m ?? []) as unknown as typeof members);
    setInvites(inv ?? []);
    setMembersLoading(false);
  }

  // Load extended-family permissions from household_settings table.
  useEffect(() => {
    if (!isLive || !household.id) return;
    setExtFamilyNeedsWorkLoading(true);
    void supabase
      .from("household_settings")
      .select("ext_family_can_award_needs_work")
      .eq("household_id", household.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExtFamilyNeedsWork(data.ext_family_can_award_needs_work);
      })
      .finally(() => setExtFamilyNeedsWorkLoading(false));
  }, [isLive, household.id]);

  // A name suggested by the auth provider (Google populates full_name / name;
  // fall back to the email's local part). Used to prefill the display-name
  // field for a member who hasn't set one yet, so extended family who signed
  // in with Google don't have to retype their name.
  const [suggestedName, setSuggestedName] = useState("");
  useEffect(() => {
    if (!isLive) return;
    void supabase.auth.getUser().then(({ data }) => {
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      const fromMeta =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        "";
      const fromEmail = data.user?.email?.split("@")[0] ?? "";
      setSuggestedName((fromMeta || fromEmail || "").trim());
    });
  }, [isLive]);

  // Initialise my display name from loaded data, falling back to the
  // provider-suggested name when none is saved yet.
  useEffect(() => {
    if (userId && members.length > 0) {
      const me = members.find((m) => m.user_id === userId);
      if (me && !myDisplayName) {
        setMyDisplayName(me.display_name ?? suggestedName ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, members, suggestedName]);

  useEffect(() => {
    void loadMembersAndInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, household.id]);

  const saveDisplayName = async () => {
    if (!userId || !isLive) return;
    setSavingName(true);
    setDisplayNameSaved(false);
    const displayName = myDisplayName.trim() || null;
    const { error } = await supabase
      .from("household_members")
      .update({ display_name: displayName } as never)
      .eq("household_id", household.id)
      .eq("user_id", userId);
    setSavingName(false);
    if (error) {
      console.error("Failed to save display name:", error);
      return;
    }
    setDisplayNameSaved(true);
    setTimeout(() => setDisplayNameSaved(false), 2500);
    void loadMembersAndInvites();
  };

  const revokeInvite = async (id: string) => {
    if (!window.confirm("Revoke this invite? The code will stop working immediately.")) return;
    // .select() so RLS silently deleting 0 rows surfaces as a failure instead
    // of the invite "coming back" on the next page load.
    const { data, error } = await supabase
      .from("household_invites")
      .delete()
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0) {
      setInviteError(
        error?.message ?? "Couldn't revoke that invite — only household admins can revoke invites.",
      );
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

  // Leaderboard is parent-controlled and OFF by default (§4). Framed as a recap,
  // never a live competitive ranking.
  const ranked = [...kids].sort((a, b) => b.currentPoints - a.currentPoints);

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
                max={100}
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

      {/* Reports — parent/admin only */}
      {(role === null || role === "admin" || role === "parent") && (
        <section className="space-y-3">
          <SectionTitle icon={<BarChart3 className="h-4 w-4" />}>Reports</SectionTitle>
          <Link
            to="/reports"
            className="card-soft p-4 flex items-center justify-between hover:bg-muted/40 transition"
          >
            <div>
              <div className="text-sm font-semibold">Positive vs. needs-work trends</div>
              <div className="text-xs text-muted-foreground">
                Date-range gauge, event log, CSV export
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </section>
      )}

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
                {members.map((m) => {
                  const isMe = m.user_id === userId;
                  const displayName = m.display_name?.trim() || null;
                  return (
                    <li key={m.user_id} className="flex items-center gap-3 py-2.5">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserRound className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {isMe ? "You" : (displayName ?? `Member · ${m.user_id.slice(0, 8)}`)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(m.created_at).toLocaleDateString()}
                          {displayName && !isMe && (
                            <>
                              {" · "}
                              <span className="font-mono text-[10px]">{m.user_id.slice(0, 8)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <RoleBadge role={m.role as HouseholdRole} />
                        {isAdmin && !isMe && (m.role as HouseholdRole) !== "admin" && (
                          <PromoteButton
                            targetUserId={m.user_id}
                            onPromoted={loadMembersAndInvites}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Needs‑Work toggle — only admins can change it */}
        {isLive && isAdmin && (
          <div className="card-soft p-1">
            <ToggleRow
              icon={<BarChart3 className="h-4 w-4" />}
              label="Allow extended family to log needs-work"
              desc="When on, viewers can award 'Needs work' taps (‑1 point). Off by default."
              checked={extFamilyNeedsWork}
              onChange={async (v) => {
                setExtFamilyNeedsWork(v);
                await supabase.from("household_settings").upsert(
                  {
                    household_id: household.id,
                    ext_family_can_award_needs_work: v,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "household_id" },
                );
                trackParent("ext_family_needs_work_toggle", { on: v });
              }}
            />
          </div>
        )}

        <div className="card-soft p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate an invite code so grandparents or other family members can join your household.
            Contributors can award points and add memories; viewers see everything but can't award.
          </p>

          {
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
          }

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
            onChange={(v) => {
              setSetting("sound", v);
              if (v) primeAudio();
            }}
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

      {/* Kids' view — read-only progress screen */}
      {(role === null || role !== "viewer") && (
        <section className="space-y-3">
          <SectionTitle icon={<Eye className="h-4 w-4" />}>Kids&apos; view</SectionTitle>
          {/* Option 1: a private link kids open on their OWN device. */}
          <KidsViewShareLink householdId={household.id} />

          {/* Option 2: lock THIS device into the read-only view. */}
          <div className="card-soft p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Prefer to hand over <strong>your</strong> phone instead? Lock this device into the
              read-only view — the family jar and each child&apos;s jar and points. They{" "}
              <strong>can&apos;t award points, change anything, or leave the page</strong>. Set an
              optional PIN; you&apos;ll enter it to exit back to the parent app.
            </p>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Exit PIN (optional, 4 digits)
              </span>
              <input
                inputMode="numeric"
                value={kidPin}
                onChange={(e) => setKidPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="e.g. 1234"
                className="mt-1 w-40 rounded-xl border border-input bg-card px-3 py-2.5 text-center tracking-[0.3em] font-display"
              />
            </label>
            <button
              onClick={() => {
                setSetting("kidsViewPin", kidPin);
                setSetting("kidsViewActive", true);
              }}
              className="tap inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
            >
              <Eye className="h-4 w-4" /> Lock this device
            </button>
          </div>
        </section>
      )}

      {/* Sibling leaderboard — off by default */}
      {(role === null || role !== "viewer") && (
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
                    <span className="font-display font-bold">{k.currentPoints}</span>
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
      )}

      {/* Your data */}
      {(role === null || role !== "viewer") && (
        <section className="space-y-3">
          <SectionTitle icon={<Download className="h-4 w-4" />}>Your data</SectionTitle>
          <div className="card-soft p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              You can export a copy of your family's data at any time. To delete your account and
              data, email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">
                {SUPPORT_EMAIL}
              </a>
              , or use the button below to permanently remove everything.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
              >
                <Download className="h-4 w-4" /> Export data (JSON)
              </button>
              {isLive && (
                <button
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Permanently delete your family data? This cannot be undone. Your household, children, points history, and memory feed will be removed.",
                      )
                    )
                      return;
                    setDeleting(true);
                    deleteAccount().finally(() => setDeleting(false));
                  }}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" /> Delete family data
                    </>
                  )}
                </button>
              )}
            </div>
            {isLive && seasonRefresh !== null && (
              <div className="border-t border-border/60 -mx-4 mt-1">
                {/* Memory count + season info */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {seasonRefresh
                      ? `Your memories cycle every ${seasonDays} days. When the season ends, the feed is cleared and a video montage is emailed to you.`
                      : `Seasonal refresh is off — memories stay forever. No montage video will be created.`}
                  </p>
                  {seasonRefresh && memoryCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => void handleExportMemories()}
                        disabled={exporting}
                        className="tap inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" /> Download all memories
                          </>
                        )}
                      </button>
                      <Link
                        to="/memories"
                        className="tap inline-flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition"
                      >
                        <Trash2 className="h-4 w-4" /> Curate feed
                      </Link>
                    </div>
                  )}
                  {exportError && <p className="mt-2 text-xs text-destructive">{exportError}</p>}
                </div>
                <ToggleRow
                  icon={<RefreshCw className="h-4 w-4" />}
                  label="Seasonal memory refresh"
                  desc={`Memories are kept for one ${seasonDays}-day season, then cleared — you get an email and a downloadable montage first. Turn off to keep the feed forever.`}
                  checked={seasonRefresh}
                  onChange={(v) => void saveSeasonRefresh(v)}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Account */}
      <section className="space-y-3">
        <SectionTitle icon={<LogOut className="h-4 w-4" />}>Account</SectionTitle>
        <div className="card-soft p-5 space-y-4">
          {isLive && (
            <div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your display name
                </span>
                <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                  Shown to the rest of the family instead of an account number — e.g. "Grandma".
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={60}
                    value={myDisplayName}
                    onChange={(e) => setMyDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={() => void saveDisplayName()}
                    disabled={savingName}
                    className="tap shrink-0 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {displayNameSaved ? <Check className="h-4 w-4" /> : null}
                    {savingName ? "Saving…" : displayNameSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </label>
            </div>
          )}

          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm text-muted-foreground">Sign out of PointPals on this device.</p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/welcome" });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
            >
              <LogOut className="h-4 w-4" /> Sign out
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
          <SupportDialog supportEmail={SUPPORT_EMAIL} />
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Or email us directly at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">
              {SUPPORT_EMAIL}
            </a>
          </p>
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

/** In-app dialog for the Email Support button — posts through submitContactForm
 *  which forwards to the support inbox and sends the Contact-Confirmation autoreply.
 *  Pre-fills the user's email, and supports screenshot attachment via Supabase Storage. */
function SupportDialog({ supportEmail }: { supportEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pre-fill email from the authenticated session
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      let screenshotUrl: string | undefined;
      if (screenshot) {
        const ext = screenshot.name.split(".").pop() || "png";
        const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data: upload, error: uploadErr } = await supabase.storage
          .from("support_attachments")
          .upload(path, screenshot, { contentType: screenshot.type });
        if (uploadErr) throw uploadErr;
        const {
          data: { signedUrl },
        } = await supabase.storage
          .from("support_attachments")
          .createSignedUrl(upload.path, 60 * 60 * 24 * 7); // 7-day expiry
        screenshotUrl = signedUrl;
      }
      await submitContactForm({ data: { name, email, message, screenshotUrl } });
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSent(false);
          setScreenshot(null);
          setScreenshotPreview(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition">
          <MailQuestion className="h-4 w-4" /> Message us
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send us a message</DialogTitle>
          <DialogDescription>
            A real human on the PointPals team will reply, usually within one working day.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="rounded-2xl bg-butter/40 border border-butter p-5 text-sm">
            <p className="font-semibold">Message received 🌱</p>
            <p className="mt-1 text-muted-foreground">
              Check your inbox — we’ve sent a confirmation.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your name
              </span>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </span>
              <textarea
                required
                maxLength={3000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm resize-y"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Screenshot (optional)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setScreenshot(file);
                  setScreenshotPreview(file ? URL.createObjectURL(file) : null);
                }}
                className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-muted/70"
              />
              {screenshotPreview && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="h-28 w-auto rounded-lg border border-input object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotPreview(null);
                    }}
                    className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs shadow-sm hover:scale-110 transition"
                    aria-label="Remove screenshot"
                  >
                    ✕
                  </button>
                </div>
              )}
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Or email{" "}
          <a href={`mailto:${supportEmail}`} className="underline hover:text-foreground">
            {supportEmail}
          </a>
        </p>
      </DialogContent>
    </Dialog>
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

// A private, read-only share link kids open on their own device (no login, no
// PIN). The unguessable token is the gate; Regenerate invalidates an old link.
function KidsViewShareLink({ householdId }: { householdId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchKidsViewToken(householdId).then((t) => {
      if (!cancelled) {
        setToken(t);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const url = token ? kidsViewLinkUrl(token) : "";

  const copy = async () => {
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "PointPals — your points", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* share/copy dismissed or unavailable — ignore */
    }
  };

  const regenerate = async () => {
    if (
      !window.confirm(
        "Create a new link? The old link will stop working and kids will need the new one.",
      )
    )
      return;
    setBusy(true);
    const next = await regenerateKidsViewToken(householdId);
    if (next) setToken(next);
    setBusy(false);
  };

  return (
    <div className="card-soft p-5 space-y-3">
      <p className="text-sm text-muted-foreground">
        Send each child a <strong>private link</strong> to save on their own phone or iPad. It opens
        a read-only screen of the jars and points — no login, no PIN needed. They can check anytime
        without asking you.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading link…
        </div>
      ) : !token ? (
        <p className="text-xs text-muted-foreground">
          The share link needs the backend connected — it&apos;ll appear here once your household is
          live.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-xs text-muted-foreground"
            />
            <button
              onClick={copy}
              className="tap shrink-0 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Share"}
            </button>
          </div>
          <button
            onClick={regenerate}
            disabled={busy}
            className="tap inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Regenerate link
          </button>
          <p className="text-[11px] text-muted-foreground/70">
            Anyone with the link can view the points (read-only). Regenerate to disable a link
            you&apos;ve shared before.
          </p>
        </>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: HouseholdRole }) {
  if (!role) return null;
  const styles: Record<Exclude<HouseholdRole, null>, string> = {
    admin: "bg-foreground text-background",
    parent: "bg-lilac text-lilac-foreground",
    contributor: "bg-sage text-sage-foreground",
    viewer: "bg-muted text-muted-foreground",
  };
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[role]}`}
    >
      {role === "admin" && <ShieldCheck className="w-3 h-3" />} {label}
    </span>
  );
}

function PromoteButton({
  targetUserId,
  onPromoted,
}: {
  targetUserId: string;
  onPromoted: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const promote = async (newRole: "admin" | "parent" | "contributor") => {
    setBusy(true);
    setErr(null);
    setMenuOpen(false);
    const { data, error } = await supabase.rpc("promote_household_member", {
      target_user_id: targetUserId,
      new_role: newRole,
    });
    if (error) {
      setErr(error.message);
    } else {
      const result = data as { ok?: boolean; error?: string };
      if (result?.ok) {
        await onPromoted();
      } else {
        setErr(result?.error ?? "Failed to update role");
      }
    }
    setBusy(false);
    setTimeout(() => setErr(null), 4000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={busy}
        className="tap rounded-full bg-muted p-1.5 hover:bg-muted/80 transition disabled:opacity-50"
        title="Change role"
        aria-label="Change role"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <UserCog className="w-3.5 h-3.5" />
        )}
      </button>
      {menuOpen && (
        <>
          {/* Backdrop to dismiss */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-input rounded-xl shadow-lg p-1.5 min-w-[140px] space-y-0.5">
            <button
              onClick={() => promote("admin")}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted transition text-left"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Promote to admin
            </button>
            <button
              onClick={() => promote("parent")}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted transition text-left"
            >
              <Shield className="w-3.5 h-3.5" /> Set as parent
            </button>
            <button
              onClick={() => promote("contributor")}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-muted transition text-left"
            >
              <UserRound className="w-3.5 h-3.5" /> Set as contributor
            </button>
          </div>
        </>
      )}
      {err && (
        <div className="absolute right-0 top-full mt-12 z-20 bg-destructive/10 text-destructive text-[10px] font-semibold rounded-lg px-2.5 py-1.5 whitespace-nowrap">
          {err}
        </div>
      )}
    </div>
  );
}
