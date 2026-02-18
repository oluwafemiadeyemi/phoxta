import { ArrowUp, ArrowDown, Minus } from "lucide-react";

type Props = {
  trend?: number;
  text?: React.ReactNode;
};

export const TrendIcon = ({ trend, text }: Props) => {
  const Icon = () =>
    trend ? (
      trend > 0 ? (
        <ArrowUp className="h-4 w-4 text-green-500" />
      ) : (
        <ArrowDown className="h-4 w-4 text-red-500" />
      )
    ) : (
      <Minus className="h-4 w-4 text-slate-400" />
    );

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      {text}
      <Icon />
    </span>
  );
};
