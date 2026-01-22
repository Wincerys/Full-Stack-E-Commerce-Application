package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.EventDto;
import au.edu.rmit.sept.webapp.dto.RsvpDto;
import au.edu.rmit.sept.webapp.dto.UserDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profile")
public class ProfileApi {

    private final UserRepository userRepo;
    private final EventRepository eventRepo;
    private final RsvpRepository rsvpRepo;

    public ProfileApi(UserRepository userRepo, EventRepository eventRepo, RsvpRepository rsvpRepo) {
        this.userRepo = userRepo;
        this.eventRepo = eventRepo;
        this.rsvpRepo = rsvpRepo;
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

    private AppUser requireUser(HttpServletRequest request) {
        String email = requireEmail(request);
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));
    }

    @GetMapping("/me")
    public UserDto getMyProfile(HttpServletRequest request) {
        AppUser user = requireUser(request);
        return UserDto.from(user);
    }

    @PutMapping("/me")
    public UserDto updateMyProfile(HttpServletRequest request, @RequestBody UpdateProfileRequest updateRequest) {
        AppUser user = requireUser(request);
        
        if (updateRequest.name != null && !updateRequest.name.trim().isEmpty()) {
            user.setName(updateRequest.name.trim());
        }
        
        user = userRepo.save(user);
        return UserDto.from(user);
    }

    @GetMapping("/my-events")
    public List<EventDto> getMyEvents(HttpServletRequest request,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "10") int size) {
        String email = requireEmail(request);
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("startTime").descending());
        List<Event> events = eventRepo.findByOrganizerEmailOrderByStartTimeDesc(email, pageRequest);
        
        return events.stream().map(EventDto::from).toList();
    }

    @GetMapping("/event/{eventId}/rsvps")
    public List<RsvpWithUserDto> getEventRsvps(HttpServletRequest request, @PathVariable UUID eventId) {
        String organizerEmail = requireEmail(request);
        
        // Verify the user is the organizer of this event
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "event not found"));
        
        if (!organizerEmail.equalsIgnoreCase(event.getOrganizerEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "only organizer can view RSVPs");
        }
        
        List<Rsvp> rsvps = rsvpRepo.findByEvent(event);
        
        return rsvps.stream().map(rsvp -> {
            RsvpWithUserDto dto = new RsvpWithUserDto();
            dto.id = rsvp.getId();
            dto.status = rsvp.getStatus().name();
            dto.createdAt = rsvp.getCreatedAt();
            dto.updatedAt = rsvp.getUpdatedAt();
            dto.user = UserDto.from(rsvp.getUser());
            return dto;
        }).collect(Collectors.toList());
    }

    public static class UpdateProfileRequest {
        public String name;
    }

    public static class RsvpWithUserDto {
        public UUID id;
        public String status;
        public java.time.LocalDateTime createdAt;
        public java.time.LocalDateTime updatedAt;
        public UserDto user;
    }
}