package au.edu.rmit.sept.webapp.controller;

import java.time.LocalDateTime;
import java.util.UUID;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import au.edu.rmit.sept.webapp.dto.EventDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;

/**
 * Integration tests for Event API endpoints
 * Tests event CRUD operations, authorization, filtering, and validation
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class EventApiTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private RsvpRepository rsvpRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private String jwtToken;
    private String otherJwtToken;
    private String organiserSpellingJwtToken;
    private AppUser testUser;
    private AppUser otherUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();

        // Clean up database in proper order to avoid foreign key violations
        rsvpRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user (organizer) and JWT token
        testUser = new AppUser();
        testUser.setEmail("test@rmit.edu.au");
        testUser.setName("Test User");
        testUser.setRole("ORGANIZER");
        testUser.setPasswordHash("dummy-hash");
        testUser = userRepository.save(testUser);

        jwtToken = JwtUtil.createToken(
            testUser.getEmail(), 
            testUser.getRole(), 
            "test-secret-key-for-testing-only",
            3600
        );

        // Second user (organizer) for ownership tests
        otherUser = new AppUser();
        otherUser.setEmail("other@rmit.edu.au");
        otherUser.setName("Other User");
        otherUser.setRole("ORGANIZER");
        otherUser.setPasswordHash("dummy-hash");
        otherUser = userRepository.save(otherUser);
        
        otherJwtToken = JwtUtil.createToken(
            otherUser.getEmail(), 
            otherUser.getRole(),
            "test-secret-key-for-testing-only", 
            3600
        );

        // Token with British spelling "ORGANISER"
        organiserSpellingJwtToken = JwtUtil.createToken(
            "organiser@rmit.edu.au", 
            "ORGANISER",
            "test-secret-key-for-testing-only", 
            3600
        );
    }

    // ==================== Event Creation Tests ====================

    @Test
    void createEvent_WithValidData_ShouldReturnEvent() throws Exception {
        EventDto eventDto = new EventDto();
        eventDto.title = "Test Event";
        eventDto.description = "Test Description";
        eventDto.startTime = LocalDateTime.now().plusDays(1);
        eventDto.location = "Test Location";
        eventDto.category = "Test Category";

        mockMvc.perform(post("/api/events")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eventDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Event"))
                .andExpect(jsonPath("$.description").value("Test Description"))
                .andExpect(jsonPath("$.location").value("Test Location"))
                .andExpect(jsonPath("$.category").value("Test Category"))
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void createEvent_WithoutAuthentication_ShouldReturn401() throws Exception {
        EventDto eventDto = new EventDto();
        eventDto.title = "Test Event";

        mockMvc.perform(post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eventDto)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createEvent_WithPastDate_ShouldReturn400() throws Exception {
        EventDto eventDto = new EventDto();
        eventDto.title = "Past Event";
        eventDto.description = "Should be rejected";
        eventDto.startTime = LocalDateTime.now().minusDays(1);
        eventDto.location = "Test Location";
        eventDto.category = "Test Category";

        mockMvc.perform(post("/api/events")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eventDto)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEvent_WithOrganiserSpellingRole_ShouldSucceed() throws Exception {
        EventDto eventDto = new EventDto();
        eventDto.title = "Organiser Spelling Event";
        eventDto.description = "AU spelling organiser";
        eventDto.startTime = LocalDateTime.now().plusDays(1);
        eventDto.location = "Test Location";
        eventDto.category = "Test Category";

        mockMvc.perform(post("/api/events")
                .header("Authorization", "Bearer " + organiserSpellingJwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eventDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Organiser Spelling Event"));
    }

    // ==================== Event Retrieval Tests ====================

    @Test
    void getEvent_WithValidId_ShouldReturnEvent() throws Exception {
        Event event = new Event();
        event.setTitle("Test Event");
        event.setDescription("Test Description");
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setLocation("Test Location");
        event.setCategory("Test Category");
        event.setOrganizerEmail(testUser.getEmail());
        event = eventRepository.save(event);

        mockMvc.perform(get("/api/events/" + event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Event"))
                .andExpect(jsonPath("$.id").value(event.getId().toString()));
    }

    @Test
    void getEvent_WithInvalidId_ShouldReturn404() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/api/events/" + randomId))
                .andExpect(status().isNotFound());
    }

    @Test
    void listEvents_ShouldReturnAllApprovedEvents() throws Exception {
        // Create multiple approved events
        Event event1 = createTestEvent("Event 1", "Technology");
        event1.setApprovalStatus("APPROVED");
        Event event2 = createTestEvent("Event 2", "Sports");
        event2.setApprovalStatus("APPROVED");
        eventRepository.save(event1);
        eventRepository.save(event2);

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].title").value("Event 1"))
                .andExpect(jsonPath("$[1].title").value("Event 2"));
    }

    // ==================== Event Filtering Tests ====================

    @Test
    void listEvents_WithCategoryFilter_ShouldReturnFilteredEvents() throws Exception {
        Event techEvent = createTestEvent("Tech Event", "Technology");
        techEvent.setApprovalStatus("APPROVED");
        Event sportsEvent = createTestEvent("Sports Event", "Sports");
        sportsEvent.setApprovalStatus("APPROVED");
        eventRepository.save(techEvent);
        eventRepository.save(sportsEvent);

        mockMvc.perform(get("/api/events?category=Technology"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Tech Event"));
    }

    @Test
    void listEvents_WithSearchQuery_ShouldReturnMatchingEvents() throws Exception {
        Event reactEvent = createTestEvent("React Workshop", "Technology");
        reactEvent.setApprovalStatus("APPROVED");
        Event javaEvent = createTestEvent("Java Basics", "Technology");
        javaEvent.setApprovalStatus("APPROVED");
        eventRepository.save(reactEvent);
        eventRepository.save(javaEvent);

        mockMvc.perform(get("/api/events?q=React"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("React Workshop"));
    }

    // ==================== Event Update Tests ====================

    @Test
    void updateEvent_WithValidData_ShouldUpdateEvent() throws Exception {
        Event event = createTestEvent("Original Title", "Technology");
        event = eventRepository.save(event);

        EventDto updateDto = new EventDto();
        updateDto.title = "Updated Title";
        updateDto.description = "Updated Description";
        updateDto.startTime = LocalDateTime.now().plusDays(2);
        updateDto.location = "Updated Location";
        updateDto.category = "Updated Category";

        mockMvc.perform(put("/api/events/" + event.getId())
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Title"))
                .andExpect(jsonPath("$.description").value("Updated Description"));
    }

    @Test
    void updateEvent_WithoutAuthentication_ShouldReturn401() throws Exception {
        Event event = createTestEvent("Test Event", "Technology");
        event = eventRepository.save(event);

        EventDto updateDto = new EventDto();
        updateDto.title = "Updated Title";

        mockMvc.perform(put("/api/events/" + event.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateEvent_ByNonOwner_ShouldReturn403() throws Exception {
        Event event = createTestEvent("Owner Event", "Technology");
        event = eventRepository.save(event);

        EventDto updateDto = new EventDto();
        updateDto.title = "Bad Update";

        mockMvc.perform(put("/api/events/" + event.getId())
                .header("Authorization", "Bearer " + otherJwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateEvent_SetPastDate_ShouldReturn400() throws Exception {
        // Create a valid future event first
        Event event = createTestEvent("Will Update", "Technology");
        event = eventRepository.save(event);

        EventDto updateDto = new EventDto();
        updateDto.title = event.getTitle();
        updateDto.startTime = LocalDateTime.now().minusDays(2);
        updateDto.location = event.getLocation();
        updateDto.category = event.getCategory();

        mockMvc.perform(put("/api/events/" + event.getId())
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isBadRequest());
    }

    // ==================== Event Deletion Tests ====================

    @Test
    void deleteEvent_WithValidId_ShouldDeleteEvent() throws Exception {
        Event event = createTestEvent("Test Event", "Technology");
        event = eventRepository.save(event);

        mockMvc.perform(delete("/api/events/" + event.getId())
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        // Verify event is deleted
        mockMvc.perform(get("/api/events/" + event.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteEvent_WithoutAuthentication_ShouldReturn401() throws Exception {
        Event event = createTestEvent("Test Event", "Technology");
        event = eventRepository.save(event);

        mockMvc.perform(delete("/api/events/" + event.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteEvent_ByNonOwner_ShouldReturn403() throws Exception {
        Event event = createTestEvent("Owner Event", "Technology");
        event = eventRepository.save(event);

        mockMvc.perform(delete("/api/events/" + event.getId())
                .header("Authorization", "Bearer " + otherJwtToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteEvent_WithInvalidId_ShouldReturn404() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(delete("/api/events/" + randomId)
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNotFound());
    }

    // ==================== Helper Methods ====================

    private Event createTestEvent(String title, String category) {
        Event event = new Event();
        event.setTitle(title);
        event.setDescription("Test description for " + title);
        event.setStartTime(LocalDateTime.now().plusDays(1));
        event.setLocation("Test Location");
        event.setCategory(category);
        event.setOrganizerEmail(testUser.getEmail());
        return event;
    }
}