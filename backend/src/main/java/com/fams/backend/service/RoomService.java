package com.fams.backend.service;

import com.fams.backend.dto.request.RoomRequest;
import com.fams.backend.dto.response.RoomAvailabilityResponse;
import com.fams.backend.dto.response.RoomResponse;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

public interface RoomService {
    List<RoomResponse> getAllRooms();

    RoomResponse getRoom(Long id);

    RoomResponse createRoom(RoomRequest request);

    RoomResponse updateRoom(Long id, RoomRequest request);

    void deleteRoom(Long id);

    /**
     * Get all rooms with availability status for a specific date and slot
     */
    List<RoomAvailabilityResponse> getRoomAvailability(LocalDate date, Integer slotNumber);

    /**
     * Get IDs of rooms that are currently in use at the given date+time,
     * using the actual SlotType start/end times from the database.
     */
    Set<Long> getInUseRoomIds(LocalDate date, LocalTime time);
}

