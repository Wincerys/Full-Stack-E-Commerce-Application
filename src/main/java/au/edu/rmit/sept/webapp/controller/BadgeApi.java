package au.edu.rmit.sept.webapp.controller;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import au.edu.rmit.sept.webapp.dto.BadgeDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Badge;
import au.edu.rmit.sept.webapp.repository.BadgeRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.service.BadgeService;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/badges")
public class BadgeApi {

    private final BadgeRepository badgeRepo;
    private final BadgeService badgeService;
    private final UserRepository userRepo;

    public BadgeApi(BadgeRepository badgeRepo, BadgeService badgeService, UserRepository userRepo) {
        this.badgeRepo = badgeRepo;
        this.badgeService = badgeService;
        this.userRepo = userRepo;
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

    /**
     * Get all available badges
     */
    @GetMapping
    public List<BadgeDto> getAllBadges() {
        return badgeRepo.findAll().stream()
                .map(BadgeDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get badges earned by current user
     */
    @GetMapping("/my-badges")
    public List<BadgeDto> getMyBadges(HttpServletRequest request) {
        AppUser user = requireUser(request);
        List<Badge> earnedBadges = badgeService.getEarnedBadges(user);

        return earnedBadges.stream()
                .map(BadgeDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Get badge progress for current user
     */
    @GetMapping("/my-progress")
    public Map<String, BadgeService.BadgeProgress> getMyProgress(HttpServletRequest request) {
        AppUser user = requireUser(request);
        return badgeService.getBadgeProgress(user);
    }

    /**
     * Check and award eligible badges (can be called after RSVP, event creation, etc.)
     */
    @PostMapping("/check-and-award")
    public List<BadgeDto> checkAndAward(HttpServletRequest request) {
        AppUser user = requireUser(request);
        List<Badge> newlyEarned = badgeService.checkAndAwardBadges(user);

        return newlyEarned.stream()
                .map(BadgeDto::from)
                .collect(Collectors.toList());
    }
}