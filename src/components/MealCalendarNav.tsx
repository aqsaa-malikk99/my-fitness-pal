import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eachDateInRangeInclusive, formatMonthDay, maxIso, minIso } from "@/lib/dateIso";

type Props = {
  rangeStart: string;
  rangeEnd: string;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  /** Dates with an explicit saved daily meal plan in Firestore */
  overrideDates: Set<string>;
  /** Local calendar YYYY-MM-DD for “today” (future-day styling vs selected). */
  todayCalendar: string;
};

/** Month dropdown + horizontal day strip for the plan window (matches Meals UI). */
export default function MealCalendarNav({
  rangeStart,
  rangeEnd,
  selectedDate,
  onSelectDate,
  overrideDates,
  todayCalendar,
}: Props) {
  const start = minIso(rangeStart, rangeEnd);
  const end = maxIso(rangeStart, rangeEnd);
  const allDays = useMemo(() => eachDateInRangeInclusive(start, end), [start, end]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    for (const d of allDays) {
      const key = d.slice(0, 7);
      if (seen.has(key)) continue;
      seen.add(key);
      const label = new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      out.push({ key, label });
    }
    return out;
  }, [allDays]);

  const selectedMonthKey = selectedDate.slice(0, 7);
  const activeMonthKey = months.some((m) => m.key === selectedMonthKey) ? selectedMonthKey : months[0]?.key ?? selectedMonthKey;

  const stripDays = useMemo(() => allDays.filter((d) => d.startsWith(activeMonthKey)), [allDays, activeMonthKey]);

  const handleMonthChange = useCallback(
    (key: string) => {
      const first = allDays.find((d) => d.startsWith(key));
      if (first) onSelectDate(first);
    },
    [allDays, onSelectDate],
  );

  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    updateScrollHints();
    el.addEventListener("scroll", updateScrollHints, { passive: true });
    const ro = new ResizeObserver(() => updateScrollHints());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      ro.disconnect();
    };
  }, [updateScrollHints, stripDays]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || !selectedDate) return;
    requestAnimationFrame(() => {
      const btn = el.querySelector<HTMLElement>(`[data-meal-cal-day="${selectedDate}"]`);
      btn?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }, [selectedDate, activeMonthKey]);

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(220, el.clientWidth * 0.75), behavior: "smooth" });
  };

  const today = todayCalendar;

  return (
    <div className="meal-cal meal-cal--strip">
      <select
        id="meal-cal-month"
        className="meal-cal-month-select"
        aria-label="Month"
        value={activeMonthKey}
        onChange={(e) => handleMonthChange(e.target.value)}
      >
        {months.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      <div className="meal-cal-strip-outer">
        {canScrollLeft && (
          <button
            type="button"
            className="meal-cal-strip-arrow meal-cal-strip-arrow--left"
            aria-label="Scroll dates left"
            onClick={() => scrollStrip(-1)}
          >
            ‹
          </button>
        )}
        <div className="meal-cal-strip-scroll" ref={stripRef}>
          {stripDays.map((d) => {
            const isSel = d === selectedDate;
            const hasOverride = overrideDates.has(d);
            const dayNum = Number(d.slice(8, 10));
            const isFuture = d > today;
            return (
              <button
                key={d}
                type="button"
                data-meal-cal-day={d}
                className={`meal-cal__day${isSel ? " meal-cal__day--selected" : ""}${hasOverride ? " meal-cal__day--saved" : ""}${isFuture ? " meal-cal__day--future" : ""}`}
                onClick={() => onSelectDate(d)}
                title={formatMonthDay(d)}
              >
                <span className="meal-cal__day-num">{dayNum}</span>
                {hasOverride && <span className="meal-cal__dot" aria-hidden />}
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button
            type="button"
            className="meal-cal-strip-arrow meal-cal-strip-arrow--right"
            aria-label="Scroll dates right"
            onClick={() => scrollStrip(1)}
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
