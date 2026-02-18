import type { TooltipProps } from "recharts";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: string | number; payload?: Record<string, any> }>;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: string | number) => string;
};

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  valueFormatter,
  labelFormatter,
}) => {
  if (active && payload?.length) {
    const value =
      valueFormatter?.(payload[0]?.value || "") || payload[0]?.value;

    const label =
      labelFormatter?.(payload[0]?.payload?.date || "") ||
      payload[0]?.payload?.date;

    return (
      <div className="flex flex-col gap-1 rounded-md bg-slate-700 px-3 py-2 text-white text-xs font-semibold shadow-lg dark:bg-slate-800">
        <span>{value}</span>
        <span className="text-slate-300">{label}</span>
      </div>
    );
  }

  return null;
};
