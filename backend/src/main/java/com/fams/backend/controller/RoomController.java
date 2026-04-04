package com.fams.backend.controller;

import com.fams.backend.dto.request.RoomRequest;
import com.fams.backend.dto.response.RoomAvailabilityResponse;
import com.fams.backend.dto.response.RoomResponse;
import com.fams.backend.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<List<RoomResponse>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/availability")
    public ResponseEntity<List<RoomAvailabilityResponse>> getRoomAvailability(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam Integer slotNumber) {
        return ResponseEntity.ok(roomService.getRoomAvailability(date, slotNumber));
    }

    /**
     * Get IDs of rooms that are currently in use, based on the actual slot times
     * from the database (SlotType.startTime / endTime).
     *
     * @param date The date to check (ISO format: YYYY-MM-DD)
     * @param time The time to check (HH:mm)
     * @return Set of room IDs that are currently occupied
     */
    @GetMapping("/currently-in-use")
    public ResponseEntity<Set<Long>> getCurrentlyInUseRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime time) {
        return ResponseEntity.ok(roomService.getInUseRoomIds(date, time));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomResponse> getRoom(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoom(id));
    }

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(@RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.createRoom(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomResponse> updateRoom(@PathVariable Long id, @RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.updateRoom(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
