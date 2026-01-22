package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.UserDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.AuditLog;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
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
@RequestMapping("/api/admin")
public class AdminApi {

    private final UserRepository userRepo;
    private final EventRepository eventRepo;
    private final RsvpRepository rsvpRepo;
    private final PhotoRepository photoRepo;
    private final AuditLogRepository auditRepo;

    public AdminApi(UserRepository userRepo,
            EventRepository eventRepo,
            RsvpRepository rsvpRepo,
            PhotoRepository photoRepo,
            AuditLogRepository auditRepo) {
        this.userRepo = userRepo;
        this.eventRepo = eventRepo;
        this.rsvpRepo = rsvpRepo;
        this.photoRepo = photoRepo;
        this.auditRepo = auditRepo;
    }

    @Value("${app.jwt.secret:dev-super-secret-change-me}")
    private String jwtSecret;

    // --- helpers ---
    private Map<String, Object> verify(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        String token = auth.substring("Bearer ".length()).trim();
        return JwtUtil.verify(token, jwtSecret);
    }

    private UUID requireAdmin(HttpServletRequest request) {
        Map<String, Object> claims = verify(request);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        if (!"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin only");
        }
        String subEmail = String.valueOf(claims.get("sub"));
        if (subEmail == null || subEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token subject");
        }
        AppUser u = userRepo.findByEmail(subEmail.toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));
        return u.getId();
    }

    private void log(UUID actorId, String action, UUID subjectId, String meta) {
        AuditLog log = new AuditLog();
        log.setActorUserId(actorId);
        log.setAction(action);
        log.setSubjectId(subjectId);
        log.setMeta(meta);
        auditRepo.save(log);
    }

    // --- USERS ---

    @GetMapping("/users")
    public List<UserDto> listUsers(HttpServletRequest request) {
        requireAdmin(request);
        return userRepo.findAll().stream().map(UserDto::from).toList();
    }

    public record ActiveBody(boolean active) {
    }

    @PatchMapping("/users/{id}/active")
    public UserDto setActive(HttpServletRequest request, @PathVariable UUID id, @RequestBody ActiveBody body) {
        UUID actor = requireAdmin(request);
        AppUser u = userRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setActive(body != null && body.active());
        userRepo.save(u);
        log(actor, "USER_DEACTIVATE", id, "{\"active\":" + u.isActive() + "}");
        return UserDto.from(u);
    }

    public record BanBody(boolean banned) {
    }

    @PatchMapping("/users/{id}/ban")
    public UserDto setBanned(HttpServletRequest request, @PathVariable UUID id, @RequestBody BanBody body) {
        UUID actor = requireAdmin(request);
        AppUser u = userRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        u.setBanned(body != null && body.banned());
        userRepo.save(u);
        log(actor, "USER_BAN", id, "{\"banned\":" + u.isBanned() + "}");
        return UserDto.from(u);
    }

    public record RoleBody(String role) {
    }

    @PatchMapping("/users/{id}/role")
    public UserDto setRole(HttpServletRequest request, @PathVariable UUID id, @RequestBody RoleBody body) {
        UUID actor = requireAdmin(request);
        if (body == null || body.role == null || body.role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role required");
        }
        AppUser u = userRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String role = body.role().trim().toUpperCase();
        if ("USER".equals(role))
            role = "STUDENT"; // normalize old label
        if ("ORGANISER".equals(role))
            role = "ORGANIZER"; // normalize AU spelling
        if (!java.util.Set.of("STUDENT", "ORGANIZER", "ADMIN").contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "invalid role. Valid roles: STUDENT, ORGANIZER, ADMIN");
        }
        u.setRole(role);
        userRepo.save(u);
        log(actor, "USER_ROLE", id, "{\"role\":\"" + u.getRole() + "\"}");
        return UserDto.from(u);
    }

    // --- EVENTS moderation ---

    @GetMapping("/events")
    public List<Event> listEventsForModeration(HttpServletRequest request,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query) {
        requireAdmin(request);
        String st = status == null || status.isBlank() ? "" : status.trim().toUpperCase();
        List<Event> base = switch (st) {
            case "PENDING" -> eventRepo.findByApprovalStatusOrderByStartTimeAsc("PENDING");
            case "APPROVED" -> eventRepo.findByApprovalStatusOrderByStartTimeAsc("APPROVED");
            case "REJECTED" -> eventRepo.findByApprovalStatusOrderByStartTimeAsc("REJECTED");
            default -> eventRepo.findAllByOrderByStartTimeAsc();
        };
        if (query == null || query.isBlank())
            return base;
        String q = query.toLowerCase();
        return base.stream().filter(e -> (e.getTitle() != null && e.getTitle().toLowerCase().contains(q)) ||
                (e.getCategory() != null && e.getCategory().toLowerCase().contains(q))).toList();
    }

    @PostMapping("/events/{id}/approve")
    public Event approveEvent(HttpServletRequest request, @PathVariable UUID id) {
        UUID actor = requireAdmin(request);
        Event e = eventRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        e.setApprovalStatus("APPROVED");
        e.setRejectionReason(null);
        eventRepo.save(e);
        log(actor, "EVENT_APPROVE", id, null);
        return e;
    }

    public record RejectBody(String reason) {
    }

    @PostMapping("/events/{id}/reject")
    public Event rejectEvent(HttpServletRequest request, @PathVariable UUID id, @RequestBody RejectBody body) {
        UUID actor = requireAdmin(request);
        Event e = eventRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        e.setApprovalStatus("REJECTED");
        e.setRejectionReason(body != null ? body.reason() : null);
        eventRepo.save(e);
        log(actor, "EVENT_REJECT", id, body != null ? "{\"reason\":\"" + body.reason() + "\"}" : null);
        return e;
    }

    @DeleteMapping("/events/{id}")
    public void deleteEvent(HttpServletRequest request, @PathVariable UUID id) {
        UUID actor = requireAdmin(request);
        Event e = eventRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        // Cascade clean-up if not already configured:
        rsvpRepo.deleteAll(rsvpRepo.findByEventId(id));
        photoRepo.deleteAll(photoRepo.findByEventId(id));
        eventRepo.delete(e);
        log(actor, "EVENT_DELETE", id, null);
    }

    // --- ADMIN Event editing ---

    public record EventEditBody(String title, String description, LocalDateTime startTime, String location,
            String category) {
    }

    @PutMapping("/events/{id}")
    public Event editEvent(HttpServletRequest request, @PathVariable UUID id, @RequestBody EventEditBody body) {
        UUID actor = requireAdmin(request);
        Event e = eventRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (body.title != null && !body.title.isBlank())
            e.setTitle(body.title);
        if (body.description != null)
            e.setDescription(body.description);
        if (body.startTime != null)
            e.setStartTime(body.startTime);
        if (body.location != null && !body.location.isBlank())
            e.setLocation(body.location);
        if (body.category != null && !body.category.isBlank())
            e.setCategory(body.category);
        eventRepo.save(e);
        log(actor, "EVENT_EDIT", id, null);
        return e;
    }

    // --- USER Management enhancements ---

    @GetMapping("/users/search")
    public List<UserDto> searchUsers(HttpServletRequest request,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {
        requireAdmin(request);
        List<AppUser> allUsers = userRepo.findAll();

        return allUsers.stream()
                .filter(u -> {
                    // Search filter
                    if (q != null && !q.isBlank()) {
                        String query = q.toLowerCase();
                        boolean matchesEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(query);
                        boolean matchesName = u.getName() != null && u.getName().toLowerCase().contains(query);
                        if (!matchesEmail && !matchesName)
                            return false;
                    }
                    // Role filter
                    if (role != null && !role.isBlank() && !role.equalsIgnoreCase(u.getRole())) {
                        return false;
                    }
                    // Status filter (active/banned)
                    if (status != null && !status.isBlank()) {
                        if ("active".equalsIgnoreCase(status) && (!u.isActive() || u.isBanned())) {
                            return false;
                        }
                        if ("banned".equalsIgnoreCase(status) && !u.isBanned()) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(UserDto::from)
                .toList();
    }

    @GetMapping("/users/{id}/events")
    public List<Event> getUserEvents(HttpServletRequest request, @PathVariable UUID id) {
        requireAdmin(request);
        AppUser user = userRepo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return eventRepo.findByOrganizerEmailIgnoreCase(user.getEmail());
    }

    @GetMapping("/users/{id}/rsvps")
    public List<Rsvp> getUserRsvps(HttpServletRequest request, @PathVariable UUID id) {
        requireAdmin(request);
        return rsvpRepo.findByUserId(id);
    }

    // --- Analytics (enhanced) ---

    public record Counts(long users, long eventsTotal, long eventsApproved, long eventsPending, long rsvpsTotal) {
    }

    @GetMapping("/analytics/counts")
    public Counts counts(HttpServletRequest request) {
        requireAdmin(request);

        long users = userRepo.count();
        long total = eventRepo.count();
        long approved = eventRepo.countByApprovalStatus("APPROVED");
        long pending = eventRepo.countByApprovalStatus("PENDING");
        long rsvps = rsvpRepo.count();

        return new Counts(users, total, approved, pending, rsvps);
    }

    public record PopularEvent(UUID id, String title, long rsvpCount) {
    }

    @GetMapping("/analytics/popular-events")
    public List<PopularEvent> popularEvents(HttpServletRequest request,
            @RequestParam(defaultValue = "10") int limit) {
        requireAdmin(request);

        // Get all approved events with RSVP counts
        List<Event> approvedEvents = eventRepo.findByApprovalStatusOrderByStartTimeAsc("APPROVED");

        return approvedEvents.stream()
                .map(e -> {
                    long count = rsvpRepo.findByEventId(e.getId()).size();
                    return new PopularEvent(e.getId(), e.getTitle(), count);
                })
                .sorted((a, b) -> Long.compare(b.rsvpCount(), a.rsvpCount()))
                .limit(limit)
                .toList();
    }

    public record ActivityRecord(LocalDateTime timestamp, String action, String description) {
    }

    @GetMapping("/analytics/recent-activity")
    public List<ActivityRecord> recentActivity(HttpServletRequest request,
            @RequestParam(defaultValue = "20") int limit) {
        requireAdmin(request);

        // Get recent audit logs
        List<AuditLog> logs = auditRepo.findAll()
                .stream()
                .sorted((a, b) -> b.getTs().compareTo(a.getTs()))
                .limit(limit)
                .toList();

        return logs.stream()
                .map(log -> new ActivityRecord(
                        LocalDateTime.ofInstant(log.getTs(), java.time.ZoneId.systemDefault()),
                        log.getAction(),
                        log.getMeta() != null ? log.getMeta() : ""))
                .toList();
    }

    public record OrganizerStats(String email, String name, long eventsCreated, long totalRsvps) {
    }

    @GetMapping("/analytics/organizer-leaderboard")
    public List<OrganizerStats> organizerLeaderboard(HttpServletRequest request,
            @RequestParam(defaultValue = "10") int limit) {
        requireAdmin(request);

        // Get all organizers (users who created events)
        List<Event> allEvents = eventRepo.findAll();
        Map<String, OrganizerStats> statsMap = new HashMap<>();

        for (Event e : allEvents) {
            String email = e.getOrganizerEmail();
            if (email == null || email.isBlank())
                continue;

            statsMap.putIfAbsent(email, createOrganizerStats(email));
            OrganizerStats existing = statsMap.get(email);
            long rsvpCount = rsvpRepo.findByEventId(e.getId()).size();
            statsMap.put(email, new OrganizerStats(
                    existing.email(),
                    existing.name(),
                    existing.eventsCreated() + 1,
                    existing.totalRsvps() + rsvpCount));
        }

        return statsMap.values().stream()
                .sorted((a, b) -> Long.compare(b.totalRsvps(), a.totalRsvps()))
                .limit(limit)
                .toList();
    }

    private OrganizerStats createOrganizerStats(String email) {
        Optional<AppUser> user = userRepo.findByEmail(email);
        String name = user.map(AppUser::getName).orElse(email);
        return new OrganizerStats(email, name, 0L, 0L);
    }
}
