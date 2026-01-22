package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.dto.PhotoDto;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Photo;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.PhotoRepository;
import au.edu.rmit.sept.webapp.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api")
public class PhotoApi {

    private final EventRepository eventRepo;
    private final PhotoRepository photoRepo;

    public PhotoApi(EventRepository eventRepo, PhotoRepository photoRepo) {
        this.eventRepo = eventRepo;
        this.photoRepo = photoRepo;
    }

    @Value("${app.jwt.secret:dev-super-secret-change-me}")
    private String jwtSecret;

    @Value("${app.uploadDir:uploads}")
    private String uploadDir;

    // ========== Helpers ==========

    private String ensureAuthAndGetEmail(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        String token = auth.substring("Bearer ".length()).trim();
        Map<String, Object> claims = JwtUtil.verify(token, jwtSecret);
        Object sub = claims.get("sub");
        if (!(sub instanceof String s) || s.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token");
        }
        return s.toLowerCase();
    }

    private void ensureOrganizer(HttpServletRequest req, Event ev) {
        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        String token = auth.substring("Bearer ".length()).trim();
        Map<String, Object> claims = JwtUtil.verify(token, jwtSecret);
        String role = String.valueOf(claims.get("role")).toUpperCase();
        if ("ADMIN".equals(role))
            return; // admin can manage photos for any event

        String userEmail = Optional.ofNullable((String) claims.get("sub")).orElse("").toLowerCase();
        String organizerEmail = Optional.ofNullable(ev.getOrganizerEmail()).orElse("").toLowerCase();
        if (!organizerEmail.equalsIgnoreCase(userEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only organizer/admin can modify photos for this event");
        }
    }

    private Path eventFolder(UUID eventId) throws IOException {
        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path folder = base.resolve(eventId.toString());
        Files.createDirectories(folder);
        return folder;
    }

    private boolean isImage(MultipartFile file) {
        String ct = Optional.ofNullable(file.getContentType()).orElse("");
        return ct.equalsIgnoreCase(MediaType.IMAGE_JPEG_VALUE) || ct.equalsIgnoreCase(MediaType.IMAGE_PNG_VALUE);
    }

    // ========== API ==========

    @GetMapping("/events/{eventId}/photos")
    public List<PhotoDto> list(@PathVariable UUID eventId) {
        List<Photo> photos = photoRepo.findByEventIdOrderByCreatedAtAsc(eventId);
        List<PhotoDto> dtos = new ArrayList<>();
        for (Photo p : photos)
            dtos.add(PhotoDto.from(p));
        return dtos;
    }

    @PostMapping(path = "/events/{eventId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<PhotoDto> upload(
            @PathVariable UUID eventId,
            @RequestParam("files") List<MultipartFile> files,
            HttpServletRequest request) throws IOException {
        Event ev = eventRepo.findById(eventId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        ensureOrganizer(request, ev);

        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No files uploaded");
        }

        List<PhotoDto> result = new ArrayList<>();
        Path folder = eventFolder(eventId);

        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;
            if (!isImage(file)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG/PNG allowed");
            }
            if (file.getSize() > 10 * 1024 * 1024L) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File too large (max 10MB)");
            }

            String ext = MediaType.IMAGE_PNG_VALUE.equalsIgnoreCase(file.getContentType()) ? ".png" : ".jpg";
            String cleanName = StringUtils.hasText(file.getOriginalFilename())
                    ? Paths.get(file.getOriginalFilename()).getFileName().toString()
                    : "upload";
            UUID id = UUID.randomUUID();
            Path dest = folder.resolve(id.toString() + ext);

            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            Photo p = new Photo();
            p.setId(id);
            p.setEvent(ev);
            p.setOriginalFilename(cleanName);
            p.setContentType(file.getContentType());
            p.setSizeBytes(file.getSize());
            p.setStoragePath(dest.toString());
            photoRepo.save(p);

            result.add(PhotoDto.from(p));
        }

        return result;
    }

    @DeleteMapping("/photos/{photoId}")
    public ResponseEntity<Void> delete(@PathVariable UUID photoId, HttpServletRequest request) throws IOException {
        Photo p = photoRepo.findById(photoId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Event ev = p.getEvent();
        ensureOrganizer(request, ev);

        try {
            Files.deleteIfExists(Paths.get(p.getStoragePath()));
        } catch (IOException ignored) {
        }
        photoRepo.delete(p);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/photos/{photoId}/raw")
    public ResponseEntity<FileSystemResource> raw(@PathVariable UUID photoId) {
        Photo p = photoRepo.findById(photoId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        FileSystemResource resource = new FileSystemResource(p.getStoragePath());
        if (!resource.exists())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(p.getContentType()));
        headers.setCacheControl(CacheControl.noCache());
        return new ResponseEntity<>(resource, headers, HttpStatus.OK);
    }
}
