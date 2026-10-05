import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

export interface DaysDatum {
  key: string;
  /** Short axis label, e.g. "Sep". */
  label: string;
  /** Full label for tooltip and table, e.g. "Sep 4 – Oct 1". */
  detail: string;
  days: number;
}

function ChartTooltip({ active, payload }: Pick<TooltipContentProps<ValueType, NameType>, 'active' | 'payload'>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload as DaysDatum;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-raised">
      <p className="text-ink-muted">{datum.detail}</p>
      <p className="font-semibold text-ink tabular-nums">{datum.days} days</p>
    </div>
  );
}

/**
 * Single-series bar chart of day counts (cycle lengths or period durations)
 * with an optional average reference line and an accessible table view.
 */
export function DaysBarChart({
  data,
  average,
  colorVar,
  title,
  tableCaption,
}: {
  data: DaysDatum[];
  average: number | null;
  /** CSS custom property for the bar colour, e.g. "--color-accent". */
  colorVar: string;
  title: string;
  tableCaption: string;
}) {
  const max = Math.max(...data.map((d) => d.days), average ?? 0);
  return (
    <figure>
      <div className="h-56 w-full" role="img" aria-label={`${title}. A table with the same data follows.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -18 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-ink-subtle)', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={[0, Math.ceil(max * 1.15)]}
              tick={{ fill: 'var(--color-ink-subtle)', fontSize: 12 }}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ fill: 'var(--color-surface-muted)' }}
              isAnimationActive={false}
            />
            {average !== null && (
              <ReferenceLine
                y={average}
                stroke="var(--color-ink-muted)"
                strokeDasharray="4 4"
                label={{
                  value: `avg ${average.toFixed(1)}`,
                  position: 'insideTopRight',
                  fill: 'var(--color-ink-muted)',
                  fontSize: 11,
                }}
              />
            )}
            <Bar dataKey="days" fill={`var(${colorVar})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-muted hover:text-ink">View as table</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{tableCaption}</caption>
          <thead>
            <tr className="border-b border-border text-ink-muted">
              <th scope="col" className="py-1.5 font-medium">Dates</th>
              <th scope="col" className="py-1.5 text-right font-medium">Days</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-b border-border/60">
                <td className="py-1.5">{d.detail}</td>
                <td className="py-1.5 text-right tabular-nums">{d.days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
