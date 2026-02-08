package com.fams.backend.service.impl;

import com.fams.backend.dto.request.RoomRequest;
import com.fams.backend.dto.response.RoomAvailabilityResponse;
import com.fams.backend.dto.response.RoomResponse;
import com.fams.backend.entity.Room;
import com.fams.backend.entity.ScheduleRequest;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.ScheduleRequestRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import com.fams.backend.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final ScheduleRequestRepository scheduleRequestRepository;

    @Override
    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public RoomResponse getRoom(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng học"));
        return convertToResponse(room);
    }

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        if (roomRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã phòng đã tồn tại: " + request.getCode());
        }

        Room room = Room.builder()
                .code(request.getCode())
                .name(request.getName())
                .capacity(request.getCapacity())
                .building(request.getBuilding())
                .floor(request.getFloor())
                .type(request.getType())
                .status(request.getStatus())
                .gridRow(request.getGridRow())
                .gridCol(request.getGridCol())
                .gridRowSpan(request.getGridRowSpan() != null ? request.getGridRowSpan() : 1)
                .gridColSpan(request.getGridColSpan() != null ? request.getGridColSpan() : 1)
                .build();

        return convertToResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phòng học"));

        if (!room.getCode().equals(request.getCode()) && roomRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã phòng đã tồn tại: " + request.getCode());
        }

        room.setCode(request.getCode());
        room.setName(request.getName());
        room.setCapacity(request.getCapacity());
        room.setBuilding(request.getBuilding());
        room.setFloor(request.getFloor());
        room.setType(request.getType());
        room.setStatus(request.getStatus());
        room.setGridRow(request.getGridRow());
        room.setGridCol(request.getGridCol());
        room.setGridRowSpan(request.getGridRowSpan() != null ? request.getGridRowSpan() : 1);
        room.setGridColSpan(request.getGridColSpan() != null ? request.getGridColSpan() : 1);

        return convertToResponse(roomRepository.save(room));
    }

    @Override
    @Transactional
    public void deleteRoom(Long id) {
        if (!roomRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy phòng học");
        }
        roomRepository.deleteById(id);
    }

    @Override
    public List<RoomAvailabilityResponse> getRoomAvailability(LocalDate date, Integer slotNumber) {
        // Get busy room IDs from timetable slots (actual scheduled classes)
        List<Long> busyRoomIds = timetableSlotRepository.findBusyRoomIds(date, slotNumber);
        Set<Long> busyRoomIdSet = new HashSet<>(busyRoomIds);

        // Also get busy room IDs from schedule requests with PENDING or APPROVED status
        List<ScheduleRequest.RequestStatus> activeStatuses = Arrays.asList(
                ScheduleRequest.RequestStatus.PENDING,
                ScheduleRequest.RequestStatus.APPROVED);
        List<Long> requestedRoomIds = scheduleRequestRepository.findBusyRoomIdsByDateAndSlotAndStatuses(
                date, slotNumber, activeStatuses);
        busyRoomIdSet.addAll(requestedRoomIds);

        // Get all active rooms and mark availability
        return roomRepository.findAll().stream()
                .filter(room -> room.getStatus() == Room.RoomStatus.ACTIVE)
                .map(room -> convertToAvailabilityResponse(room, !busyRoomIdSet.contains(room.getId())))
                .collect(Collectors.toList());
    }

    private RoomResponse convertToResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .code(room.getCode())
                .name(room.getName())
                .capacity(room.getCapacity())
                .building(room.getBuilding())
                .floor(room.getFloor())
                .type(room.getType())
                .status(room.getStatus())
                .gridRow(room.getGridRow())
                .gridCol(room.getGridCol())
                .gridRowSpan(room.getGridRowSpan())
                .gridColSpan(room.getGridColSpan())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }

    private RoomAvailabilityResponse convertToAvailabilityResponse(Room room, boolean isAvailable) {
        return RoomAvailabilityResponse.builder()
                .id(room.getId())
                .code(room.getCode())
                .name(room.getName())
                .capacity(room.getCapacity())
                .building(room.getBuilding())
                .floor(room.getFloor())
                .type(room.getType())
                .status(room.getStatus())
                .gridRow(room.getGridRow())
                .gridCol(room.getGridCol())
                .gridRowSpan(room.getGridRowSpan())
                .gridColSpan(room.getGridColSpan())
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .isAvailable(isAvailable)
                .build();
    }
}
