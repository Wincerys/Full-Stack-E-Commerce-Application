package au.edu.rmit.sept.webapp.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.model.RsvpStatus;
import au.edu.rmit.sept.webapp.repository.AuditLogRepository;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.PhotoRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;

/**
 * Integration tests for Admin API endpoints
 * Tests user management, event moderation, and analytics
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AdminApiTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private RsvpRepository rsvpRepository;

    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private String adminToken;
    private String studentToken;
    private String organizerToken;
    private AppUser adminUser;
    private AppUser studentUser;
    private AppUser organizerUser;
    private Event testEvent;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        // Clean up database in proper order
        auditLogRepository.deleteAll();
        rsvpRepository.deleteAll();
        photoRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

        // Create admin user
        adminUser = new AppUser();
        adminUser.setEmail("admin@rmit.edu.au");
        adminUser.setName("Admin User");
        adminUser.setRole("ADMIN");
        adminUser.setPasswordHash("dummy-hash");
        adminUser.setActive(true);
        adminUser.setBanned(false);
        adminUser = userRepository.save(adminUser);

        adminToken = JwtUtil.createToken(
            adminUser.getEmail(),
            adminUser.getRole(),
            "test-secret-key-for-testing-only",
            3600
        );

        // Create student user
        studentUser = new AppUser();
        studentUser.setEmail("student@rmit.edu.au");
        studentUser.setName("Test Student");
        studentUser.setRole("STUDENT");
        studentUser.setPasswordHash("dummy-hash");
        studentUser.setActive(true);
        studentUser.setBanned(false);
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
        organizerUser.setActive(true);
        organizerUser.setBanned(false);
        organizerUser = userRepository.save(organizerUser);

        organizerToken = JwtUtil.createToken(
            organizerUser.getEmail(),
            organizerUser.getRole(),
            "test-secret-key-for-testing-only",
            3600
        );

        // Create a test event
        testEvent = createEvent("Test Event", organizerUser.getEmail(), "PENDING");
        testEvent = eventRepository.save(testEvent);
    }

    // ==================== User Management Tests ====================

    @Test
    void listUsers_AsAdmin_ShouldReturnAllUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].email").exists());
    }

    @Test
    void listUsers_AsStudent_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void listUsers_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void setUserActive_AsAdmin_ShouldDeactivateUser() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("active", false);

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/active")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        // Verify in database
        AppUser updated = userRepository.findById(studentUser.getId()).orElseThrow();
        assert !updated.isActive();
    }

    @Test
    void setUserActive_AsStudent_ShouldReturn403() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("active", false);

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/active")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    @Test
    void setUserBanned_AsAdmin_ShouldBanUser() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("banned", true);

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/ban")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.banned").value(true));

        // Verify in database
        AppUser updated = userRepository.findById(studentUser.getId()).orElseThrow();
        assert updated.isBanned();
    }

    @Test
    void setUserRole_AsAdmin_ShouldChangeRole() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("role", "ORGANIZER");

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/role")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ORGANIZER"));

        // Verify in database
        AppUser updated = userRepository.findById(studentUser.getId()).orElseThrow();
        assert "ORGANIZER".equals(updated.getRole());
    }

    @Test
    void setUserRole_WithInvalidRole_ShouldReturn400() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("role", "INVALID_ROLE");

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/role")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUserEvents_AsAdmin_ShouldReturnOrganizerEvents() throws Exception {
        // Create another event by organizer
        Event event2 = createEvent("Event 2", organizerUser.getEmail(), "APPROVED");
        eventRepository.save(event2);

        mockMvc.perform(get("/api/admin/users/" + organizerUser.getId() + "/events")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void getUserRsvps_AsAdmin_ShouldReturnUserRsvps() throws Exception {
        // Create RSVPs for student
        Rsvp rsvp = createRsvp(studentUser, testEvent, RsvpStatus.GOING);
        rsvpRepository.save(rsvp);

        mockMvc.perform(get("/api/admin/users/" + studentUser.getId() + "/rsvps")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    // ==================== Event Moderation Tests ====================

    @Test
    void listEventsForModeration_AsAdmin_ShouldReturnAllEvents() throws Exception {
        mockMvc.perform(get("/api/admin/events")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    void listEventsForModeration_WithStatusFilter_ShouldReturnFilteredEvents() throws Exception {
        // Create events with different statuses
        Event pendingEvent = createEvent("Pending Event", organizerUser.getEmail(), "PENDING");
        Event approvedEvent = createEvent("Approved Event", organizerUser.getEmail(), "APPROVED");
        eventRepository.save(pendingEvent);
        eventRepository.save(approvedEvent);

        mockMvc.perform(get("/api/admin/events?status=PENDING")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].approvalStatus").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("PENDING"))));
    }

    @Test
    void listEventsForModeration_WithQueryFilter_ShouldReturnMatchingEvents() throws Exception {
        mockMvc.perform(get("/api/admin/events?query=Test")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    void listEventsForModeration_AsStudent_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/events")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void approveEvent_AsAdmin_ShouldSetStatusToApproved() throws Exception {
        mockMvc.perform(post("/api/admin/events/" + testEvent.getId() + "/approve")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"))
                .andExpect(jsonPath("$.rejectionReason").isEmpty());

        // Verify in database
        Event updated = eventRepository.findById(testEvent.getId()).orElseThrow();
        assert "APPROVED".equals(updated.getApprovalStatus());
    }

    @Test
    void rejectEvent_AsAdmin_ShouldSetStatusToRejected() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("reason", "Event does not meet guidelines");

        mockMvc.perform(post("/api/admin/events/" + testEvent.getId() + "/reject")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Event does not meet guidelines"));

        // Verify in database
        Event updated = eventRepository.findById(testEvent.getId()).orElseThrow();
        assert "REJECTED".equals(updated.getApprovalStatus());
        assert "Event does not meet guidelines".equals(updated.getRejectionReason());
    }

    @Test
    void rejectEvent_WithoutReason_ShouldStillWork() throws Exception {
        mockMvc.perform(post("/api/admin/events/" + testEvent.getId() + "/reject")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("REJECTED"));
    }

    @Test
    void deleteEvent_AsAdmin_ShouldDeleteEvent() throws Exception {
        UUID eventId = testEvent.getId();

        mockMvc.perform(delete("/api/admin/events/" + eventId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Verify event is deleted
        assert eventRepository.findById(eventId).isEmpty();
    }

    @Test
    void deleteEvent_WithRsvps_ShouldDeleteEventAndRsvps() throws Exception {
        // Create RSVP for event
        Rsvp rsvp = createRsvp(studentUser, testEvent, RsvpStatus.GOING);
        rsvpRepository.save(rsvp);

        UUID eventId = testEvent.getId();

        mockMvc.perform(delete("/api/admin/events/" + eventId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Verify event and RSVPs are deleted
        assert eventRepository.findById(eventId).isEmpty();
        assert rsvpRepository.findByEventId(eventId).isEmpty();
    }

    @Test
    void editEvent_AsAdmin_ShouldUpdateEventDetails() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Updated Event Title");
        body.put("description", "Updated description");
        body.put("location", "New Location");
        body.put("category", "Sports");

        mockMvc.perform(put("/api/admin/events/" + testEvent.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Event Title"))
                .andExpect(jsonPath("$.location").value("New Location"));

        // Verify in database
        Event updated = eventRepository.findById(testEvent.getId()).orElseThrow();
        assert "Updated Event Title".equals(updated.getTitle());
        assert "New Location".equals(updated.getLocation());
    }

    @Test
    void editEvent_AsStudent_ShouldReturn403() throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("title", "Hacked Title");

        mockMvc.perform(put("/api/admin/events/" + testEvent.getId())
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden());
    }

    // ==================== Analytics Tests ====================

    @Test
    void getCounts_AsAdmin_ShouldReturnSystemCounts() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/counts")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").value(3))
                .andExpect(jsonPath("$.eventsTotal").value(greaterThan(0)))
                .andExpect(jsonPath("$.eventsApproved").exists())
                .andExpect(jsonPath("$.eventsPending").exists())
                .andExpect(jsonPath("$.rsvpsTotal").exists());
    }

    @Test
    void getCounts_AsStudent_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/admin/analytics/counts")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPopularEvents_AsAdmin_ShouldReturnEventsSortedByRsvps() throws Exception {
        // Approve event first
        testEvent.setApprovalStatus("APPROVED");
        eventRepository.save(testEvent);

        // Create RSVPs
        Rsvp rsvp1 = createRsvp(studentUser, testEvent, RsvpStatus.GOING);
        rsvpRepository.save(rsvp1);

        mockMvc.perform(get("/api/admin/analytics/popular-events?limit=10")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[0].rsvpCount").exists());
    }

    @Test
    void getRecentActivity_AsAdmin_ShouldReturnAuditLogs() throws Exception {
        // Perform some actions to create audit logs
        Map<String, Object> body = new HashMap<>();
        body.put("banned", true);
        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/ban")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));

        mockMvc.perform(get("/api/admin/analytics/recent-activity?limit=10")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].timestamp").exists())
                .andExpect(jsonPath("$[0].action").exists());
    }

    @Test
    void getOrganizerLeaderboard_AsAdmin_ShouldReturnOrganizerStats() throws Exception {
        // Create more events and RSVPs
        Event event2 = createEvent("Event 2", organizerUser.getEmail(), "APPROVED");
        eventRepository.save(event2);
        
        Rsvp rsvp1 = createRsvp(studentUser, testEvent, RsvpStatus.GOING);
        Rsvp rsvp2 = createRsvp(studentUser, event2, RsvpStatus.GOING);
        rsvpRepository.save(rsvp1);
        rsvpRepository.save(rsvp2);

        mockMvc.perform(get("/api/admin/analytics/organizer-leaderboard?limit=10")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].email").exists())
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].eventsCreated").exists())
                .andExpect(jsonPath("$[0].totalRsvps").exists());
    }

    // ==================== Admin Workflow Test ====================

    @Test
    void adminWorkflow_CompleteModeration_ShouldWork() throws Exception {
        // 1. List all users
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));

        // 2. Ban a user
        Map<String, Object> banBody = new HashMap<>();
        banBody.put("banned", true);
        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/ban")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(banBody)))
                .andExpect(status().isOk());

        // 3. List pending events
        mockMvc.perform(get("/api/admin/events?status=PENDING")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));

        // 4. Approve an event
        mockMvc.perform(post("/api/admin/events/" + testEvent.getId() + "/approve")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalStatus").value("APPROVED"));

        // 5. Check analytics
        mockMvc.perform(get("/api/admin/analytics/counts")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.users").value(3))
                .andExpect(jsonPath("$.eventsApproved").value(greaterThan(0)));

        // 6. View recent activity
        mockMvc.perform(get("/api/admin/analytics/recent-activity?limit=5")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== Helper Methods ====================

    private Event createEvent(String title, String organizerEmail, String approvalStatus) {
        Event event = new Event();
        event.setTitle(title);
        event.setDescription("Test description for " + title);
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setLocation("Test Location");
        event.setCategory("Technology");
        event.setOrganizerEmail(organizerEmail);
        event.setApprovalStatus(approvalStatus);
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