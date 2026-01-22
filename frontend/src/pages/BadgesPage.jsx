import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAllBadges, getMyBadges, getMyBadgeProgress, isAuthed } from "../services/api";

function BadgeCard({ badge, earned = false, progress = null }) {
  const getTierColor = (tier) => {
    switch (tier) {
      case "GOLD": return "#FFD700";
      case "SILVER": return "#C0C0C0";
      case "BRONZE": return "#CD7F32";
      default: return "#e4e6eb";
    }
  };

  const getTierGradient = (tier) => {
    switch (tier) {
      case "GOLD": return "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
      case "SILVER": return "linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 100%)";
      case "BRONZE": return "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)";
      default: return "linear-gradient(135deg, #e4e6eb 0%, #d0d2d7 100%)";
    }
  };

  return (
    <div
      style={{
        background: earned ? getTierGradient(badge.tier) : "#f5f6f7",
        border: `2px solid ${earned ? getTierColor(badge.tier) : "#ddd"}`,
        borderRadius: 12,
        padding: 16,
        textAlign: "center",
        position: "relative",
        opacity: earned ? 1 : 0.6,
        transition: "all 0.3s ease",
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 48, filter: earned ? "none" : "grayscale(100%)" }}>
        {badge.icon}
      </div>

      {/* Name */}
      <div
        style={{
          fontWeight: "bold",
          fontSize: 14,
          color: earned ? "#fff" : "#666",
          marginBottom: 4,
          textShadow: earned ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {badge.name}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: earned ? "rgba(255,255,255,0.9)" : "#888",
          marginBottom: 8,
          textShadow: earned ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {badge.description}
      </div>

      {/* Progress bar (if not earned) */}
      {!earned && progress && (
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              background: "#e0e0e0",
              borderRadius: 999,
              height: 6,
              overflow: "hidden",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                background: "var(--brand)",
                height: "100%",
                width: `${progress.percentage}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#666" }}>
            {progress.currentValue} / {progress.criteriaValue}
          </div>
        </div>
      )}

      {/* Tier badge */}
      {earned && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(0,0,0,0.3)",
            color: "white",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: "bold",
          }}
        >
          {badge.tier}
        </div>
      )}
    </div>
  );
}

export default function BadgesPage() {
  const [filter, setFilter] = useState("all"); // all, earned, locked
  const authed = isAuthed();

  const { data: allBadges = [], isLoading: allLoading } = useQuery({
    queryKey: ["all-badges"],
    queryFn: getAllBadges,
  });

  const { data: myBadges = [], isLoading: myLoading } = useQuery({
    queryKey: ["my-badges"],
    queryFn: getMyBadges,
    enabled: authed,
  });

  const { data: progress = {}, isLoading: progressLoading } = useQuery({
    queryKey: ["badge-progress"],
    queryFn: getMyBadgeProgress,
    enabled: authed,
  });

  if (allLoading || (authed && (myLoading || progressLoading))) {
    return (
      <section className="container">
        <p className="badge">Loading badges...</p>
      </section>
    );
  }

  const earnedBadgeIds = new Set(myBadges.map((b) => b.id));
  const earnedBadges = allBadges.filter((b) => earnedBadgeIds.has(b.id));
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));

  const badgesToShow =
    filter === "earned"
      ? earnedBadges
      : filter === "locked"
      ? lockedBadges
      : allBadges;

  // Group by tier
  const goldBadges = earnedBadges.filter((b) => b.tier === "GOLD");
  const silverBadges = earnedBadges.filter((b) => b.tier === "SILVER");
  const bronzeBadges = earnedBadges.filter((b) => b.tier === "BRONZE");

  return (
    <section className="container" style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Badge Collection</h1>
        <p className="card__meta">
          {authed
            ? `You've earned ${earnedBadges.length} out of ${allBadges.length} badges!`
            : "Login to start earning badges"}
        </p>
      </div>

      {/* Stats Card (if logged in) */}
      {authed && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="m-0" style={{ marginBottom: 12 }}>
            Your Badge Stats
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 16,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "#FFD700" }}>
                {goldBadges.length}
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Gold</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "#C0C0C0" }}>
                {silverBadges.length}
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Silver</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#CD7F32" }}>
              <div>{bronzeBadges.length}</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Bronze</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "var(--brand)" }}>
                {earnedBadges.length}
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Total</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: "bold", color: "#888" }}>
                {lockedBadges.length}
              </div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>Locked</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          className={`btn ${filter === "all" ? "btn--primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Badges ({allBadges.length})
        </button>
        {authed && (
          <>
            <button
              className={`btn ${filter === "earned" ? "btn--primary" : ""}`}
              onClick={() => setFilter("earned")}
            >
              Earned ({earnedBadges.length})
            </button>
            <button
              className={`btn ${filter === "locked" ? "btn--primary" : ""}`}
              onClick={() => setFilter("locked")}
            >
              Locked ({lockedBadges.length})
            </button>
          </>
        )}
      </div>

      {/* Not logged in message */}
      {!authed && (
        <div className="card" style={{ marginBottom: 24, textAlign: "center" }}>
          <p>
            <Link to="/login" style={{ color: "var(--brand)" }}>
              Login
            </Link>{" "}
            to track your badge progress and see which badges you've earned!
          </p>
        </div>
      )}

      {/* Badge Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        {badgesToShow.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned={earnedBadgeIds.has(badge.id)}
            progress={progress[badge.name]}
          />
        ))}
      </div>

      {/* Empty state */}
      {badgesToShow.length === 0 && (
        <div className="empty">
          <p>
            {filter === "earned"
              ? "You haven't earned any badges yet. Start attending events!"
              : "No badges to show."}
          </p>
        </div>
      )}
    </section>
  );
}