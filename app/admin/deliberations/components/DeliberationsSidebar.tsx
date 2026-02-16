import type { DeliberationApplicant } from "@/lib/types";

type FilterTab = "all" | "auto_accept" | "discuss" | "auto_reject";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "auto_accept", label: "Accept" },
  { value: "discuss", label: "Discuss" },
  { value: "auto_reject", label: "Reject" },
];

interface DeliberationsSidebarProps {
  applicants: DeliberationApplicant[];
  filter: FilterTab;
  selectedId: string | null;
  onFilterChange: (filter: FilterTab) => void;
  onSelectApplicant: (id: string) => void;
}

export const DeliberationsSidebar = ({
  applicants,
  filter,
  selectedId,
  onFilterChange,
  onSelectApplicant,
}: DeliberationsSidebarProps) => {
  const filteredApplicants =
    filter === "all"
      ? applicants
      : applicants.filter((a) => a.status === filter);

  // Count per category
  const counts: Record<FilterTab, number> = {
    all: applicants.length,
    auto_accept: applicants.filter((a) => a.status === "auto_accept").length,
    discuss: applicants.filter((a) => a.status === "discuss").length,
    auto_reject: applicants.filter((a) => a.status === "auto_reject").length,
  };

  return (
    <div className="w-72 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Filter Tabs */}
      <div className="p-3 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label} ({counts[tab.value]})
            </button>
          ))}
        </div>
      </div>

      {/* Applicant List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredApplicants.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No applicants in this category
          </p>
        )}
        {filteredApplicants.map((app) => {
          const isSelected = selectedId === app.id;
          const isDecided =
            app.status === "accepted" || app.status === "rejected";

          return (
            <button
              key={app.id}
              onClick={() => onSelectApplicant(app.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : isDecided
                    ? "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    : "bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{app.anonymousId}</span>
                <div className="flex items-center gap-1.5">
                  {app.totalScore !== null && (
                    <span
                      className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-400"}`}
                    >
                      {app.totalScore.toFixed(2)}
                    </span>
                  )}
                  {isDecided && (
                    <span
                      className={`text-xs font-medium ${
                        isSelected
                          ? "text-blue-100"
                          : app.status === "accepted"
                            ? "text-green-600"
                            : "text-red-500"
                      }`}
                    >
                      {app.status === "accepted" ? "Y" : "N"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
