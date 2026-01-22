package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.RsvpDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.model.RsvpStatus;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rsvps")
public class RsvpApi {

    private final RsvpRepository rsvpRepo;
    private final UserRepository userRepo;
    private final EventRepository eventRepo;

    public RsvpApi(RsvpRepository rsvpRepo, UserRepository userRepo, EventRepository eventRepo) {
        this.rsvpRepo = rsvpRepo;
        this.userRepo = userRepo;
        this.eventRepo = eventRepo;
    }

    @Value("${app.jwt.secret:dev-secret-please-change}")
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

    private static RsvpDto toDto(Rsvp r) {
        RsvpDto d = new RsvpDto();
        d.setId(r.getId());
        d.setUserId(r.getUser().getId());
        d.setEventId(r.getEvent().getId());
        d.setStatus(r.getStatus().name());
        d.setCreatedAt(r.getCreatedAt());
        d.setUpdatedAt(r.getUpdatedAt());
        return d;
    }

    @GetMapping("/my")
    public List<RsvpDto> myRsvps(HttpServletRequest request) {
        String email = requireEmail(request);
        AppUser me = userRepo.findByEmail(email).orElse(null);
        if (me == null) return List.of();
        return rsvpRepo.findByUser(me).stream().map(RsvpApi::toDto).toList();
    }

    public static class UpsertBody {
        public UUID eventId;
        public String status; // GOING | INTERESTED
    }

    @PostMapping
    public RsvpDto upsert(HttpServletRequest request, @RequestBody UpsertBody body) {
        String email = requireEmail(request);
        if (body == null || body.eventId == null || body.status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "eventId and status required");
        }
        RsvpStatus st;
        try { st = RsvpStatus.valueOf(body.status); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid status"); }

        Event ev = eventRepo.findById(body.eventId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        AppUser me = getOrCreateUser(email);

        Rsvp r = rsvpRepo.findByUserAndEvent(me, ev).orElseGet(() -> {
            Rsvp x = new Rsvp();
            x.setUser(me);
            x.setEvent(ev);
            x.setCreatedAt(LocalDateTime.now());
            return x;
        });
        r.setStatus(st);
        r.setUpdatedAt(LocalDateTime.now());
        r = rsvpRepo.save(r);
        return toDto(r);
    }

    @DeleteMapping("/by-event/{eventId}")
    public void deleteMyRsvp(HttpServletRequest request, @PathVariable UUID eventId) {
        String email = requireEmail(request);
        AppUser me = userRepo.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
        Event ev = eventRepo.findById(eventId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "event not found"));
        rsvpRepo.findByUserAndEvent(me, ev).ifPresent(rsvpRepo::delete);
    }
}
