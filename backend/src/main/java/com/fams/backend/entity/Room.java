package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Room (Phòng học)
 * Represents a physical room for classes
 */
@Entity
@Table(name = "rooms", indexes = {
        @Index(name = "idx_room_code", columnList = "code"),
        @Index(name = "idx_room_building", columnList = "building"),
        @Index(name = "idx_room_type", columnList = "type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã phòng (e.g., "A101", "LAB301")
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Tên phòng
    @Column(nullable = false, length = 100)
    private String name;

    // Sức chứa
    @Column(nullable = false)
    private Integer capacity;

    // Tòa nhà
    @Column(length = 50)
    private String building;

    // Mô tả phòng (e.g., "Có máy chiếu", "Gần thang máy")
    @Column(length = 500)
    private String description;

    // Tầng
    private Integer floor;

    // Grid position fields for floor plan layout
    @Column(name = "grid_row")
    private Integer gridRow;

    @Column(name = "grid_col")
    private Integer gridCol;

    @Column(name = "grid_row_span")
    @Builder.Default
    private Integer gridRowSpan = 1;

    @Column(name = "grid_col_span")
    @Builder.Default
    private Integer gridColSpan = 1;

    // Loại phòng
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoomType type = RoomType.CLASSROOM;

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Các WiFi Access Point trong phòng này (One-to-Many với junction table)
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RoomWiFiAccessPoint> roomWiFiAccessPoints = new ArrayList<>();

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum RoomType {
        PSEUDO_ROOM, // Phòng giả
        CLASSROOM, // Phòng học lý thuyết
        COMPUTER_LAB, // Phòng thực hành máy tính
    }

    public enum RoomStatus {
        ACTIVE,
        MAINTENANCE,
        INACTIVE, AVAILABLE
    }
}
