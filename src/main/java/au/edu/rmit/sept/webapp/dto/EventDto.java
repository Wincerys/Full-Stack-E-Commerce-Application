package au.edu.rmit.sept.webapp.dto;

import au.edu.rmit.sept.webapp.model.Event;

import java.time.LocalDateTime;
import java.util.UUID;

public class EventDto {
    // Public fields so EventApi can use dto.title, dto.description, etc.
    public UUID id;
    public String title;
    public String description;
    public LocalDateTime startTime;
    public String location;
    public String category;

    // Optional (used by gallery auth demo; safe to include even if unused on FE)
    public String organizerEmail;

    // Approval workflow fields
    public String approvalStatus;
    public String rejectionReason;

    // Mapper: Entity -> DTO
    public static EventDto from(Event e) {
        EventDto d = new EventDto();
        if (e == null)
            return d;
        d.id = e.getId();
        d.title = e.getTitle();
        d.description = e.getDescription();
        d.startTime = e.getStartTime();
        d.location = e.getLocation();
        d.category = e.getCategory();
        d.organizerEmail = e.getOrganizerEmail();
        d.approvalStatus = e.getApprovalStatus();
        d.rejectionReason = e.getRejectionReason();
        return d;
    }

    // Helper: DTO -> (existing) Entity
    public Event toEntity(Event target) {
        Event t = (target != null) ? target : new Event();
        t.setTitle(title);
        t.setDescription(description);
        t.setStartTime(startTime);
        t.setLocation(location);
        t.setCategory(category);
        if (organizerEmail != null) {
            t.setOrganizerEmail(organizerEmail);
        }
        return t;
    }
}
