const actions = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'plants', icon: '🪴', label: 'Plants' },
  { id: 'pods', icon: '🌡️', label: 'Pods' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

type SidebarProps = {
  activeId?: string;
};

export function Sidebar({ activeId = 'dashboard' }: SidebarProps) {
  return (
    <aside className="flex flex-col items-center gap-4 bg-[var(--sidebar)] py-6">
      {actions.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            className={`flex h-11 w-11 items-center justify-center rounded-[var(--button-radius)] text-xl text-white/80 transition-all duration-200 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)] ${
              isActive
                ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(57,211,83,0.35)]'
                : 'hover:bg-white/10'
            }`}
          >
            {item.icon}
          </button>
        );
      })}
    </aside>
  );
}
