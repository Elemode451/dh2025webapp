const actions = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "pods", icon: "🌡️", label: "Pods" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

type SidebarProps = {
  activeId?: string;
};

export function Sidebar({ activeId = "dashboard" }: SidebarProps) {
  return (
  <aside className="relative flex h-full w-[80px] flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#111827] via-[var(--sidebar)] to-[#060606] py-8 text-white">
      <div className="flex flex-col items-center gap-8">

        <nav className="flex flex-col items-center gap-4">
          {actions.map((item) => {
            const isActive = item.id === activeId;

            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className={`group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                  isActive
                    ? "bg-white/15 shadow-[0_10px_30px_rgba(57,211,83,0.25)]"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span
                  className={`text-2xl transition-transform duration-200 ${
                    isActive ? "scale-105" : "group-hover:scale-110"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 min-w-[120px] -translate-y-1/2 translate-x-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-sm font-medium text-white/80 opacity-0 shadow-lg backdrop-blur transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
