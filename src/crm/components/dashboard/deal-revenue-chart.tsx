import {
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import dayjs from "dayjs";
import { useCurrency } from "@crm/hooks/use-currency";

export type TimeSeriesData = {
  date: string;
  value: number;
};

type Props = {
  data: TimeSeriesData[];
};

export const DealRevenueChart = ({ data }: Props) => {
  const { symbol, format } = useCurrency();

  return (
    <ResponsiveContainer width="99%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="date"
          fontSize={12}
          stroke="rgba(100,116,139,0.7)"
          interval={data.length > 7 ? 6 : 0}
          tickFormatter={(value) => {
            if (data.length > 7) {
              const start = dayjs(data[0].date);
              const current = dayjs(value);
              const weekNum = Math.floor(current.diff(start, "day") / 7) + 1;
              return `Week ${weekNum}`;
            }
            return dayjs(value).format("ddd");
          }}
        />
        <YAxis
          dataKey="value"
          fontSize={12}
          stroke="rgba(100,116,139,0.7)"
          tickFormatter={(value) => {
            if (value >= 1000) return `${symbol}${Number(value) / 1000}k`;
            return `${symbol}${value}`;
          }}
        />
        <defs>
          <linearGradient id="revenue-area-color" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#revenue-area-color)"
        />
        <Tooltip
          content={
            <ChartTooltip
              valueFormatter={(value) => format(Number(value))}
              labelFormatter={(label) => dayjs(label).format("MMM D, YYYY")}
            />
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
