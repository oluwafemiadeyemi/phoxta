import { useList } from "@refinedev/core";
import type { Deal } from "@crm/types";
import { Trophy, Medal, Award } from "lucide-react";
import { useCurrency } from "@crm/hooks/use-currency";

const rankIcons = [
  <Trophy key="1" className="h-5 w-5 text-yellow-500" />,
  <Medal key="2" className="h-5 w-5 text-slate-400" />,
  <Award key="3" className="h-5 w-5 text-amber-600" />,
];

export const TopDeals: React.FC = () => {
  const { formatCompact } = useCurrency();
  const { result } = useList<Deal>({
    resource: "deals",
    pagination: { pageSize: 100 },
    sorters: [{ field: "value", order: "desc" }],
  });

  const topDeals = (result?.data || [])
    .filter((d: Deal) => !["Lost"].includes(d.status))
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    Lead: "bg-blue-50 text-blue-700",
    Qualified: "bg-indigo-50 text-indigo-700",
    Proposal: "bg-amber-50 text-amber-700",
    Negotiation: "bg-orange-50 text-orange-700",
    Won: "bg-green-50 text-green-700",
  };

  return (
    <div className="divide-y divide-slate-100">
      {topDeals.map((deal, index) => (
        <div
          key={deal.id}
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
            {index < 3 ? (
              rankIcons[index]
            ) : (
              <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {deal.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  statusColors[deal.status] || "bg-slate-50 text-slate-700"
                }`}
              >
                {deal.status}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-slate-900">
              {formatCompact(deal.value || 0)}
            </p>
          </div>
        </div>
      ))}
      {topDeals.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          No deals yet
        </div>
      )}
    </div>
  );
};
