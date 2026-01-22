package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.FeedbackDto;
import au.edu.rmit.sept.webapp.model.*;
import au.edu.rmit.sept.webapp.repository.*;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api")
public class FeedbackApi {

    private final FeedbackRepository feedbackRepo;
    private final UserRepository userRepo;
    private final EventRepository eventRepo;
    private final RsvpRepository rsvpRepo;

    public FeedbackApi(
            FeedbackRepository feedbackRepo,
            UserRepository userRepo,
            EventRepository eventRepo,
            RsvpRepository rsvpRepo
    ) {
        this.feedbackRepo = feedbackRepo;
        this.userRepo = userRepo;
        this.eventRepo = eventRepo;
        this.rsvpRepo = rsvpRepo;
    }

    @Value("${app.jwt.secret:dev-super-secret-change-me}")
    private String jwtSecret;

    private String requireEmail(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        String token = auth.substring("Bearer ".length()).trim();
        Map<String, Object> claims = JwtUtil.verify(token, jwtSecret);
        Object sub = claims.get("sub");
        if (!(sub instanceof String s) || s.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token");
        }
        return s.toLowerCase();
    }

    private AppUser getOrCreateUser(String email) {
        return userRepo.findByEmail(email).orElseGet(() -> {
            AppUser u = new AppUser();
            u.setEmail(email);
            u.setName(email);
            u.setRole("STUDENT");
            return userRepo.save(u);
        });
    }

    private void ensureOrganizer(HttpServletRequest req, Event ev) {
        String userEmail = requireEmail(req);
        String organizerEmail = Optional.ofNullable(ev.getOrganizerEmail()).orElse("").toLowerCase();
        if (!organizerEmail.equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "organizer/admin only");
        }
    }

    // ====== Attendee create/update (upsert) ======
    public static class UpsertBody {
        public UUID eventId;
        public Integer rating;     // 1..5
        public String comment;     // optional
    }

    @PostMapping("/feedback")
    public FeedbackDto upsertFeedback(HttpServletRequest request, @RequestBody UpsertBody body) {
        String email = requireEmail(request);

        if (body == null || body.eventId == null || body.rating == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventId and rating required");
        }
        if (body.rating < 1 || body.rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating must be 1..5");
        }
        if (body.comment != null && body.comment.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "comment too long (max 1000)");
        }

        Event ev = eventRepo.findById(body.eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "event not found"));

        // Must be after event end
        if (ev.getStartTime() == null || !ev.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "feedback allowed only after event end");
        }

        AppUser me = getOrCreateUser(email);

        // Must have RSVP
        boolean hasRsvp = rsvpRepo.findByUserAndEvent(me, ev).isPresent();
        if (!hasRsvp) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "RSVP required");
        }

        // Upsert
        Feedback f = feedbackRepo.findByUserAndEvent(me, ev).orElseGet(() -> {
            Feedback x = new Feedback();
            x.setUser(me);
            x.setEvent(ev);
            x.setCreatedAt(LocalDateTime.now());
            return x;
        });
        f.setRating(body.rating);
        f.setComment(body.comment == null ? null : body.comment.trim());
        f.setUpdatedAt(LocalDateTime.now());

        return FeedbackDto.from(feedbackRepo.save(f));
    }

    // Optional helper to prefill attendee form
    @GetMapping("/feedback/my")
    public FeedbackDto myFeedback(HttpServletRequest request, @RequestParam UUID eventId) {
        String email = requireEmail(request);
        Event ev = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "event not found"));
        AppUser me = userRepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        return feedbackRepo.findByUserAndEvent(me, ev).map(FeedbackDto::from).orElse(null);
    }

    // Organizer-only listing for an event
    @GetMapping("/events/{eventId}/feedback")
    public List<FeedbackDto> listForEvent(@PathVariable UUID eventId, HttpServletRequest request) {
        Event ev = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "event not found"));
        ensureOrganizer(request, ev);
        return feedbackRepo.findByEventOrderByCreatedAtDesc(ev).stream()
                .map(FeedbackDto::from)
                .toList();
    }
}
