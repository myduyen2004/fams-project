package com.fams.backend.service.timetable.impl;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.TimetableSlot;
import com.fams.backend.entity.Room;
import com.fams.backend.entity.SlotType;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.SlotTypeRepository;
import com.fams.backend.repository.TimetableSlotRepository;
import com.fams.backend.service.timetable.TimetableSlotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableSlotServiceImpl implements TimetableSlotService {

        private final TimetableSlotRepository timetableSlotRepository;
        private final RoomRepository roomRepository;
        private final SlotTypeRepository slotTypeRepository;

        private final com.fams.backend.repository.SemesterRepository semesterRepository;

        @Override
        @Transactional
        public TimetableDTO.TimetableSlotDTO updateSlot(Long id, TimetableDTO.UpdateSlotRequest request) {
                log.info("Processing manual update for slot ID: {}", id);

                TimetableSlot slot = timetableSlotRepository.findById(id)
                                .orElseThrow(() -> new NotFoundException("Timetable slot not found with id: " + id));

                // 1. Validate Room
                Room newRoom = roomRepository.findById(request.getRoomId())
                                .orElseThrow(() -> new BadRequestException(
                                                "Room not found with id: " + request.getRoomId()));

                // 2. Validate SlotType/SlotNumber
                Long semesterId = slot.getClassSection().getSemester().getId();
                SlotType newSlotType = slotTypeRepository
                                .findBySemesterIdAndSlotIndex(semesterId, request.getSlotNumber())
                                .orElseThrow(() -> new BadRequestException(
                                                "Invalid slot number " + request.getSlotNumber()
                                                                + " for this semester"));

                // 3. Check Conflicts
                checkConflicts(slot, request.getDate(), request.getSlotNumber(), request.getRoomId());

                // 4. Update data
                slot.setDate(request.getDate());
                slot.setDayOfWeek(request.getDate().getDayOfWeek().getValue());
                slot.setSlotNumber(request.getSlotNumber());
                slot.setSlotType(newSlotType);
                slot.setRoom(newRoom);
                slot.setStatus(TimetableSlot.TimetableSlotStatus.SCHEDULED);

                TimetableSlot savedSlot = timetableSlotRepository.save(slot);
                return convertToDTO(savedSlot);
        }

        private void checkConflicts(TimetableSlot currentSlot, LocalDate newDate, Integer newSlotNumber,
                        Long newRoomId) {
                Long slotId = currentSlot.getId();
                String className = currentSlot.getClassSection().getClassName();
                Long lecturerId = currentSlot.getClassSection().getLecturer() != null
                                ? currentSlot.getClassSection().getLecturer().getId()
                                : null;

                // Check Room Conflict
                List<TimetableSlot> roomConflicts = timetableSlotRepository
                                .findByRoomIdAndDateAndSlotNumberAndStatusNot(
                                                newRoomId, newDate, newSlotNumber,
                                                TimetableSlot.TimetableSlotStatus.CANCELLED);
                if (roomConflicts.stream().anyMatch(s -> !s.getId().equals(slotId))) {
                        throw new BadRequestException(
                                        "Room is already occupied on " + newDate + " at slot " + newSlotNumber);
                }

                // Check Lecturer Conflict
                if (lecturerId != null) {
                        List<TimetableSlot> lecturerConflicts = timetableSlotRepository
                                        .findByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(
                                                        lecturerId, newDate, newSlotNumber,
                                                        TimetableSlot.TimetableSlotStatus.CANCELLED);
                        if (lecturerConflicts.stream().anyMatch(s -> !s.getId().equals(slotId))) {
                                throw new BadRequestException(
                                                "Lecturer is already teaching on " + newDate + " at slot "
                                                                + newSlotNumber);
                        }
                }

                // Check Class Conflict
                List<TimetableSlot> classConflicts = timetableSlotRepository
                                .existsByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(
                                                className, newDate, newSlotNumber,
                                                TimetableSlot.TimetableSlotStatus.CANCELLED)
                                                                ? timetableSlotRepository
                                                                                .findByClassSectionClassNameAndDateAndSlotNumberAndStatusNot(
                                                                                                className, newDate,
                                                                                                newSlotNumber,
                                                                                                TimetableSlot.TimetableSlotStatus.CANCELLED)
                                                                : Collections.emptyList();

                if (classConflicts.stream().anyMatch(s -> !s.getId().equals(slotId))) {
                        throw new BadRequestException(
                                        "Lớp " + className + " đã có tiết học vào " + newDate + " tại slot "
                                                        + newSlotNumber);
                }

                // Check Student Conflict (Overlapping schedules for students in this class)
                long studentConflictCount = timetableSlotRepository.countStudentConflicts(className, newDate,
                                newSlotNumber);
                if (studentConflictCount > 0) {
                        throw new BadRequestException(
                                        String.format("Lớp %s có %d sinh viên bị trùng lịch học khác vào ngày %s tiết %d. Vui lòng chọn thời gian khác.",
                                                        className, studentConflictCount, newDate, newSlotNumber));
                }
        }

        @Override
        @Transactional(readOnly = true)
        public TimetableDTO.AvailabilityResponse getAvailability(LocalDate date, String semesterCode) {
                log.info("Fetching room availability for date: {} in semester: {}", date, semesterCode);

                // 1. Get all rooms
                List<Room> allRooms = roomRepository.findAll();
                List<TimetableDTO.RoomDTO> roomDTOs = allRooms.stream()
                                .map(r -> TimetableDTO.RoomDTO.builder()
                                                .id(r.getId())
                                                .code(r.getCode())
                                                .name(r.getName())
                                                .capacity(r.getCapacity())
                                                .build())
                                .collect(Collectors.toList());

                // 2. Get all slot types for this semester
                List<SlotType> slotTypes = slotTypeRepository.findBySemesterCodeOrderBySlotIndexAsc(semesterCode);

                List<Integer> slotIndices = slotTypes.stream()
                                .map(SlotType::getSlotIndex)
                                .collect(Collectors.toList());

                // 3. Build occupiedRoomIdsBySlot map
                Map<Integer, List<Long>> occupiedRoomIdsBySlot = new HashMap<>();
                for (Integer slotIndex : slotIndices) {
                        List<Long> busyRoomIds = timetableSlotRepository.findBusyRoomIds(date, slotIndex);
                        occupiedRoomIdsBySlot.put(slotIndex, busyRoomIds);
                }

                return TimetableDTO.AvailabilityResponse.builder()
                                .availableSlots(slotIndices)
                                .allRooms(roomDTOs)
                                .occupiedRoomIdsBySlot(occupiedRoomIdsBySlot)
                                .build();
        }

        @Override
        @Transactional(readOnly = true)
        public List<LocalDate> getLecturerTeachingDates(Long lecturerId, String semesterCode) {
                var semester = semesterRepository.findByCode(semesterCode)
                                .orElseThrow(() -> new NotFoundException("Semester not found: " + semesterCode));

                return timetableSlotRepository.findDistinctDatesByLecturerIdAndDateBetween(
                                lecturerId, semester.getStartDate(), semester.getEndDate());
        }

        @Override
        @Transactional(readOnly = true)
        public org.springframework.data.domain.Page<TimetableDTO.TimetableSlotDTO> searchAssignments(
                        Long lecturerId, String semesterCode, LocalDate date, String className, String status,
                        org.springframework.data.domain.Pageable pageable) {

                var page = timetableSlotRepository.findAssignments(lecturerId, semesterCode, date, className,
                                pageable);
                return page.map(this::convertToDTO);
        }

        private TimetableDTO.TimetableSlotDTO convertToDTO(TimetableSlot slot) {
                var cs = slot.getClassSection();
                var course = cs != null ? cs.getCourse() : null;
                var lecturer = cs != null ? cs.getLecturer() : null;
                var room = slot.getRoom();
                var slotType = slot.getSlotType();

                return TimetableDTO.TimetableSlotDTO.builder()
                                .id(slot.getId())
                                .className(cs != null ? cs.getClassName() : null)
                                .courseCode(course != null ? course.getCode() : null)
                                .courseName(course != null ? course.getName() : null)
                                .lecturerId(lecturer != null ? lecturer.getId() : null)
                                .lecturerName(lecturer != null ? lecturer.getFullName() : null)
                                .roomCode(room != null ? room.getCode() : null)
                                .roomName(room != null ? room.getName() : null)
                                .date(slot.getDate())
                                .dayOfWeek(slot.getDayOfWeek())
                                .slotNumber(slot.getSlotNumber())
                                .startTime(slotType != null ? slotType.getStartTime() : null)
                                .endTime(slotType != null ? slotType.getEndTime() : null)
                                .status(slot.getStatus() != null ? slot.getStatus().name() : null)
                                .build();
        }
}
