// src/lib/mockApi.js

const STORAGE_KEY = "uni-events-mvp";
const seed = {
  events: [
    {
      id: "e1",
      title: "RMIT Tech Club: Intro to React",
      description:
        "Kickstart your React journey with hands-on examples. Bring your laptop!",
      dateTime: "2025-09-19 15:00",
      location: "RMIT Building 80, Room 10",
      category: "Workshop",
    },
    {
      id: "e2",
      title: "International Students Meetup",
      description:
        "Meet new friends, share tips about living in Melbourne, snacks provided.",
      dateTime: "2025-09-20 14:00",
      location: "RMIT Alumni Courtyard",
      category: "Social",
    },
    {
      id: "e3",
      title: "Careers: Resume & LinkedIn Clinic",
      description:
        "One-on-one quick critiques from industry mentors. First come, first served.",
      dateTime: "2025-09-21 11:00",
      location: "Career Centre, Level 3",
      category: "Career",
    },
  ],
  rsvpsByUser: {
    demoUser: {},
  },
};

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return structuredClone(seed);
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const USER_ID = "demoUser";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toDate = (s) => new Date(s.replace(" ", "T"));
const newId = () => "e" + Math.random().toString(36).slice(2, 8);

export const mockApi = {
  async listEvents({ q = "", category = "", sort = "asc" } = {}) {
    const db = load();
    let events = db.events.slice();

    if (q) {
      const t = q.toLowerCase();
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(t) ||
          e.description.toLowerCase().includes(t) ||
          e.location.toLowerCase().includes(t)
      );
    }
    if (category) {
      events = events.filter(
        (e) => e.category.toLowerCase() === category.toLowerCase()
      );
    }

    events.sort((a, b) =>
      sort === "desc" ? toDate(b.dateTime) - toDate(a.dateTime) : toDate(a.dateTime) - toDate(b.dateTime)
    );

    await sleep(120);
    return events;
  },

  async getEvent(id) {
    const db = load();
    const ev = db.events.find((e) => e.id === id) || null;
    await sleep(100);
    if (!ev) throw new Error("Event not found");
    return ev;
  },

  async createEvent({ title, description, dateTimeISO, location, category }) {
    // dateTimeISO comes from <input type="datetime-local"> e.g. "2025-09-22T16:30"
    const db = load();

    // Basic validation
    if (!title || !dateTimeISO || !location || !category) {
      throw new Error("Please fill in title, date/time, location, and category.");
    }

    // store format = "YYYY-MM-DD HH:MM"
    const dateTime = dateTimeISO.replace("T", " ").slice(0, 16);
    const ev = {
      id: newId(),
      title: String(title).trim(),
      description: String(description || "").trim(),
      dateTime,
      location: String(location).trim(),
      category: String(category).trim(),
    };

    db.events.push(ev);
    save(db);
    await sleep(150);
    return ev;
  },

  async rsvp(eventId, status) {
    const db = load();
    if (!db.rsvpsByUser[USER_ID]) db.rsvpsByUser[USER_ID] = {};
    if (status === "CANCELLED") {
      delete db.rsvpsByUser[USER_ID][eventId];
    } else {
      db.rsvpsByUser[USER_ID][eventId] = status;
    }
    save(db);
    await sleep(100);
    return { eventId, userId: USER_ID, status: status === "CANCELLED" ? null : status };
  },

  getMyRsvps() {
    const db = load();
    return db.rsvpsByUser[USER_ID] || {};
  },

  async listCategories() {
    const db = load();
    const cats = Array.from(new Set(db.events.map((e) => e.category))).sort();
    await sleep(60);
    return cats;
  },
};
