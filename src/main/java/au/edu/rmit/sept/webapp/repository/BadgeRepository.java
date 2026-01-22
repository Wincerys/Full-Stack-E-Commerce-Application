package au.edu.rmit.sept.webapp.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import au.edu.rmit.sept.webapp.model.Badge;

public interface BadgeRepository extends JpaRepository<Badge, UUID> {
    Optional<Badge> findByName(String name);
    boolean existsByName(String name);
}