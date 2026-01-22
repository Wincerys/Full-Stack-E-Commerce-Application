package au.edu.rmit.sept.webapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import au.edu.rmit.sept.webapp.model.Badge;

public class BadgeDto {
    public UUID id;
    public String name;
    public String description;
    public String icon;
    public String tier;
    public String criteriaType;
    public int criteriaValue;
    public LocalDateTime createdAt;

    // For earned badges
    public LocalDateTime earnedAt;
    public Integer progress;
    public Integer percentage;

    public static BadgeDto from(Badge badge) {
        BadgeDto dto = new BadgeDto();
        dto.id = badge.getId();
        dto.name = badge.getName();
        dto.description = badge.getDescription();
        dto.icon = badge.getIcon();
        dto.tier = badge.getTier();
        dto.criteriaType = badge.getCriteriaType();
        dto.criteriaValue = badge.getCriteriaValue();
        dto.createdAt = badge.getCreatedAt();
        return dto;
    }
}