import { useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Sign out — always behind a confirm step. A parent juggling a child and a
 * phone shouldn't be one mis-tap away from the login screen.
 */
export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button" className={className}>
          {children ?? (
            <>
              <LogOut className="h-4 w-4" aria-hidden />
              <span>Sign out</span>
            </>
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm rounded-3xl border-0 bg-card p-6 shadow-lift">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl">Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            Your family’s jar and points stay safe — you’ll just need to log in again on this
            device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2">
          <AlertDialogCancel className="min-h-11 rounded-full">Stay signed in</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await supabase.auth.signOut();
              setBusy(false);
            }}
            className="min-h-11 rounded-full bg-cta text-white hover:brightness-110"
          >
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
