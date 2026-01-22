package au.edu.rmit.sept.webapp.dto;

import au.edu.rmit.sept.webapp.model.Photo;

import java.time.Instant;
import java.util.UUID;

public class PhotoDto {
    public UUID id;
    public UUID eventId;
    public String url;          // /api/photos/{id}/raw
    public String contentType;  // image/jpeg | image/png
    public long sizeBytes;
    public String originalFilename;
    public Instant createdAt;

    public static PhotoDto from(Photo p) {
        PhotoDto dto = new PhotoDto();
        dto.id = p.getId();
        dto.eventId = p.getEvent().getId();
        dto.url = "/api/photos/" + p.getId() + "/raw";
        dto.contentType = p.getContentType();
        dto.sizeBytes = p.getSizeBytes();
        dto.originalFilename = p.getOriginalFilename();
        dto.createdAt = p.getCreatedAt();
        return dto;
    }
}
