const SIDEBAR_ITEMS = [
  { label: "Snippets", color: "#3b82f6", active: true },
  { label: "Prompts", color: "#8b5cf6" },
  { label: "Commands", color: "#f97316" },
  { label: "Notes", color: "#fde047" },
  { label: "Files", color: "#6b7280" },
  { label: "Images", color: "#ec4899" },
  { label: "Links", color: "#10b981" },
];

const COLLECTION_CARDS = ["#3b82f6", "#8b5cf6", "#f97316", "#10b981"];
const RECENT_CARDS = ["#ec4899", "#3b82f6", "#fde047", "#6b7280"];

function DashCard({ color }: { color: string }) {
  return (
    <div
      className="bg-[#1a1a28] rounded-lg p-2 flex flex-col gap-1.5"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="w-[60%] h-[5px] rounded-sm bg-[#55556a]" />
      <div className="w-[90%] h-[3px] rounded-sm bg-[#1e1e2e]" />
      <div className="w-[50%] h-[3px] rounded-sm bg-[#1e1e2e]" />
    </div>
  );
}

export default function DashboardPreview() {
  return (
    <div className="h-[280px] max-md:h-[220px] bg-[#12121a] border border-[#1e1e2e] rounded-xl flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e2e] bg-[#1a1a28] shrink-0">
        <div className="w-[100px] h-2 rounded bg-[#1e1e2e]" />
        <div className="w-3.5 h-3.5 rounded-full bg-[#3b82f6]" />
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-[90px] bg-[#1a1a28] border-r border-[#1e1e2e] p-2 flex flex-col gap-1 shrink-0">
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${
                item.active ? "bg-white/[0.06]" : ""
              }`}
            >
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ background: item.color }}
              />
              <span
                className={`text-[0.45rem] font-medium leading-none whitespace-nowrap ${
                  item.active ? "text-[#8888a4]" : "text-[#55556a]"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-2.5 flex flex-col gap-1.5 overflow-hidden">
          <div className="text-[0.45rem] font-bold text-[#55556a] uppercase tracking-wider">
            Collections
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {COLLECTION_CARDS.map((c) => (
              <DashCard key={`col-${c}`} color={c} />
            ))}
          </div>
          <div className="text-[0.45rem] font-bold text-[#55556a] uppercase tracking-wider">
            Recent Items
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {RECENT_CARDS.map((c) => (
              <DashCard key={`rec-${c}`} color={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
