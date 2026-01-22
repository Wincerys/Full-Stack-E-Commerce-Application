package au.edu.rmit.sept.webapp.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Rsvp;
import au.edu.rmit.sept.webapp.model.RsvpStatus;

public interface RsvpRepository extends JpaRepository<Rsvp, UUID> {
    // id-based (you can keep these if already used elsewhere)
    List<Rsvp> findByUserId(UUID userId);

    Optional<Rsvp> findByUserIdAndEventId(UUID userId, UUID eventId);

    // entity-based (used by controllers above)
    List<Rsvp> findByUser(AppUser user);

    Optional<Rsvp> findByUserAndEvent(AppUser user, Event event);

    // bulk for event deletion
    List<Rsvp> findByEvent(Event event);

    void deleteAllByEvent(Event event);

    long countByUser(AppUser user);
    long countByUserAndStatus(AppUser user, RsvpStatus status);

    @EntityGraph(attributePaths = { "user" })
    List<Rsvp> findByEvent_Id(UUID eventId);

    @EntityGraph(attributePaths = { "event" })
    List<Rsvp> findByUser_EmailIgnoreCase(String email);

    // Admin query
    java.util.List<Rsvp> findByEventId(UUID eventId);
}
