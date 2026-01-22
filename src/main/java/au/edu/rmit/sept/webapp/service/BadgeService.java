package au.edu.rmit.sept.webapp.service;

import au.edu.rmit.sept.webapp.model.*;
import au.edu.rmit.sept.webapp.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BadgeService {

    private final BadgeRepository badgeRepo;
    private final UserBadgeRepository userBadgeRepo;
    private final RsvpRepository rsvpRepo;
    private final EventRepository eventRepo;
    private final UserRepository userRepo;

    public BadgeService(BadgeRepository badgeRepo, 
                       UserBadgeRepository userBadgeRepo,
                       RsvpRepository rsvpRepo, 
                       EventRepository eventRepo,
                       UserRepository userRepo) {
        this.badgeRepo = badgeRepo;
        this.userBadgeRepo = userBadgeRepo;
        this.rsvpRepo = rsvpRepo;
        this.eventRepo = eventRepo;
        this.userRepo = userRepo;
    }

    /**
     * Get all badges a user has earned (calculate on-the-fly)
     */
    public List<Badge> getEarnedBadges(AppUser user) {
        List<Badge> earnedBadges = new ArrayList<>();
        List<Badge> allBadges = badgeRepo.findAll();

        for (Badge badge : allBadges) {
            if (hasEarnedBadge(user, badge)) {
                earnedBadges.add(badge);
            }
        }

        return earnedBadges;
    }

    /**
     * Check if user has earned a specific badge
     */
    public boolean hasEarnedBadge(AppUser user, Badge badge) {
        String criteriaType = badge.getCriteriaType();
        int criteriaValue = badge.getCriteriaValue();

        switch (criteriaType) {
            case "RSVP_COUNT":
                long rsvpCount = rsvpRepo.countByUser(user);
                return rsvpCount >= criteriaValue;

            case "RSVP_GOING_COUNT":
                long goingCount = rsvpRepo.countByUserAndStatus(user, RsvpStatus.GOING);
                return goingCount >= criteriaValue;

            case "EVENT_CREATED":
                long eventsCreated = eventRepo.countByOrganizerEmailIgnoreCase(user.getEmail());
                return eventsCreated >= criteriaValue;

            case "ACCOUNT_AGE_DAYS":
                long accountAge = ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now());
                return accountAge >= criteriaValue;

            default:
                return false;
        }
    }

    /**
     * Get badge progress for a user (how close they are to earning each badge)
     */
    public Map<String, BadgeProgress> getBadgeProgress(AppUser user) {
        Map<String, BadgeProgress> progress = new HashMap<>();
        List<Badge> allBadges = badgeRepo.findAll();

        for (Badge badge : allBadges) {
            BadgeProgress bp = new BadgeProgress();
            bp.badgeName = badge.getName();
            bp.criteriaValue = badge.getCriteriaValue();
            bp.currentValue = getCurrentValue(user, badge);
            bp.earned = bp.currentValue >= bp.criteriaValue;
            bp.percentage = Math.min(100, (int) ((bp.currentValue * 100.0) / bp.criteriaValue));

            progress.put(badge.getName(), bp);
        }

        return progress;
    }

    /**
     * Get current value for a badge's criteria
     */
    private long getCurrentValue(AppUser user, Badge badge) {
        String criteriaType = badge.getCriteriaType();

        switch (criteriaType) {
            case "RSVP_COUNT":
                return rsvpRepo.countByUser(user);

            case "RSVP_GOING_COUNT":
                return rsvpRepo.countByUserAndStatus(user, RsvpStatus.GOING);

            case "EVENT_CREATED":
                return eventRepo.countByOrganizerEmailIgnoreCase(user.getEmail());

            case "ACCOUNT_AGE_DAYS":
                return ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now());

            default:
                return 0;
        }
    }

    /**
     * Award a badge to a user (store in database)
     */
    @Transactional
    public UserBadge awardBadge(AppUser user, Badge badge) {
        // Check if user already has this badge
        if (userBadgeRepo.existsByUserAndBadge(user, badge)) {
            return userBadgeRepo.findByUserAndBadge(user, badge).orElse(null);
        }

        UserBadge userBadge = new UserBadge();
        userBadge.setUser(user);
        userBadge.setBadge(badge);
        userBadge.setEarnedAt(LocalDateTime.now());

        return userBadgeRepo.save(userBadge);
    }

    /**
     * Check and award all eligible badges for a user
     */
    @Transactional
    public List<Badge> checkAndAwardBadges(AppUser user) {
        List<Badge> newlyEarned = new ArrayList<>();
        List<Badge> earnedBadges = getEarnedBadges(user);

        for (Badge badge : earnedBadges) {
            if (!userBadgeRepo.existsByUserAndBadge(user, badge)) {
                awardBadge(user, badge);
                newlyEarned.add(badge);
            }
        }

        return newlyEarned;
    }

    /**
     * Get stored badges for a user
     */
    public List<UserBadge> getUserBadges(AppUser user) {
        return userBadgeRepo.findByUser(user);
    }

    // Inner class for badge progress
    public static class BadgeProgress {
        public String badgeName;
        public long currentValue;
        public int criteriaValue;
        public boolean earned;
        public int percentage;
    }
}