import { useTable, useNavigation } from "@refinedev/core";
import { useMemo } from "react";
import { useCurrency } from "@crm/hooks/use-currency";
import { Badge } from "@crm/components/ui/badge";
import { Button } from "@crm/components/ui/button";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Deal } from "@crm/types";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

dayjs.extend(relativeTime);

const dealStatusColors: Record<string, string> = {
  Lead: "bg-blue-50 text-blue-700 border-blue-200",
  Qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Proposal: "bg-amber-50 text-amber-700 border-amber-200",
  Negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  Won: "bg-green-50 text-green-700 border-green-200",
  Lost: "bg-red-50 text-red-700 border-red-200",
};

export const RecentDealsTable: React.FC = () => {
  const { show } = useNavigation();
  const { formatCompact } = useCurrency();

  const {
    tableQuery: tableQueryResult,
    current: currentPage,
    setCurrent: setCurrentPage,
    pageCount,
  } = useTable<Deal>({
    resource: "deals",
    syncWithLocation: false,
    pagination: {
      pageSize: 8,
    },
    sorters: {
      initial: [
        {
          field: "createdAt",
          order: "desc",
        },
      ],
    },
  }) as any;

  const current = currentPage ?? 1;
  const setCurrent = setCurrentPage ?? (() => {});
  const { data } = tableQueryResult;

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Deal</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Value</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Created</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((deal: Deal) => (
              <tr
                key={deal.id}
                className="border-b border-slate-50 transition-colors hover:bg-slate-50 cursor-pointer"
                onClick={() => show("deals", deal.id)}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900 truncate block max-w-[200px]">
                    {deal.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                  {formatCompact(deal.value || 0)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                      dealStatusColors[deal.status] || "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {deal.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                  {dayjs(deal.createdAt).fromNow()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data?.data || data.data.length === 0) && (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            No recent deals
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={current <= 1}
            onClick={() => setCurrent(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500">
            {current} / {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={current >= pageCount}
            onClick={() => setCurrent(current + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
