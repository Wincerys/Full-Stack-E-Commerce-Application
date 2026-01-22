package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.UserDto;
import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserApi {

    private final UserRepository repo;

    public UserApi(UserRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<UserDto> list() {
        return repo.findAll().stream().map(UserDto::from).toList();
    }

    @PostMapping
    public UserDto create(@RequestBody UserDto dto) {
        if (dto == null || dto.email == null || dto.email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email is required");
        }
        AppUser u = new AppUser();
        u.setName(dto.name);
        u.setEmail(dto.email); // AppUser#setEmail lower-cases/trim
        // Optional: default role for manual creations
        if (dto.role == null || dto.role.isBlank()) {
            u.setRole("STUDENT");
        } else {
            u.setRole(dto.role);
        }
        // NOTE: password is managed via AuthApi (register); this endpoint is for simple CRUD/demo only
        return UserDto.from(repo.save(u));
    }

    @GetMapping("/{id}")
    public UserDto get(@PathVariable UUID id) {
        AppUser u = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return UserDto.from(u);
    }
}
