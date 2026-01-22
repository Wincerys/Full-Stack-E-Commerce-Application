package au.edu.rmit.sept.webapp.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
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
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;

/**
 * Integration tests for RSVP API endpoints
 * Tests RSVP creation, retrieval, updates, and deletion
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class RsvpApiTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private RsvpRepository rsvpRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private String jwtToken;
    private AppUser testUser;
    private Event testEvent;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        
        // Clean up database in proper order to avoid foreign key violations
        rsvpRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user and JWT token
        testUser = new AppUser();
        testUser.setEmail("test@rmit.edu.au");
        testUser.setName("Test User");
        testUser.setRole("STUDENT");
        testUser.setPasswordHash("dummy-hash");
        testUser = userRepository.save(testUser);

        jwtToken = JwtUtil.createToken(
            testUser.getEmail(), 
            testUser.getRole(), 
            "test-secret-key-for-testing-only", 
            3600
        );

        // Create test event
        testEvent = new Event();
        testEvent.setTitle("Test Event");
        testEvent.setDescription("Test Description");
        testEvent.setStartTime(LocalDateTime.now().plusDays(1));
        testEvent.setLocation("Test Location");
        testEvent.setCategory("Technology");
        testEvent.setOrganizerEmail("organizer@rmit.edu.au");
        testEvent = eventRepository.save(testEvent);
    }

    // ==================== RSVP Creation Tests ====================

    @Test
    void createRsvp_WithValidData_ShouldCreateRsvp() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        requestBody.put("status", "GOING");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventId").value(testEvent.getId().toString()))
                .andExpect(jsonPath("$.status").value("GOING"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void createRsvp_WithInterestedStatus_ShouldCreateRsvp() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        requestBody.put("status", "INTERESTED");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERESTED"));
    }

    @Test
    void createRsvp_WithoutAuthentication_ShouldReturn401() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        requestBody.put("status", "GOING");

        mockMvc.perform(post("/api/rsvps")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRsvp_WithInvalidEventId_ShouldReturn404() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", "550e8400-e29b-41d4-a716-446655440000"); // Random UUID
        requestBody.put("status", "GOING");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRsvp_WithInvalidStatus_ShouldReturn400() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        requestBody.put("status", "INVALID_STATUS");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("invalid status"));
    }

    @Test
    void createRsvp_WithMissingData_ShouldReturn400() throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        // Missing status

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("eventId and status required"));
    }

    // ==================== RSVP Update Tests ====================

    @Test
    void updateExistingRsvp_ShouldUpdateStatus() throws Exception {
        // Create initial RSVP
        Rsvp rsvp = new Rsvp();
        rsvp.setUser(testUser);
        rsvp.setEvent(testEvent);
        rsvp.setStatus(RsvpStatus.GOING);
        rsvp.setCreatedAt(LocalDateTime.now());
        rsvp.setUpdatedAt(LocalDateTime.now());
        rsvpRepository.save(rsvp);

        // Update to INTERESTED
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("eventId", testEvent.getId().toString());
        requestBody.put("status", "INTERESTED");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERESTED"))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    // ==================== RSVP Retrieval Tests ====================

    @Test
    void getMyRsvps_ShouldReturnUserRsvps() throws Exception {
        // Create RSVPs for test user
        Rsvp rsvp1 = createRsvp(testUser, testEvent, RsvpStatus.GOING);
        
        Event anotherEvent = new Event();
        anotherEvent.setTitle("Another Event");
        anotherEvent.setStartTime(LocalDateTime.now().plusDays(2));
        anotherEvent.setLocation("Another Location");
        anotherEvent.setCategory("Sports");
        anotherEvent.setOrganizerEmail("organizer@rmit.edu.au");
        anotherEvent = eventRepository.save(anotherEvent);
        
        Rsvp rsvp2 = createRsvp(testUser, anotherEvent, RsvpStatus.INTERESTED);

        rsvpRepository.save(rsvp1);
        rsvpRepository.save(rsvp2);

        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].status", containsInAnyOrder("GOING", "INTERESTED")));
    }

    @Test
    void getMyRsvps_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(get("/api/rsvps/my"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyRsvps_WithNoRsvps_ShouldReturnEmptyList() throws Exception {
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ==================== RSVP Deletion Tests ====================

    @Test
    void deleteRsvp_WithValidEventId_ShouldDeleteRsvp() throws Exception {
        // Create RSVP first
        Rsvp rsvp = createRsvp(testUser, testEvent, RsvpStatus.GOING);
        rsvpRepository.save(rsvp);

        mockMvc.perform(delete("/api/rsvps/by-event/" + testEvent.getId())
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // Verify RSVP is deleted
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void deleteRsvp_WithoutAuthentication_ShouldReturn401() throws Exception {
        mockMvc.perform(delete("/api/rsvps/by-event/" + testEvent.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteRsvp_WithNonexistentRsvp_ShouldNotFail() throws Exception {
        // Should not fail even if no RSVP exists
        mockMvc.perform(delete("/api/rsvps/by-event/" + testEvent.getId())
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }

    // ==================== Complete RSVP Workflow Test ====================

    @Test
    void rsvpWorkflow_CompleteUserJourney_ShouldWork() throws Exception {
        // 1. User creates RSVP as GOING
        Map<String, Object> createRequest = new HashMap<>();
        createRequest.put("eventId", testEvent.getId().toString());
        createRequest.put("status", "GOING");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GOING"));

        // 2. User checks their RSVPs
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("GOING"));

        // 3. User changes to INTERESTED
        Map<String, Object> updateRequest = new HashMap<>();
        updateRequest.put("eventId", testEvent.getId().toString());
        updateRequest.put("status", "INTERESTED");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERESTED"));

        // 4. User deletes RSVP
        mockMvc.perform(delete("/api/rsvps/by-event/" + testEvent.getId())
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // 5. Verify no RSVPs remain
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ==================== Helper Methods ====================

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