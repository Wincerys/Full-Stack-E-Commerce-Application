package au.edu.rmit.sept.webapp.controller;

import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import au.edu.rmit.sept.webapp.dto.AuthDtos;
import au.edu.rmit.sept.webapp.dto.UserDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/auth")
public class AuthApi {

    private final UserRepository users;

    // Valid roles
    private static final Set<String> VALID_ROLES = Set.of("STUDENT", "ORGANIZER", "ADMIN");

    public AuthApi(UserRepository users) {
        this.users = users;
    }

    @Value("${app.jwt.secret:dev-secret-please-change}")
    private String jwtSecret;

    @Value("${app.jwt.ttlSeconds:86400}") // 1 day
    private long jwtTtlSeconds;

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@RequestBody AuthDtos.RegisterRequest req) {
        if (req.email == null || req.password == null || req.email.isBlank() || req.password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and password required");
        }
        String email = req.email.toLowerCase().trim();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already registered");
        }

        AppUser u = new AppUser();
        u.setEmail(email);
        u.setName(req.name);

        // Set role with validation (accept common synonyms from UI)
        String role = req.role != null && !req.role.isBlank() ? req.role.toUpperCase().trim() : "STUDENT";
        // Normalize common aliases
        if ("USER".equals(role))
            role = "STUDENT"; // old UI label
        if ("ORGANISER".equals(role))
            role = "ORGANIZER"; // AU spelling
        if (!VALID_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "invalid role. Valid roles: STUDENT, ORGANIZER, ADMIN");
        }
        u.setRole(role);

        String salt = BCrypt.gensalt();
        u.setPasswordHash(BCrypt.hashpw(req.password, salt));
        users.save(u);

        String token = JwtUtil.createToken(u.getEmail(), u.getRole(), jwtSecret, jwtTtlSeconds);
        AuthDtos.AuthResponse resp = new AuthDtos.AuthResponse();
        resp.token = token;
        resp.user = UserDto.from(u);
        return resp;
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@RequestBody AuthDtos.LoginRequest req) {
        if (req.email == null || req.password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and password required");
        }
        AppUser u = users.findByEmail(req.email.toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));
        if (!BCrypt.checkpw(req.password, u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        // enforce flags
        if (!u.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "account deactivated");
        }
        if (u.isBanned()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "account banned");
        }
        String token = JwtUtil.createToken(u.getEmail(), u.getRole(), jwtSecret, jwtTtlSeconds);
        AuthDtos.AuthResponse resp = new AuthDtos.AuthResponse();
        resp.token = token;
        resp.user = UserDto.from(u);
        return resp;
        // existing code returns token
    }

    @GetMapping("/me")
    public au.edu.rmit.sept.webapp.dto.UserDto me(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        String token = auth.substring("Bearer ".length()).trim();
        java.util.Map<String, Object> claims = au.edu.rmit.sept.webapp.util.JwtUtil.verify(token, jwtSecret);
        String email = String.valueOf(claims.get("sub"));
        if (email == null || email.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "invalid token subject");
        }
        au.edu.rmit.sept.webapp.model.AppUser u = users.findByEmail(email.toLowerCase().trim())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED));
        return au.edu.rmit.sept.webapp.dto.UserDto.from(u);
    }
}
