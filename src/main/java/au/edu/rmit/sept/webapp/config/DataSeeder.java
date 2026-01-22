package au.edu.rmit.sept.webapp.config;

import java.time.LocalDateTime;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCrypt;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Badge;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.repository.BadgeRepository;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;

@Configuration
public class DataSeeder {
  
  @Bean 
  CommandLineRunner seedUsers(UserRepository userRepo) {
    return args -> {
      // Create admin user if doesn't exist
      if (!userRepo.existsByEmail("admin@eventhub.com")) {
        AppUser admin = new AppUser();
        admin.setEmail("admin@eventhub.com");
        admin.setName("System Administrator");
        admin.setRole("ADMIN");
        String salt = BCrypt.gensalt();
        admin.setPasswordHash(BCrypt.hashpw("Admin123!", salt));
        userRepo.save(admin);
        System.out.println("✅ Admin user created: admin@eventhub.com / Admin123!");
      }
    };
  }
  
  @Bean 
  CommandLineRunner seedEvents(EventRepository repo) {
    return args -> {
      if (repo.count() == 0) {
        var e1 = new Event();
        e1.setTitle("Welcome Week");
        e1.setDescription("Kickoff event for new students");
        e1.setStartTime(LocalDateTime.now().plusDays(7));
        e1.setLocation("City Campus");
        e1.setCategory("Campus");
        e1.setOrganizerEmail("admin@eventhub.com");
        repo.save(e1);

        var e2 = new Event();
        e2.setTitle("Hack Night");
        e2.setDescription("Code + pizza");
        e2.setStartTime(LocalDateTime.now().plusDays(10));
        e2.setLocation("Lab 3");
        e2.setCategory("Tech");
        e2.setOrganizerEmail("admin@eventhub.com");
        repo.save(e2);
        
        System.out.println("✅ Sample events created");
      }
    };
  }

  @Bean
  CommandLineRunner seedBadges(BadgeRepository badgeRepo) {
    return args -> {
      if (badgeRepo.count() == 0) {
        // Attendance Badges
        createBadge(badgeRepo, "First Timer", "Attended your first event", "🎖️", 
                    "BRONZE", "RSVP_GOING_COUNT", 1);
        createBadge(badgeRepo, "Regular Attendee", "Attended 5 events", "🌟", 
                    "SILVER", "RSVP_GOING_COUNT", 5);
        createBadge(badgeRepo, "VIP Member", "Attended 10 events", "💎", 
                    "GOLD", "RSVP_GOING_COUNT", 10);
        
        // Engagement Badges
        createBadge(badgeRepo, "Social Butterfly", "RSVP'd to 10+ events", "🦋", 
                    "SILVER", "RSVP_COUNT", 10);
        createBadge(badgeRepo, "Super Fan", "RSVP'd to 20+ events", "⭐", 
                    "GOLD", "RSVP_COUNT", 20);
        
        // Organizer Badges
        createBadge(badgeRepo, "Event Creator", "Created your first event", "🎯", 
                    "BRONZE", "EVENT_CREATED", 1);
        createBadge(badgeRepo, "Super Organizer", "Created 5 events", "👑", 
                    "SILVER", "EVENT_CREATED", 5);
        createBadge(badgeRepo, "Event Master", "Created 10 events", "🏆", 
                    "GOLD", "EVENT_CREATED", 10);
        
        // Loyalty Badges
        createBadge(badgeRepo, "Newcomer", "Account created", "🌱", 
                    "BRONZE", "ACCOUNT_AGE_DAYS", 0);
        createBadge(badgeRepo, "Loyal Member", "Member for 30 days", "🎂", 
                    "SILVER", "ACCOUNT_AGE_DAYS", 30);
        createBadge(badgeRepo, "Veteran", "Member for 90 days", "🏅", 
                    "GOLD", "ACCOUNT_AGE_DAYS", 90);
        
        System.out.println("✅ Badge system initialized with 11 badges");
      }
    };
  }

  private void createBadge(BadgeRepository repo, String name, String description, 
                          String icon, String tier, String criteriaType, int criteriaValue) {
    Badge badge = new Badge();
    badge.setName(name);
    badge.setDescription(description);
    badge.setIcon(icon);
    badge.setTier(tier);
    badge.setCriteriaType(criteriaType);
    badge.setCriteriaValue(criteriaValue);
    repo.save(badge);
  }
}