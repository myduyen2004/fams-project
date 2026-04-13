package com.fams.backend.controller;

import com.fams.backend.entity.RoomWiFiAccessPoint;
import com.fams.backend.entity.WiFiAccessPoint;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.RoomWiFiAccessPointRepository;
import com.fams.backend.repository.WiFiAccessPointRepository;
import com.fams.backend.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
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
    private final RoomRepository roomRepository;

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
        private Integer roomCount;
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
        private WiFiApDTO accessPoint;
        private Integer signalStrength;
        private Boolean isPrimary;
        private String positionNote;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignApToRoomRequest {
        private Long accessPointId;
        private Integer signalStrength;
        private Boolean isPrimary;
        private String positionNote;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkStatusUpdateRequest {
        private List<Long> ids;
        private String status;
    }

    // ========================================
    // Endpoints
    // ========================================

    /**
     * Get all WiFi access points
     */
    @GetMapping
    @Transactional(readOnly = true)
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
            throw new BadRequestException("Địa chỉ MAC (BSSID) này đã tồn tại trong hệ thống");
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
                    // Check duplicate BSSID if it is changed
                    if (!ap.getBssid().equalsIgnoreCase(request.getBssid()) && wifiApRepository.existsByBssid(request.getBssid())) {
                        throw new BadRequestException("Địa chỉ MAC (BSSID) này đã tồn tại trong hệ thống");
                    }
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
     * Update status for multiple access points
     */
    @PatchMapping("/bulk-status")
    @Operation(summary = "Bulk update AP status", description = "Update the status for multiple Access Points")
    public ResponseEntity<Void> bulkUpdateStatus(@RequestBody BulkStatusUpdateRequest request) {
        List<WiFiAccessPoint> aps = wifiApRepository.findAllById(request.getIds());
        aps.forEach(ap -> {
            try {
                ap.setStatus(WiFiAccessPoint.WiFiStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status provided in bulk update: {}", request.getStatus());
            }
        });
        wifiApRepository.saveAll(aps);
        log.info("Bulk updated {} APs to status {}", aps.size(), request.getStatus());
        return ResponseEntity.ok().build();
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
    @GetMapping("/room/{roomId}/assign")
    @Transactional(readOnly = true)
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
    @Transactional
    @Operation(summary = "Assign AP to room", description = "Assign a WiFi access point to a room")
    public ResponseEntity<RoomWiFiApDTO> assignToRoom(
            @PathVariable Long roomId,
            @RequestBody AssignApToRoomRequest request) {

        WiFiAccessPoint ap = wifiApRepository.findById(request.getAccessPointId())
                .orElseThrow(() -> new RuntimeException("Access Point not found"));

        com.fams.backend.entity.Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // If this is set as primary, unset other primaries for this room
        if (Boolean.TRUE.equals(request.getIsPrimary())) {
            List<RoomWiFiAccessPoint> existing = roomWifiRepository.findByRoomId(roomId);
            existing.forEach(e -> {
                if (Boolean.TRUE.equals(e.getIsPrimary())) {
                    e.setIsPrimary(false);
                    roomWifiRepository.save(e);
                }
            });
        }

        RoomWiFiAccessPoint assignment = RoomWiFiAccessPoint.builder()
                .room(room)
                .wifiAccessPoint(ap)
                .signalStrength(request.getSignalStrength())
                .isPrimary(request.getIsPrimary() != null ? request.getIsPrimary() : false)
                .positionNote(request.getPositionNote())
                .build();

        assignment = roomWifiRepository.save(assignment);
        log.info("Assigned AP {} to room {}", ap.getName(), room.getName());

        return ResponseEntity.ok(toRoomApDto(assignment));
    }

    /**
     * Update an access point assignment in a room
     */
    @PutMapping("/room/{roomId}/assign/{assignmentId}")
    @Transactional
    @Operation(summary = "Update AP assignment", description = "Update details of an AP assignment (signal strength, position note)")
    public ResponseEntity<RoomWiFiApDTO> updateAssignment(
            @PathVariable Long roomId,
            @PathVariable Long assignmentId,
            @RequestBody AssignApToRoomRequest request) {

        RoomWiFiAccessPoint assignment = roomWifiRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        if (!assignment.getRoom().getId().equals(roomId)) {
            return ResponseEntity.badRequest().build();
        }

        assignment.setSignalStrength(request.getSignalStrength());
        assignment.setPositionNote(request.getPositionNote());

        // If primary status is being changed
        if (request.getIsPrimary() != null && request.getIsPrimary() != assignment.getIsPrimary()) {
            if (Boolean.TRUE.equals(request.getIsPrimary())) {
                // Unset others
                List<RoomWiFiAccessPoint> existing = roomWifiRepository.findByRoomId(roomId);
                existing.forEach(e -> {
                    if (!e.getId().equals(assignmentId) && Boolean.TRUE.equals(e.getIsPrimary())) {
                        e.setIsPrimary(false);
                        roomWifiRepository.save(e);
                    }
                });
            }
            assignment.setIsPrimary(request.getIsPrimary());
        }

        assignment = roomWifiRepository.save(assignment);
        log.info("Updated AP assignment {} in room {}", assignmentId, roomId);

        return ResponseEntity.ok(toRoomApDto(assignment));
    }

    /**
     * Remove an access point assignment from a room
     */
    @DeleteMapping("/room/{roomId}/assign/{assignmentId}")
    @Transactional
    @Operation(summary = "Unassign AP", description = "Remove an AP assignment from a room")
    public ResponseEntity<Void> unassignFromRoom(
            @PathVariable Long roomId,
            @PathVariable Long assignmentId) {

        if (!roomWifiRepository.existsById(assignmentId)) {
            return ResponseEntity.notFound().build();
        }

        roomWifiRepository.deleteById(assignmentId);
        log.info("Unassigned AP mapping {} from room {}", assignmentId, roomId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Set a specific AP assignment as primary for a room
     */
    @PutMapping("/room/{roomId}/assign/{assignmentId}/primary")
    @Transactional
    @Operation(summary = "Set primary AP", description = "Set a specific AP as primary for a room")
    public ResponseEntity<Void> setPrimaryAp(
            @PathVariable Long roomId,
            @PathVariable Long assignmentId) {

        List<RoomWiFiAccessPoint> existing = roomWifiRepository.findByRoomId(roomId);
        boolean found = false;

        for (RoomWiFiAccessPoint rwap : existing) {
            if (rwap.getId().equals(assignmentId)) {
                rwap.setIsPrimary(true);
                found = true;
            } else {
                rwap.setIsPrimary(false);
            }
            roomWifiRepository.save(rwap);
        }

        if (!found) {
            return ResponseEntity.notFound().build();
        }

        log.info("Set assignment {} as primary for room {}", assignmentId, roomId);
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
                .roomCount(ap.getRoomWiFiAccessPoints() != null ? ap.getRoomWiFiAccessPoints().size() : 0)
                .build();
    }

    private RoomWiFiApDTO toRoomApDto(RoomWiFiAccessPoint rap) {
        return RoomWiFiApDTO.builder()
                .id(rap.getId())
                .apId(rap.getWifiAccessPoint().getId())
                .accessPoint(toDto(rap.getWifiAccessPoint()))
                .signalStrength(rap.getSignalStrength())
                .isPrimary(rap.getIsPrimary())
                .positionNote(rap.getPositionNote())
                .build();
    }
}
