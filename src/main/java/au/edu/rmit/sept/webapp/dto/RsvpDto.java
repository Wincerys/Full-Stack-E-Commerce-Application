package au.edu.rmit.sept.webapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class RsvpDto {
    private UUID id;
    private UUID userId;
    private UUID eventId;
    private String status; // "GOING" | "INTERESTED"
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public RsvpDto() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getEventId() { return eventId; }
    public void setEventId(UUID eventId) { this.eventId = eventId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
