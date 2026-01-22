package au.edu.rmit.sept.webapp.service;

import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.repository.EventRepository;
import au.edu.rmit.sept.webapp.repository.RsvpRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private final EventRepository eventRepository;
    private final RsvpRepository rsvpRepository;

    public RecommendationService(EventRepository eventRepository,
                                 RsvpRepository rsvpRepository) {
        this.eventRepository = eventRepository;
        this.rsvpRepository = rsvpRepository;
    }

    public List<Event> upcoming(int limit) {
        return eventRepository.findUpcoming(PageRequest.of(0, Math.max(1, Math.min(limit, 50))));
    }

    public List<Event> recommendedForUser(String email, int limit) {
        // Build interest categories from RSVPs + created events
        Set<String> cats = new HashSet<>();
        for (Rsvp r : rsvpRepository.findByUser_EmailIgnoreCase(email)) {
            if (r.getEvent() != null && r.getEvent().getCategory() != null && !r.getEvent().getCategory().isBlank()) {
                cats.add(r.getEvent().getCategory());
            }
        }
        eventRepository.findByOrganizerEmailIgnoreCase(email).forEach(ev -> {
            if (ev.getCategory() != null && !ev.getCategory().isBlank()) {
                cats.add(ev.getCategory());
            }
        });

        if (cats.isEmpty()) return List.of();

        return eventRepository
                .findUpcomingByCategories(cats, PageRequest.of(0, Math.max(1, Math.min(limit, 50))))
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
    }
}
