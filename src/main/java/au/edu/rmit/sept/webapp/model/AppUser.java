package au.edu.rmit.sept.webapp.model;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Table(name = "app_user", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
public class AppUser {
   @Column(nullable = false)
   private boolean active = true;

   @Column(nullable = false)
   private boolean banned = false;

   @Id
   @GeneratedValue
   private UUID id;

   @Column(nullable = false, unique = true)
   private String email;

   @Column(nullable = false, length = 72) // bcrypt length
   private String passwordHash;

   @Column(nullable = false)
   private String role = "STUDENT"; // future: ADMIN

   @Column
   private String name;

   @Column(name = "created_at")
   private LocalDateTime createdAt;

   @PrePersist
   public void prePersist() {
      if (createdAt == null) createdAt = LocalDateTime.now();
   }

   public boolean isActive() {
      return active;
   }

   public void setActive(boolean active) {
      this.active = active;
   }

   public boolean isBanned() {
      return banned;
   }

   public void setBanned(boolean banned) {
      this.banned = banned;
   }

   public UUID getId() {
      return id;
   }

   public void setId(UUID id) {
      this.id = id;
   }

   public String getEmail() {
      return email;
   }

   public void setEmail(String email) {
      this.email = email == null ? null : email.toLowerCase().trim();
   }

   public String getPasswordHash() {
      return passwordHash;
   }

   public void setPasswordHash(String passwordHash) {
      this.passwordHash = passwordHash;
   }

   public String getRole() {
      return role;
   }

   public void setRole(String role) {
      this.role = role;
   }

   public String getName() {
      return name;
   }

   public void setName(String name) {
      this.name = name;
   }

   public LocalDateTime getCreatedAt() {
      return createdAt;
   }

   public void setCreatedAt(LocalDateTime createdAt) {
      this.createdAt = createdAt;
   }
}
