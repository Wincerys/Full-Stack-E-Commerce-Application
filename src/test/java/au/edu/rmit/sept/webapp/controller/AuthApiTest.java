package au.edu.rmit.sept.webapp.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.databind.ObjectMapper;

import au.edu.rmit.sept.webapp.dto.AuthDtos;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import au.edu.rmit.sept.webapp.repository.UserRepository;

/**
 * Integration tests for Authentication API endpoints
 * Tests user registration, login, and authentication flows
 * Uses MySQL test database (eventsdb_test) configured via application-test.properties
 * 
 * CURRENT API BEHAVIOR (as of tests):
 * - Email validation: NOT enforced (accepts any string)
 * - Name validation: NOT enforced (accepts empty strings)
 * - Empty credentials on login: Returns 401 (not 400)
 * - Role spelling: Normalizes "ORGANISER" to "ORGANIZER"
 * 
 * TODO - Future validation improvements:
 * - Add email format validation (@Valid @Email)
 * - Add name length validation (min 1 character)
 * - Add password strength validation
 * - Consider returning 400 for malformed requests vs 401 for invalid credentials
 */
@SpringBootTest
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AuthApiTest {

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

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        
        // Clean up database in proper order to avoid foreign key violations
        rsvpRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ==================== Registration Tests ====================

    @Test
    void registerNewUser_WithValidData_ShouldCreateUserAndReturnToken() throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "newuser@rmit.edu.au";
        request.password = "password123";
        request.name = "New User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("newuser@rmit.edu.au"))
                .andExpect(jsonPath("$.user.name").value("New User"))
                .andExpect(jsonPath("$.user.role").value("STUDENT"));
    }

    @Test
    void registerWithExistingEmail_ShouldReturn409Conflict() throws Exception {
        // First registration
        AuthDtos.RegisterRequest request1 = new AuthDtos.RegisterRequest();
        request1.email = "duplicate@rmit.edu.au";
        request1.password = "password123";
        request1.name = "First User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
                .andExpect(status().isOk());

        // Duplicate registration attempt
        AuthDtos.RegisterRequest request2 = new AuthDtos.RegisterRequest();
        request2.email = "duplicate@rmit.edu.au";
        request2.password = "different123";
        request2.name = "Second User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isConflict());
    }

    @Test
    void registerWithInvalidEmail_ShouldAcceptAnyEmailFormat() throws Exception {
        // NOTE: Current API does not validate email format
        // TODO: Add email validation in future sprint
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "not-an-email";
        request.password = "password123";
        request.name = "Test User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("not-an-email"));
    }

    @Test
    void registerWithMissingPassword_ShouldReturn400() throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "valid@rmit.edu.au";
        request.name = "Test User";
        // password is null

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerWithEmptyName_ShouldAcceptEmptyName() throws Exception {
        // NOTE: Current API does not validate name field
        // TODO: Add name validation in future sprint
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "valid@rmit.edu.au";
        request.password = "password123";
        request.name = "";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("valid@rmit.edu.au"));
    }

    // ==================== Login Tests ====================

    @Test
    void loginWithValidCredentials_ShouldReturnToken() throws Exception {
        // Register user first
        AuthDtos.RegisterRequest registerRequest = new AuthDtos.RegisterRequest();
        registerRequest.email = "login@rmit.edu.au";
        registerRequest.password = "password123";
        registerRequest.name = "Login User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        // Now attempt login
        AuthDtos.LoginRequest loginRequest = new AuthDtos.LoginRequest();
        loginRequest.email = "login@rmit.edu.au";
        loginRequest.password = "password123";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("login@rmit.edu.au"))
                .andExpect(jsonPath("$.user.name").value("Login User"));
    }

    @Test
    void loginWithInvalidPassword_ShouldReturn401() throws Exception {
        // Register user first
        AuthDtos.RegisterRequest registerRequest = new AuthDtos.RegisterRequest();
        registerRequest.email = "secure@rmit.edu.au";
        registerRequest.password = "correct123";
        registerRequest.name = "Secure User";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        // Login with wrong password
        AuthDtos.LoginRequest loginRequest = new AuthDtos.LoginRequest();
        loginRequest.email = "secure@rmit.edu.au";
        loginRequest.password = "wrongpassword";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithNonexistentEmail_ShouldReturn401() throws Exception {
        AuthDtos.LoginRequest loginRequest = new AuthDtos.LoginRequest();
        loginRequest.email = "nonexistent@rmit.edu.au";
        loginRequest.password = "password123";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithEmptyCredentials_ShouldReturn401() throws Exception {
        // API returns 401 (Unauthorized) for empty credentials, not 400 (Bad Request)
        AuthDtos.LoginRequest loginRequest = new AuthDtos.LoginRequest();
        loginRequest.email = "";
        loginRequest.password = "";

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    // ==================== Role Assignment Tests ====================

    @Test
    void registerWithOrganizerRole_ShouldCreateOrganizerUser() throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "organizer@rmit.edu.au";
        request.password = "password123";
        request.name = "Event Organizer";
        request.role = "ORGANIZER";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ORGANIZER"));
    }

    @Test
    void registerWithOrganiserSpelling_ShouldNormalizeToAmericanSpelling() throws Exception {
        // API normalizes British "ORGANISER" to American "ORGANIZER"
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "organiser@rmit.edu.au";
        request.password = "password123";
        request.name = "Event Organiser";
        request.role = "ORGANISER"; // British spelling

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ORGANIZER")); // Normalized to American
    }

    @Test
    void registerWithoutRole_ShouldDefaultToStudent() throws Exception {
        AuthDtos.RegisterRequest request = new AuthDtos.RegisterRequest();
        request.email = "student@rmit.edu.au";
        request.password = "password123";
        request.name = "Student User";
        // role is not set, should default to STUDENT

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("STUDENT"));
    }
}