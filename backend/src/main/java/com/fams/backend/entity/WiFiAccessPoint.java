package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * WiFiAccessPoint (Điểm truy cập WiFi)
 * Represents a WiFi access point for location-based attendance verification
 */
@Entity
@Table(name = "wifi_access_points", indexes = {
        @Index(name = "idx_wifi_ssid", columnList = "ssid"),
        @Index(name = "idx_wifi_bssid", columnList = "bssid")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WiFiAccessPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên WiFi
    @Column(nullable = false, length = 100)
    private String ssid;

    // MAC Address (unique identifier)
    @Column(nullable = false, unique = true, length = 17)
    private String bssid;

    // Tên thân thiện
    @Column(length = 100)
    private String name;

    // Vị trí mô tả
    @Column(length = 200)
    private String location;

    // Liên kết với các phòng học (One-to-Many với junction table)
    @OneToMany(mappedBy = "wifiAccessPoint", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RoomWiFiAccessPoint> roomWiFiAccessPoints = new ArrayList<>();

    // Trạng thái
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private WiFiStatus status = WiFiStatus.ACTIVE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum WiFiStatus {
        ACTIVE,
        INACTIVE
    }
}
