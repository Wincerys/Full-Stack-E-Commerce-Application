import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeekMonday(d) {
  const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(base, diff);
}

export default function WeekCalendar({ events = [], initialDate = new Date() }) {
  const [cursor, setCursor] = useState(startOfWeekMonday(initialDate));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(cursor, i)), [cursor]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const label = `${days[0].toLocaleDateString()} – ${days[6].toLocaleDateString()}`;

  const byDayHour = useMemo(() => {
    const map = new Map();
    for (const day of days) map.set(day.toDateString(), new Map());
    for (const ev of events) {
      const dt = new Date(ev.startTime);
      const dayKey = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toDateString();
      const hr = dt.getHours();
      if (!map.has(dayKey)) continue;
      const inner = map.get(dayKey);
      if (!inner.has(hr)) inner.set(hr, []);
      inner.get(hr).push(ev);
    }
    for (const inner of map.values()) for (const arr of inner.values()) arr.sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
    return map;
  }, [events, days]);

  const goPrev = () => setCursor(addDays(cursor, -7));
  const goNext = () => setCursor(addDays(cursor, 7));
  const goToday = () => setCursor(startOfWeekMonday(new Date()));

  return (
    <section className="container cal-week">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={goPrev}>← Prev</button>
          <button className="btn" onClick={goToday}>This week</button>
          <button className="btn" onClick={goNext}>Next →</button>
        </div>
        <h3 className="m-0">{label}</h3>
        <div />
      </div>

      <div className="header">
        <div></div>
        {days.map(d => (
          <div key={d.toDateString()} style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
            {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
          </div>
        ))}
      </div>

      <div className="grid">
        {hours.map(hour => (
          <HourRow key={hour} hour={hour} days={days} byDayHour={byDayHour} />
        ))}
      </div>
    </section>
  );
}

function HourRow({ hour, days, byDayHour }) {
  const label = `${String(hour).padStart(2, "0")}:00`;
  return (
    <>
      <div className="cal-time">{label}</div>
      {days.map(d => {
        const dayKey = d.toDateString();
        const slot = byDayHour.get(dayKey)?.get(hour) || [];
        return (
          <div key={dayKey + hour} className={`cal-slot ${slot.length === 0 ? "cal-slot--empty" : ""}`}>
            {slot.length === 0 ? "—" : (
              <div style={{ display: "grid", gap: 4 }}>
                {slot.map(ev => (
                  <Link key={ev.id} to={`/events/${ev.id}`} className="link-quiet">
                    <span className="cal-event">
                      {new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>{" "}
                    {ev.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
