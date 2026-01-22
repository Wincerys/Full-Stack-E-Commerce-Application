package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
public class ExportApi {

    private final RsvpRepository rsvpRepository;
    private final EventRepository eventRepository;

    public ExportApi(RsvpRepository rsvpRepository, EventRepository eventRepository) {
        this.rsvpRepository = rsvpRepository;
        this.eventRepository = eventRepository;
    }

    @GetMapping("/{eventId}/attendees/export")
    public ResponseEntity<byte[]> exportAttendees(@PathVariable UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event == null) {
            return ResponseEntity.notFound().build();
        }

        List<Rsvp> rsvps = rsvpRepository.findByEvent_Id(eventId);
        if (rsvps.isEmpty()) {
            return ResponseEntity.noContent().build(); // 204 — per AC, no empty file
        }

        String filename = makeFileName(event);

        StringBuilder sb = new StringBuilder();
        sb.append("Name,Email,RSVP Status\n");
        for (Rsvp r : rsvps) {
            AppUser u = r.getUser();
            String name = u != null ? safe(u.getName()) : "";
            String email = u != null ? safe(u.getEmail()) : "";
            String status = r.getStatus() != null ? r.getStatus().name() : "";
            sb.append(csv(name)).append(',')
              .append(csv(email)).append(',')
              .append(csv(status)).append('\n');
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(filename))
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private static String safe(String s) { return s == null ? "" : s; }

    // RFC 4180 escaping
    private static String csv(String field) {
        if (field == null) return "";
        boolean needs = field.contains(",") || field.contains("\"") || field.contains("\n") || field.contains("\r");
        String v = field.replace("\"", "\"\"");
        return needs ? "\"" + v + "\"" : v;
    }

    private static String makeFileName(Event e) {
        String title = e.getTitle() == null ? "" : e.getTitle().trim().toLowerCase().replaceAll("[^a-z0-9]+", "-");
        if (title.isBlank()) title = "event";
        return "attendees-" + title + ".csv";
    }

    private static String contentDisposition(String filename) {
        String ascii = filename.replaceAll("[\\r\\n]", "").replaceAll("[^\\x20-\\x7E]", "_");
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + ascii + "\"; filename*=UTF-8''" + encoded;
    }
}
