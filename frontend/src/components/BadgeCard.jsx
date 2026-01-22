export default function BadgeCard({ badge, progress }) {
  const getTierColor = (tier) => {
    switch (tier) {
      case "GOLD":
        return "#FFD700";
      case "SILVER":
        return "#C0C0C0";
      case "BRONZE":
        return "#CD7F32";
      default:
        return "#e4e6eb";
    }
  };

  const getTierGradient = (tier) => {
    switch (tier) {
      case "GOLD":
        return "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
      case "SILVER":
        return "linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 100%)";
      case "BRONZE":
        return "linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)";
      default:
        return "linear-gradient(135deg, #e4e6eb 0%, #d0d2d7 100%)";
    }
  };

  const isEarned = !progress || progress.earned;
  const percentage = progress?.percentage || 100;

  return (
    <div
      className="badge-card"
      style={{
        background: isEarned ? getTierGradient(badge.tier) : "#f5f6f7",
        border: `2px solid ${isEarned ? getTierColor(badge.tier) : "#ddd"}`,
        borderRadius: 12,
        padding: 16,
        textAlign: "center",
        position: "relative",
        opacity: isEarned ? 1 : 0.6,
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      title={badge.description}
      onMouseEnter={(e) => {
        if (isEarned) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: 48,
          marginBottom: 8,
          filter: isEarned ? "none" : "grayscale(100%)",
        }}
      >
        {badge.icon}
      </div>

      {/* Name */}
      <div
        style={{
          fontWeight: "bold",
          fontSize: 14,
          color: isEarned ? "#fff" : "#666",
          marginBottom: 4,
          textShadow: isEarned ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {badge.name}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: isEarned ? "rgba(255,255,255,0.9)" : "#888",
          marginBottom: 8,
          textShadow: isEarned ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
        }}
      >
        {badge.description}
      </div>

      {/* Progress bar (if not earned) */}
      {!isEarned && progress && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              background: "#e0e0e0",
              borderRadius: 999,
              height: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "var(--brand)",
                height: "100%",
                width: `${percentage}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {progress.currentValue} / {progress.criteriaValue}
          </div>
        </div>
      )}

      {/* Tier badge */}
      {isEarned && (
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
            textTransform: "uppercase",
          }}
        >
          {badge.tier}
        </div>
      )}
    </div>
  );
}