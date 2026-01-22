package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.EventDto;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Photo;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.PhotoRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/events")
public class EventApi {

    private final EventRepository repo;
    private final RsvpRepository rsvpRepo;
    private final PhotoRepository photoRepo;
    private final UserRepository users;

    public EventApi(EventRepository repo, RsvpRepository rsvpRepo, PhotoRepository photoRepo, UserRepository users) {
        this.repo = repo;
        this.rsvpRepo = rsvpRepo;
        this.photoRepo = photoRepo;
        this.users = users;
    }

    @Value("${app.jwt.secret:dev-super-secret-change-me}")
    private String jwtSecret;

    // ========= List & search =========

    @GetMapping
    public List<EventDto> list(@RequestParam Optional<String> q,
            @RequestParam Optional<String> category,
            @RequestParam(defaultValue = "asc") String order) {

        Specification<Event> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();

            // Only show APPROVED events on public endpoint
            ps.add(cb.equal(root.get("approvalStatus"), "APPROVED"));

            q.filter(s -> !s.isBlank()).ifPresent(s -> {
                String like = "%" + s.toLowerCase() + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("location")), like)));
            });

            category.filter(s -> !s.isBlank()).ifPresent(s -> {
                ps.add(cb.equal(cb.lower(root.get("category")), s.toLowerCase()));
            });

            if (ps.isEmpty())
                return null;
            return cb.and(ps.toArray(new Predicate[0]));
        };

        Sort sort = "desc".equalsIgnoreCase(order)
                ? Sort.by("startTime").descending()
                : Sort.by("startTime").ascending();

        List<Event> items = (spec == null)
                ? repo.findAll(sort)
                : repo.findAll(spec, sort);

        return items.stream().map(EventDto::from).toList();
    }

    // ========= Get =========

    @GetMapping("/{id}")
    public EventDto get(@PathVariable UUID id) {
        Event ev = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return EventDto.from(ev);
    }

    // ========= Create (any logged-in user) =========

    @PostMapping
    public EventDto create(@RequestBody EventDto dto, HttpServletRequest request) {
        // Require ORGANIZER or ADMIN role to create events
        Map<String, Object> claims = JwtUtil.verify(
                Optional.ofNullable(request.getHeader("Authorization"))
                        .filter(h -> h.startsWith("Bearer "))
                        .map(h -> h.substring("Bearer ".length()).trim())
                        .orElseThrow(
                                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token")),
                jwtSecret);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        if ("ORGANISER".equals(role))
            role = "ORGANIZER"; // accept AU spelling

        Object sub = claims.get("sub");
        if (!(sub instanceof String s) || s.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token subject");
        }
        String email = s.toLowerCase();

        // Use authoritative role from DB in case the JWT is stale (e.g., admin changed
        // role)
        String dbRole = users.findByEmail(email).map(u -> {
            String r = Optional.ofNullable(u.getRole()).orElse("").toUpperCase();
            return "ORGANISER".equals(r) ? "ORGANIZER" : r; // normalize AU spelling
        }).orElse(role);

        if (!"ORGANIZER".equals(dbRole) && !"ADMIN".equals(dbRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only organizers can create events");
        }

        // Basic field validation
        if (dto.startTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime is required");
        }
        if (!dto.startTime.isAfter(java.time.LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event start time must be in the future");
        }

        Event ev = new Event();
        ev.setTitle(dto.title);
        ev.setDescription(dto.description);
        ev.setStartTime(dto.startTime);
        ev.setLocation(dto.location);
        ev.setCategory(dto.category);
        ev.setOrganizerEmail(email); // store creator as organizer
        ev.setApprovalStatus("PENDING"); // New events need admin approval
        ev = repo.save(ev);

        return EventDto.from(ev);
    }

    // ========= Update (any logged-in user for MVP) =========

    @PutMapping("/{id}")
    public EventDto update(@PathVariable UUID id,
            @RequestBody EventDto dto,
            HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        Map<String, Object> claims = JwtUtil.verify(auth.substring("Bearer ".length()).trim(), jwtSecret);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        String actorEmail = Optional.ofNullable((String) claims.get("sub")).orElse("").toLowerCase();

        Event ev = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String organizerEmail = Optional.ofNullable(ev.getOrganizerEmail()).orElse("").toLowerCase();
        boolean isAdmin = "ADMIN".equals(role);
        if (!isAdmin && !organizerEmail.equalsIgnoreCase(actorEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only organizer/admin can update this event");
        }
        // Validate start time (if provided) not in the past
        if (dto.startTime != null && !dto.startTime.isAfter(java.time.LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "event start time must be in the future");
        }
        ev.setTitle(dto.title);
        ev.setDescription(dto.description);
        if (dto.startTime != null)
            ev.setStartTime(dto.startTime);
        ev.setLocation(dto.location);
        ev.setCategory(dto.category);
        ev = repo.save(ev);

        return EventDto.from(ev);
    }

    // ========= Organizer: Get my events (all statuses) =========

    @GetMapping("/my-events")
    public List<EventDto> getMyEvents(HttpServletRequest request) {
        String email = ensureAuthAndGetEmail(request);
        List<Event> events = repo.findByOrganizerEmailIgnoreCase(email);
        return events.stream()
                .sorted((a, b) -> b.getStartTime().compareTo(a.getStartTime())) // Sort by start time desc
                .map(EventDto::from)
                .toList();
    }

    // ========= Delete (cleanup photos + RSVPs first) =========

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id, HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        Map<String, Object> claims = JwtUtil.verify(auth.substring("Bearer ".length()).trim(), jwtSecret);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        String actorEmail = Optional.ofNullable((String) claims.get("sub")).orElse("").toLowerCase();

        Event ev = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String organizerEmail = Optional.ofNullable(ev.getOrganizerEmail()).orElse("").toLowerCase();
        boolean isAdmin = "ADMIN".equals(role);
        if (!isAdmin && !organizerEmail.equalsIgnoreCase(actorEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only organizer/admin can delete this event");
        }

        // 1) Delete photo files + rows
        List<Photo> photos = photoRepo.findByEventIdOrderByCreatedAtAsc(id);
        for (Photo p : photos) {
            try {
                Files.deleteIfExists(Paths.get(p.getStoragePath()));
            } catch (Exception ignored) {
                // best-effort: do not fail the API because of filesystem hiccups
            }
        }
        if (!photos.isEmpty()) {
            photoRepo.deleteAll(photos);
        }

        // 2) Delete RSVPs
        try {
            rsvpRepo.deleteAllByEvent(ev);
        } catch (Exception ignored) {
            // tolerate missing/partial rows to avoid 500s on inconsistent data
        }

        // 3) Delete the event
        repo.delete(ev);

        return ResponseEntity.noContent().build();
    }

    // ========= Helpers =========

    private String ensureAuthAndGetEmail(HttpServletRequest request) {
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
}
