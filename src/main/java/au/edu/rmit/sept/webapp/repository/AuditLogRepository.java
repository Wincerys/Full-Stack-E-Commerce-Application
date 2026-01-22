package au.edu.rmit.sept.webapp.repository;

import au.edu.rmit.sept.webapp.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
