package com.fams.backend.service;

import com.fams.backend.dto.request.RoomRequest;
import com.fams.backend.dto.response.RoomResponse;

import java.util.List;

public interface RoomService {
    List<RoomResponse> getAllRooms();

    RoomResponse getRoom(Long id);

    RoomResponse createRoom(RoomRequest request);

    RoomResponse updateRoom(Long id, RoomRequest request);

    void deleteRoom(Long id);
}
