package au.edu.rmit.sept.webapp.repository;

import au.edu.rmit.sept.webapp.model.Photo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByEventIdOrderByCreatedAtAsc(UUID eventId);

    java.util.List<Photo> findByEventId(UUID eventId);
}
