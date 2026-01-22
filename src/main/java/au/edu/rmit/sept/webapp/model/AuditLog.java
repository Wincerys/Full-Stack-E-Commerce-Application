package au.edu.rmit.sept.webapp.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private Instant ts = Instant.now();

    @Column(nullable = false)
    private UUID actorUserId;

    @Column(nullable = false, length = 64)
    private String action; // EVENT_DELETE, EVENT_APPROVE, EVENT_REJECT, USER_BAN, USER_DEACTIVATE,
                           // USER_ROLE

    @Column
    private UUID subjectId; // eventId or userId

    @Lob
    private String meta; // optional JSON/text

    public UUID getId() {
        return id;
    }

    public Instant getTs() {
        return ts;
    }

    public void setTs(Instant ts) {
        this.ts = ts;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(UUID actorUserId) {
        this.actorUserId = actorUserId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public UUID getSubjectId() {
        return subjectId;
    }

    public void setSubjectId(UUID subjectId) {
        this.subjectId = subjectId;
    }

    public String getMeta() {
        return meta;
    }

    public void setMeta(String meta) {
        this.meta = meta;
    }
}
