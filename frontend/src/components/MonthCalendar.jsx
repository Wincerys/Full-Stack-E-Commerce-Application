import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff);
}
function sameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

export default function MonthCalendar({ events = [], initialMonth = new Date() }) {
  const [cursor, setCursor] = useState(startOfMonth(initialMonth));
  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const gridStart = useMemo(() => startOfWeekMonday(monthStart), [monthStart]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      const dt = new Date(ev.startTime);
      const key = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    }
    for (const arr of map.values()) arr.sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
    return map;
  }, [events]);

  const inCurrentMonth = (d) => d.getMonth() === monthStart.getMonth();
  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => setCursor(startOfMonth(new Date()));
  const monthLabel = monthStart.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <section className="container cal-month">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={goPrev}>← Prev</button>
          <button className="btn" onClick={goToday}>Today</button>
          <button className="btn" onClick={goNext}>Next →</button>
        </div>
        <h3 className="m-0">{monthLabel}</h3>
        <div />
      </div>

      <div className="weekdays">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(w => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid">
        {days.map((d) => {
          const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
          const list = eventsByDay.get(key) || [];
          const isToday = sameDay(d, today);
          const classes = [
            "cal-cell",
            !inCurrentMonth(d) && "cal-cell--dim",
            isToday && "cal-cell--today",
          ].filter(Boolean).join(" ");

          return (
            <div key={d.toISOString()} className={classes}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`cal-daynum ${isToday ? "cal-daynum--today" : ""}`}>{d.getDate()}</span>
                {list.length > 2 && <span className="badge cal-more" title={`${list.length} events`}>+{list.length - 2} more</span>}
              </div>

              {list.slice(0, 2).map(ev => (
                <Link key={ev.id} to={`/events/${ev.id}`} className="link-quiet">
                  <span className="cal-event" title={ev.title}>
                    {new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {ev.title}
                  </span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}