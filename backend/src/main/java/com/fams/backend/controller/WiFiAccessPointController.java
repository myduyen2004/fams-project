package com.fams.backend.controller;

import com.fams.backend.entity.RoomWiFiAccessPoint;
import com.fams.backend.entity.WiFiAccessPoint;
import com.fams.backend.repository.RoomWiFiAccessPointRepository;
import com.fams.backend.repository.WiFiAccessPointRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for WiFi Access Point Management
 */
@Slf4j
@RestController
@RequestMapping("/api/wifi-access-points")
@RequiredArgsConstructor
@Tag(name = "WiFi Access Points", description = "WiFi AP management for attendance location verification")
public class WiFiAccessPointController {

    private final WiFiAccessPointRepository wifiApRepository;
    private final RoomWiFiAccessPointRepository roomWifiRepository;

    // ========================================
    // DTOs
    // ========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WiFiApDTO {
        private Long id;
        private String ssid;
        private String bssid;
        private String name;
        private String location;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateWiFiApRequest {
        private String ssid;
        private String bssid;
        private String name;
        private String location;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomWiFiApDTO {
        private Long id;
        private Long apId;
        private String ssid;
        private String bssid;
        private Integer signalStrength;
        private Boolean isPrimary;
        private String positionNote;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignApToRoomRequest {
        private Long wifiApId;
        private Integer signalStrength;
        private Boolean isPrimary;
        private String positionNote;
    }

    // ========================================
    // Endpoints
    // ========================================

    /**
     * Get all WiFi access points
     */
    @GetMapping
    @Operation(summary = "List all APs", description = "Get all WiFi access points")
    public ResponseEntity<List<WiFiApDTO>> getAllAccessPoints() {
        List<WiFiApDTO> aps = wifiApRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(aps);
    }

    /**
     * Get a single access point
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get AP", description = "Get a WiFi access point by ID")
    public ResponseEntity<WiFiApDTO> getAccessPoint(@PathVariable Long id) {
        return wifiApRepository.findById(id)
                .map(ap -> ResponseEntity.ok(toDto(ap)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new access point
     */
    @PostMapping
    @Operation(summary = "Create AP", description = "Create a new WiFi access point")
    public ResponseEntity<WiFiApDTO> createAccessPoint(@RequestBody CreateWiFiApRequest request) {
        if (wifiApRepository.existsByBssid(request.getBssid())) {
            return ResponseEntity.badRequest().build();
        }

        WiFiAccessPoint ap = WiFiAccessPoint.builder()
                .ssid(request.getSsid())
                .bssid(request.getBssid())
                .name(request.getName())
                .location(request.getLocation())
                .status(WiFiAccessPoint.WiFiStatus.ACTIVE)
                .build();

        ap = wifiApRepository.save(ap);
        log.info("Created WiFi access point: {} ({})", ap.getName(), ap.getBssid());

        return ResponseEntity.ok(toDto(ap));
    }

    /**
     * Update an access point
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update AP", description = "Update a WiFi access point")
    public ResponseEntity<WiFiApDTO> updateAccessPoint(
            @PathVariable Long id,
            @RequestBody CreateWiFiApRequest request) {

        return wifiApRepository.findById(id)
                .map(ap -> {
                    ap.setSsid(request.getSsid());
                    ap.setBssid(request.getBssid());
                    ap.setName(request.getName());
                    ap.setLocation(request.getLocation());
                    ap = wifiApRepository.save(ap);
                    return ResponseEntity.ok(toDto(ap));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete an access point
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete AP", description = "Delete a WiFi access point")
    public ResponseEntity<Void> deleteAccessPoint(@PathVariable Long id) {
        if (!wifiApRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        wifiApRepository.deleteById(id);
        log.info("Deleted WiFi access point: {}", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get access points for a room
     */
    @GetMapping("/room/{roomId}")
    @Operation(summary = "Get room APs", description = "Get all access points assigned to a room")
    public ResponseEntity<List<RoomWiFiApDTO>> getRoomAccessPoints(@PathVariable Long roomId) {
        List<RoomWiFiApDTO> roomAps = roomWifiRepository.findByRoomId(roomId).stream()
                .map(this::toRoomApDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(roomAps);
    }

    /**
     * Assign an access point to a room
     */
    @PostMapping("/room/{roomId}/assign")
    @Operation(summary = "Assign AP to room", description = "Assign a WiFi access point to a room")
    public ResponseEntity<RoomWiFiApDTO> assignToRoom(
            @PathVariable Long roomId,
            @RequestBody AssignApToRoomRequest request) {

        // This would need RoomRepository injected for full implementation
        // For now, returning a placeholder
        return ResponseEntity.ok().build();
    }

    // ========================================
    // Mappers
    // ========================================

    private WiFiApDTO toDto(WiFiAccessPoint ap) {
        return WiFiApDTO.builder()
                .id(ap.getId())
                .ssid(ap.getSsid())
                .bssid(ap.getBssid())
                .name(ap.getName())
                .location(ap.getLocation())
                .status(ap.getStatus().name())
                .build();
    }

    private RoomWiFiApDTO toRoomApDto(RoomWiFiAccessPoint rap) {
        return RoomWiFiApDTO.builder()
                .id(rap.getId())
                .apId(rap.getWifiAccessPoint().getId())
                .ssid(rap.getWifiAccessPoint().getSsid())
                .bssid(rap.getWifiAccessPoint().getBssid())
                .signalStrength(rap.getSignalStrength())
                .isPrimary(rap.getIsPrimary())
                .positionNote(rap.getPositionNote())
                .build();
    }
}
