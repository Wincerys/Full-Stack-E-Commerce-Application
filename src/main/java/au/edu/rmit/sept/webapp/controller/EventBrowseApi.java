package au.edu.rmit.sept.webapp.controller;

import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.service.RecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventBrowseApi {

    private final RecommendationService recommendationService;

    public EventBrowseApi(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<Event>> upcoming(
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 50) limit = 50;
        return ResponseEntity.ok(recommendationService.upcoming(limit));
    }

    // Temporary: require email param instead of auth
    @GetMapping("/recommended")
    public ResponseEntity<List<Event>> recommended(
            @RequestParam(name = "email") String email,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        if (limit < 1) limit = 1;
        if (limit > 50) limit = 50;
        return ResponseEntity.ok(recommendationService.recommendedForUser(email, limit));
    }
}
