package au.edu.rmit.sept.webapp.repository;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Event;
import au.edu.rmit.sept.webapp.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    Optional<Feedback> findByUserAndEvent(AppUser user, Event event);
    List<Feedback> findByEventOrderByCreatedAtDesc(Event event);
}
