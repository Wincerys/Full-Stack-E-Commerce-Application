package au.edu.rmit.sept.webapp.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import au.edu.rmit.sept.webapp.model.AppUser;
import au.edu.rmit.sept.webapp.model.Badge;
import au.edu.rmit.sept.webapp.model.UserBadge;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UUID> {
    List<UserBadge> findByUser(AppUser user);
    Optional<UserBadge> findByUserAndBadge(AppUser user, Badge badge);
    boolean existsByUserAndBadge(AppUser user, Badge badge);
    long countByUser(AppUser user);
}