const actions = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "plants", icon: "🪴", label: "Plants" },
  { id: "pods", icon: "🌡️", label: "Pods" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

type SidebarProps = {
  activeId?: string;
};

export function Sidebar({ activeId = "dashboard" }: SidebarProps) {
  return (
    <aside className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#111827] via-[var(--sidebar)] to-[#060606] px-6 py-8 text-white">
      <div className="flex flex-col items-center gap-10">
        <div className="text-center">
          <div className="text-4xl">🌿</div>
          <p className="mt-3 text-xs uppercase tracking-[0.4em] text-white/40">Greenroom</p>
          <p className="mt-1 text-base font-semibold text-white">Plant Portal</p>
        </div>

        <nav className="flex w-full flex-col gap-3">
          {actions.map((item) => {
            const isActive = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className={`group flex flex-col items-center gap-2 rounded-2xl px-4 py-3 text-center transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  isActive
                    ? "bg-white/10 shadow-[0_10px_30px_rgba(57,211,83,0.22)]"
                    : "bg-white/5 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform duration-200 ${
                    isActive ? "scale-105" : "group-hover:scale-105"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-white/80">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-xs text-white/70 backdrop-blur">
        <p className="font-semibold text-white">Happy plants, happy people.</p>
        <p className="mt-2 leading-relaxed">
          Give them a little water, a little light, and they will shower you with leafy gratitude.
        </p>
      </div>
    </aside>
  );
}
