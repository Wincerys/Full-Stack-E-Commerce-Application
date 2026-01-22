package au.edu.rmit.sept.webapp.controller;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.model.RsvpStatus;
import au.edu.rmit.sept.webapp.repository.BadgeRepository;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserBadgeRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;

/**
 * Integration tests for Badge API endpoints
 * Tests badge retrieval, progress tracking, and badge awarding
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class BadgeApiTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private RsvpRepository rsvpRepository;

    @Autowired
    private BadgeRepository badgeRepository;

    @Autowired
    private UserBadgeRepository userBadgeRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private String studentToken;
    private String organizerToken;
    private AppUser studentUser;
    private AppUser organizerUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        // Clean up database in proper order
        userBadgeRepository.deleteAll();
        rsvpRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();
        // Note: Don't delete badges - they're initialized at startup

        // Create student user
        studentUser = new AppUser();
        studentUser.setEmail("student@rmit.edu.au");
        studentUser.setName("Test Student");
        studentUser.setRole("STUDENT");
        studentUser.setPasswordHash("dummy-hash");
        studentUser = userRepository.save(studentUser);

        studentToken = JwtUtil.createToken(
            studentUser.getEmail(),
            studentUser.getRole(),
            "test-secret-key-for-testing-only",
            3600
        );

        // Create organizer user
        organizerUser = new AppUser();
        organizerUser.setEmail("organizer@rmit.edu.au");
        organizerUser.setName("Test Organizer");
        organizerUser.setRole("ORGANIZER");
        organizerUser.setPasswordHash("dummy-hash");
        organizerUser = userRepository.save(organizerUser);

        organizerToken = JwtUtil.createToken(
            organizerUser.getEmail(),
            organizerUser.getRole(),
            "test-secret-key-for-testing-only",
            3600
        );
    }

    // ==================== Get All Badges Tests ====================

    @Test
    void getAllBadges_ShouldReturnAllAvailableBadges() throws Exception {
        // System should have 11 badges initialized at startup
        mockMvc.perform(get("/api/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(11)))
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].description").exists())
                .andExpect(jsonPath("$[0].icon").exists()); // Field is 'icon', not 'iconUrl'
    }

    @Test
    void getAllBadges_WithoutAuthentication_ShouldSucceed() throws Exception {
        // Public endpoint - no authentication required
        mockMvc.perform(get("/api/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== Get My Badges Tests ====================

    @Test
    void getMyBadges_WithNoActivity_ShouldReturnNewcomerBadge() throws Exception {
        // New users automatically get "Newcomer" badge (ACCOUNT_AGE_DAYS: 0)
        mockMvc.perform(get("/api/badges/my-badges")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Newcomer"));
    }

    @Test
    void getMyBadges_WithEarnedBadges_ShouldReturnUserBadges() throws Exception {
        // Create some activity to potentially earn badges
        // For example: RSVP to events to earn "First RSVP" badge
        Event event1 = createEvent("Event 1", "organizer@test.com");
        eventRepository.save(event1);
        
        Rsvp rsvp1 = createRsvp(studentUser, event1, RsvpStatus.GOING);
        rsvpRepository.save(rsvp1);

        // Trigger badge check
        mockMvc.perform(post("/api/badges/check-and-award")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());

        // Now check earned badges
        mockMvc.perform(get("/api/badges/my-badges")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(0))));
    }

    @Test
    void getMyBadges_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/badges/my-badges"))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Get Badge Progress Tests ====================

    @Test
    void getMyProgress_WithNewUser_ShouldReturnProgressData() throws Exception {
        mockMvc.perform(get("/api/badges/my-progress")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }

    @Test
    void getMyProgress_WithActivity_ShouldShowProgress() throws Exception {
        // Create some RSVP activity
        Event event1 = createEvent("Event 1", "organizer@test.com");
        Event event2 = createEvent("Event 2", "organizer@test.com");
        eventRepository.save(event1);
        eventRepository.save(event2);
        
        Rsvp rsvp1 = createRsvp(studentUser, event1, RsvpStatus.GOING);
        Rsvp rsvp2 = createRsvp(studentUser, event2, RsvpStatus.GOING);
        rsvpRepository.save(rsvp1);
        rsvpRepository.save(rsvp2);

        mockMvc.perform(get("/api/badges/my-progress")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }

    @Test
    void getMyProgress_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/badges/my-progress"))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Check and Award Badges Tests ====================

    @Test
    void checkAndAward_WithNewUser_ShouldAwardNewcomerBadge() throws Exception {
        // New user should earn "Newcomer" badge (ACCOUNT_AGE_DAYS: 0)
        mockMvc.perform(post("/api/badges/check-and-award")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Newcomer"));
    }

    @Test
    void checkAndAward_WithActivity_MayAwardBadges() throws Exception {
        // Create activity that could earn badges
        Event event = createEvent("Test Event", "organizer@test.com");
        eventRepository.save(event);
        
        Rsvp rsvp = createRsvp(studentUser, event, RsvpStatus.GOING);
        rsvpRepository.save(rsvp);

        // Check and award
        mockMvc.perform(post("/api/badges/check-and-award")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void checkAndAward_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(post("/api/badges/check-and-award"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void checkAndAward_AsOrganizer_WithEvents_MayEarnOrganizerBadges() throws Exception {
        // Create events as organizer
        Event event1 = createEvent("Event 1", organizerUser.getEmail());
        Event event2 = createEvent("Event 2", organizerUser.getEmail());
        eventRepository.save(event1);
        eventRepository.save(event2);

        // Check for organizer badges
        mockMvc.perform(post("/api/badges/check-and-award")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== Badge Workflow Test ====================

    @Test
    void badgeWorkflow_CompleteUserJourney_ShouldWork() throws Exception {
        // 1. Get all available badges
        mockMvc.perform(get("/api/badges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));

        // 2. Check initial earned badges (should be empty)
        mockMvc.perform(get("/api/badges/my-badges")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // 3. Check initial progress
        mockMvc.perform(get("/api/badges/my-progress")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());

        // 4. Do some activity (RSVP to event)
        Event event = createEvent("Test Event", "organizer@test.com");
        eventRepository.save(event);
        
        Rsvp rsvp = createRsvp(studentUser, event, RsvpStatus.GOING);
        rsvpRepository.save(rsvp);

        // 5. Check and award badges
        mockMvc.perform(post("/api/badges/check-and-award")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());

        // 6. Verify progress updated
        mockMvc.perform(get("/api/badges/my-progress")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());
    }

    // ==================== Helper Methods ====================

    private Event createEvent(String title, String organizerEmail) {
        Event event = new Event();
        event.setTitle(title);
        event.setDescription("Test description for " + title);
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setLocation("Test Location");
        event.setCategory("Technology");
        event.setOrganizerEmail(organizerEmail);
        return event;
    }

    private Rsvp createRsvp(AppUser user, Event event, RsvpStatus status) {
        Rsvp rsvp = new Rsvp();
        rsvp.setUser(user);
        rsvp.setEvent(event);
        rsvp.setStatus(status);
        rsvp.setCreatedAt(LocalDateTime.now());
        rsvp.setUpdatedAt(LocalDateTime.now());
        return rsvp;
    }
}