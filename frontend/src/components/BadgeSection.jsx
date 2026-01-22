import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllBadges, getMyBadges, getMyBadgeProgress } from "../services/api";
import BadgeCard from "./BadgeCard";

export default function BadgeSection() {
  const [showAll, setShowAll] = useState(false);

  const { data: allBadges = [], isLoading: allLoading } = useQuery({
    queryKey: ["all-badges"],
    queryFn: getAllBadges,
  });

  const { data: myBadges = [], isLoading: myLoading } = useQuery({
    queryKey: ["my-badges"],
    queryFn: getMyBadges,
  });

  const { data: progress = {}, isLoading: progressLoading } = useQuery({
    queryKey: ["badge-progress"],
    queryFn: getMyBadgeProgress,
  });

  if (allLoading || myLoading || progressLoading) {
    return (
      <div className="card">
        <h3 className="m-0">🏆 Badges</h3>
        <p className="badge" style={{ marginTop: 12 }}>Loading badges…</p>
      </div>
    );
  }

  const earnedBadgeIds = new Set(myBadges.map((b) => b.id));
  const earnedBadges = allBadges.filter((b) => earnedBadgeIds.has(b.id));
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));

  const badgesToShow = showAll ? allBadges : earnedBadges;

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 className="m-0">
          🏆 Badges ({earnedBadges.length}/{allBadges.length})
        </h3>
        <button
          className="btn btn--xs"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Earned Only" : "Show All Badges"}
        </button>
      </div>

      {earnedBadges.length === 0 && !showAll && (
        <div className="empty" style={{ marginBottom: 16 }}>
          <p>
            You haven't earned any badges yet. Keep attending events and
            creating content to unlock achievements!
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {badgesToShow.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            progress={progress[badge.name]}
          />
        ))}
      </div>

      {/* Stats */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f8faff",
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#FFD700" }}>
            {earnedBadges.filter((b) => b.tier === "GOLD").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Gold</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#C0C0C0" }}>
            {earnedBadges.filter((b) => b.tier === "SILVER").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Silver</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#CD7F32" }}>
            {earnedBadges.filter((b) => b.tier === "BRONZE").length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Bronze</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "var(--brand)" }}>
            {earnedBadges.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total</div>
        </div>
      </div>
    </div>
  );
}