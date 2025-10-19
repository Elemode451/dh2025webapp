import { signOut } from '@/auth';

type TopBarProps = {
  username: string;
};

export async function TopBar({ username }: TopBarProps) {
  return (
    <header className="h-14 bg-[var(--topbar)] text-white">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <span className="text-lg font-semibold tracking-tight">🌱 Sprout</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/80">welcome back, {username}!</span>
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <button
              type="submit"
              className="rounded-[var(--button-radius)] bg-[var(--accent)] px-4 py-2 font-medium text-[var(--topbar)] transition-transform duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--topbar)]"
            >
              log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
