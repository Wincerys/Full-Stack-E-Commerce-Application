package au.edu.rmit.sept.webapp.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;

/**
 * Integration tests for Profile API endpoints
 * Tests user profile management and organizer-specific features
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class ProfileApiTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private RsvpRepository rsvpRepository;

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
        rsvpRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

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

    // ==================== Get Profile Tests ====================

    @Test
    void getMyProfile_WithAuthentication_ShouldReturnProfile() throws Exception {
        mockMvc.perform(get("/api/profile/me")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("student@rmit.edu.au"))
                .andExpect(jsonPath("$.name").value("Test Student"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void getMyProfile_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyProfile_WithInvalidToken_ShouldReturn400() throws Exception {
        // API returns 400 for malformed/invalid tokens
        mockMvc.perform(get("/api/profile/me")
                .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isBadRequest());
    }

    // ==================== Update Profile Tests ====================

    @Test
    void updateMyProfile_WithValidName_ShouldUpdateProfile() throws Exception {
        Map<String, String> updateRequest = new HashMap<>();
        updateRequest.put("name", "Updated Name");

        mockMvc.perform(put("/api/profile/me")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.email").value("student@rmit.edu.au"));
    }

    @Test
    void updateMyProfile_WithEmptyName_ShouldNotUpdate() throws Exception {
        Map<String, String> updateRequest = new HashMap<>();
        updateRequest.put("name", "");

        mockMvc.perform(put("/api/profile/me")
                .header("Authorization", "Bearer " + studentToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Student")); // Name unchanged
    }

    @Test
    void updateMyProfile_WithoutAuthentication_ShouldReturn401() throws Exception {
        Map<String, String> updateRequest = new HashMap<>();
        updateRequest.put("name", "Unauthorized Update");

        mockMvc.perform(put("/api/profile/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isUnauthorized());
    }

    // ==================== My Events Tests (Organizer) ====================

    @Test
    void getMyEvents_AsOrganizer_ShouldReturnOrganizerEvents() throws Exception {
        // Create events for organizer
        Event event1 = createEvent("Event 1", organizerUser.getEmail());
        Event event2 = createEvent("Event 2", organizerUser.getEmail());
        eventRepository.save(event1);
        eventRepository.save(event2);

        mockMvc.perform(get("/api/profile/my-events")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[1].title").exists());
    }

    @Test
    void getMyEvents_AsStudent_ShouldReturnEmptyList() throws Exception {
        // Students don't organize events
        mockMvc.perform(get("/api/profile/my-events")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getMyEvents_WithPagination_ShouldReturnPagedResults() throws Exception {
        // Create 15 events for organizer
        for (int i = 0; i < 15; i++) {
            Event event = createEvent("Event " + i, organizerUser.getEmail());
            eventRepository.save(event);
        }

        // Request first page (size=10)
        mockMvc.perform(get("/api/profile/my-events?page=0&size=10")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(10)));

        // Request second page
        mockMvc.perform(get("/api/profile/my-events?page=1&size=10")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)));
    }

    @Test
    void getMyEvents_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/profile/my-events"))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Event RSVPs Tests (Organizer) ====================

    @Test
    void getEventRsvps_AsOrganizer_ShouldReturnRsvpsWithUserInfo() throws Exception {
        // Create event
        Event event = createEvent("Test Event", organizerUser.getEmail());
        event = eventRepository.save(event);

        // Create RSVPs from different users
        Rsvp rsvp1 = createRsvp(studentUser, event, RsvpStatus.GOING);
        rsvpRepository.save(rsvp1);

        mockMvc.perform(get("/api/profile/event/" + event.getId() + "/rsvps")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("GOING"))
                .andExpect(jsonPath("$[0].user.email").value("student@rmit.edu.au"))
                .andExpect(jsonPath("$[0].user.name").value("Test Student"));
    }

    @Test
    void getEventRsvps_AsNonOrganizer_ShouldReturn403() throws Exception {
        // Create event owned by organizer
        Event event = createEvent("Test Event", organizerUser.getEmail());
        event = eventRepository.save(event);

        // Try to access RSVPs as student
        mockMvc.perform(get("/api/profile/event/" + event.getId() + "/rsvps")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void getEventRsvps_ForNonexistentEvent_ShouldReturn404() throws Exception {
        mockMvc.perform(get("/api/profile/event/550e8400-e29b-41d4-a716-446655440000/rsvps")
                .header("Authorization", "Bearer " + organizerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void getEventRsvps_WithoutAuthentication_ShouldReturn401() throws Exception {
        Event event = createEvent("Test Event", organizerUser.getEmail());
        event = eventRepository.save(event);

        mockMvc.perform(get("/api/profile/event/" + event.getId() + "/rsvps"))
                .andExpect(status().isUnauthorized());
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