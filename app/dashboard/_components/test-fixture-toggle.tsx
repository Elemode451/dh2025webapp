"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TestFixtureToggleProps = {
  initialEnabled: boolean;
};

export function TestFixtureToggle({ initialEnabled }: TestFixtureToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);

  const baseContainerClass =
    "rounded-md border border-dashed border-[var(--muted)] bg-[color-mix(in_srgb,var(--muted)_8%,transparent)] p-4 text-sm";

  const enableFixture = () => {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch("/api/test-fixture/enable", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to enable dev fixture");
        }

        const payload = (await response.json()) as { enabled?: boolean; error?: string };

        if (!payload.enabled) {
          throw new Error(payload.error ?? "Dev fixture did not enable");
        }

        setIsEnabled(true);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("We couldn&rsquo;t enable the dev fixture. Try again.");
      }
    });
  };

  if (isEnabled) {
    return (
      <div className={`${baseContainerClass} text-[var(--muted)]`}>
        <p className="font-medium text-[var(--foreground)]">Dev telemetry fixture is active.</p>
        <p className="mt-1">
          We&rsquo;ll keep sending simulated readings and alerts until you restart the server.
        </p>
      </div>
    );
  }

  return (
    <div className={baseContainerClass}>
      <p className="font-medium">Need fake telemetry?</p>
      <p className="mt-1 text-[var(--muted)]">
        Kick on the dev fixture to simulate droughts, chats, and alerts without real hardware.
      </p>
      <button
        type="button"
        onClick={enableFixture}
        disabled={isPending}
        className="mt-3 inline-flex items-center justify-center rounded-md bg-[var(--foreground)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Enabling..." : "Enable dev fixture"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
