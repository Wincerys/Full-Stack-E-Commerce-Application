package au.edu.rmit.sept.webapp.dto;

public class AuthDtos {
    public static class RegisterRequest {
        public String email;
        public String password;
        public String name;
        public String role;
    }
    public static class LoginRequest {
        public String email;
        public String password;
    }
    public static class AuthResponse {
        public String token;
        public UserDto user;
    }
}