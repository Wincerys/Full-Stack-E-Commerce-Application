package au.edu.rmit.sept.webapp.dto;

import au.edu.rmit.sept.webapp.model.AppUser;

import java.util.UUID;

public class UserDto {
    public UUID id;
    public String email;
    public String role;
    public String name;
    public boolean active;
    public boolean banned;

    public static UserDto from(AppUser u) {
        UserDto d = new UserDto();
        d.id = u.getId();
        d.email = u.getEmail();
        d.role = u.getRole();
        d.name = u.getName();
        d.active = u.isActive();
        d.banned = u.isBanned();
        return d;
    }
}