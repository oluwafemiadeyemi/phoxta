import {
  BarChart,
  Bar,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import dayjs from "dayjs";
import type { TimeSeriesData } from "./deal-revenue-chart";

type Props = {
  data: TimeSeriesData[];
};

export const NewContactsChart = ({ data }: Props) => {
  return (
    <ResponsiveContainer width="99%" height="100%">
      <BarChart
        data={data}
        barSize={16}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
        <YAxis dataKey="value" fontSize={12} stroke="rgba(100,116,139,0.7)" />
        <Bar
          type="natural"
          dataKey="value"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
        />
        <Tooltip
          cursor={{ fill: "rgba(139, 92, 246, 0.08)", radius: 4 }}
          content={
            <ChartTooltip
              labelFormatter={(label) => dayjs(label).format("MMM D, YYYY")}
            />
          }
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
