package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * RoomWiFiAccessPoint (WiFi Access Point trong phòng)
 * Junction table giữa Room và WiFiAccessPoint
 */
@Entity
@Table(name = "room_wifi_access_points", indexes = {
        @Index(name = "idx_room_wifi_room", columnList = "room_id"),
        @Index(name = "idx_room_wifi_ap", columnList = "wifi_access_point_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_room_wifi", columnNames = { "room_id", "wifi_access_point_id" })
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomWiFiAccessPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phòng
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // WiFi Access Point
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wifi_access_point_id", nullable = false)
    private WiFiAccessPoint wifiAccessPoint;

    // Độ mạnh tín hiệu trung bình (dBm) - để xác định AP chính của phòng
    private Integer signalStrength;

    // Là AP chính của phòng này không
    @Column(nullable = false)
    @Builder.Default
    private Boolean isPrimary = false;

    // Ghi chú về vị trí AP trong phòng
    @Column(length = 200)
    private String positionNote;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
