package au.edu.rmit.sept.webapp.dto;

import au.edu.rmit.sept.webapp.model.Feedback;

import java.time.LocalDateTime;
import java.util.UUID;

public class FeedbackDto {
    public UUID id;
    public UUID userId;
    public UUID eventId;
    public int rating;           // 1..5
    public String comment;       // <= 1000
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    // Minimal organizer hint (optional): include user name/email if you later want to show in dashboard.
    public String userName;
    public String userEmail;

    public static FeedbackDto from(Feedback f) {
        FeedbackDto d = new FeedbackDto();
        d.id = f.getId();
        d.userId = f.getUser().getId();
        d.eventId = f.getEvent().getId();
        d.rating = f.getRating();
        d.comment = f.getComment();
        d.createdAt = f.getCreatedAt();
        d.updatedAt = f.getUpdatedAt();
        d.userName = f.getUser().getName();
        d.userEmail = f.getUser().getEmail();
        return d;
    }
}
