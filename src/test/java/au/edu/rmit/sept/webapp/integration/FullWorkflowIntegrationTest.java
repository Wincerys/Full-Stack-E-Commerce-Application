package au.edu.rmit.sept.webapp.integration;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import au.edu.rmit.sept.webapp.dto.AuthDtos;
import au.edu.rmit.sept.webapp.dto.EventDto;

/**
 * End-to-End Integration Test
 * Tests complete user journey through the entire application:
 * Registration → Login → Event Creation → RSVP → Updates → Deletion
 * 
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 */
@SpringBootTest(classes = au.edu.rmit.sept.webapp.WebApplication.class)
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class FullWorkflowIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
    }

    @Test
    void completeUserJourney_RegisterLoginCreateEventRsvp_ShouldWork() throws Exception {
        
        // ==================== 1. REGISTER USER ====================
        AuthDtos.RegisterRequest registerRequest = new AuthDtos.RegisterRequest();
        registerRequest.email = "integration@test.com";
        registerRequest.password = "password123";
        registerRequest.name = "Integration Test User";
        registerRequest.role = "ORGANIZER"; // Must be organizer to create events

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("integration@test.com"))
                .andExpect(jsonPath("$.user.role").value("ORGANIZER"))
                .andReturn();

        String registerResponse = registerResult.getResponse().getContentAsString();
        AuthDtos.AuthResponse authResponse = objectMapper.readValue(registerResponse, AuthDtos.AuthResponse.class);
        String jwtToken = authResponse.token;

        // ==================== 2. LOGIN USER ====================
        AuthDtos.LoginRequest loginRequest = new AuthDtos.LoginRequest();
        loginRequest.email = "integration@test.com";
        loginRequest.password = "password123";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("integration@test.com"));

        // ==================== 3. CREATE EVENT ====================
        EventDto eventDto = new EventDto();
        eventDto.title = "Integration Test Event";
        eventDto.description = "This is a test event for integration testing";
        eventDto.startTime = LocalDateTime.now().plusDays(1);
        eventDto.location = "Integration Test Location";
        eventDto.category = "Testing";

        MvcResult createEventResult = mockMvc.perform(post("/api/events")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(eventDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Integration Test Event"))
                .andExpect(jsonPath("$.description").value("This is a test event for integration testing"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        String createEventResponse = createEventResult.getResponse().getContentAsString();
        EventDto createdEvent = objectMapper.readValue(createEventResponse, EventDto.class);
        String eventId = createdEvent.id.toString();

        // ==================== 4. GET EVENT ====================
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Integration Test Event"))
                .andExpect(jsonPath("$.description").value("This is a test event for integration testing"))
                .andExpect(jsonPath("$.location").value("Integration Test Location"));

        // ==================== 5. LIST MY EVENTS ====================
        // Note: Created event may be PENDING and not in public list
        mockMvc.perform(get("/api/profile/my-events")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Integration Test Event"));

        // ==================== 6. CREATE RSVP ====================
        Map<String, Object> rsvpRequest = new HashMap<>();
        rsvpRequest.put("eventId", eventId);
        rsvpRequest.put("status", "GOING");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(rsvpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GOING"))
                .andExpect(jsonPath("$.eventId").value(eventId));

        // ==================== 7. GET MY RSVPS ====================
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("GOING"))
                .andExpect(jsonPath("$[0].eventId").value(eventId));

        // ==================== 8. UPDATE RSVP ====================
        Map<String, Object> updateRsvpRequest = new HashMap<>();
        updateRsvpRequest.put("eventId", eventId);
        updateRsvpRequest.put("status", "INTERESTED");

        mockMvc.perform(post("/api/rsvps")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRsvpRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERESTED"));

        // ==================== 9. UPDATE EVENT ====================
        EventDto updateEventDto = new EventDto();
        updateEventDto.title = "Updated Integration Test Event";
        updateEventDto.description = "Updated description";
        updateEventDto.startTime = LocalDateTime.now().plusDays(2);
        updateEventDto.location = "Updated Location";
        updateEventDto.category = "Updated Testing";

        mockMvc.perform(put("/api/events/" + eventId)
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateEventDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Integration Test Event"))
                .andExpect(jsonPath("$.description").value("Updated description"));

        // ==================== 10. DELETE RSVP ====================
        mockMvc.perform(delete("/api/rsvps/by-event/" + eventId)
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // Verify RSVP is deleted
        mockMvc.perform(get("/api/rsvps/my")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        // ==================== 11. DELETE EVENT ====================
        mockMvc.perform(delete("/api/events/" + eventId)
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isNoContent());

        // Verify event is deleted
        mockMvc.perform(get("/api/events/" + eventId))
                .andExpect(status().isNotFound());

        // ==================== COMPLETE! ====================
        // Successfully tested entire user journey:
        // ✅ User Registration
        // ✅ User Login
        // ✅ Event Creation
        // ✅ Event Retrieval
        // ✅ RSVP Creation
        // ✅ RSVP Update
        // ✅ Event Update
        // ✅ RSVP Deletion
        // ✅ Event Deletion
    }
}