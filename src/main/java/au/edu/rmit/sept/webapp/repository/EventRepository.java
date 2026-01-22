package au.edu.rmit.sept.webapp.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.Collection;
import au.edu.rmit.sept.webapp.model.Event;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {
    long countByApprovalStatus(String approvalStatus);

    // Upcoming (future) events ordered soonest-first, APPROVED only
       @Query("""
              select e
              from Event e
              where e.startTime > CURRENT_TIMESTAMP
              and e.approvalStatus = 'APPROVED'
              order by e.startTime asc
              """)
       List<Event> findUpcoming(Pageable pageable);

       // Upcoming by categories, ordered soonest-first, APPROVED only
       @Query("""
              select e
              from Event e
              where e.startTime > CURRENT_TIMESTAMP
                and e.approvalStatus = 'APPROVED'
                and e.category in :cats
              order by e.startTime asc
              """)
       List<Event> findUpcomingByCategories(Collection<String> cats, Pageable pageable);


    // Organizer's own events (to seed interests)
    List<Event> findByOrganizerEmailOrderByStartTimeDesc(String organizerEmail, PageRequest pageRequest);
    
    List<Event> findByOrganizerEmailIgnoreCase(String organizerEmail);
    
    long countByOrganizerEmailIgnoreCase(String organizerEmail);

    // Admin queries
    java.util.List<Event> findByApprovalStatusOrderByStartTimeAsc(String approvalStatus);

    java.util.List<Event> findAllByOrderByStartTimeAsc();
}
