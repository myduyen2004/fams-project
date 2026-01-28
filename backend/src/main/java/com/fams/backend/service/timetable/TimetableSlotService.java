package com.fams.backend.service.timetable;

import com.fams.backend.dto.timetable.TimetableDTO;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableSlotService {

    private final TimetableSlotRepository timetableSlotRepository;
    private final RoomRepository roomRepository;
    private final SemesterRepository semesterRepository;
    private final HolidayRepository holidayRepository;
    private final SlotTypeRepository slotTypeRepository;

    @Transactional
    public TimetableDTO.TimetableSlotDTO updateSlot(Long id, TimetableDTO.UpdateSlotRequest request) {
        log.info("[TimetableSlotService] Updating slot {}: date={}, slot={}, room={}", id, request.getDate(),
                request.getSlotNumber(), request.getRoomId());

        TimetableSlot slot = timetableSlotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        Semester semester = slot.getClassSection().getSemester();

        // 0. Validate Semester Date Range (HC-5)
        if (request.getDate().isBefore(semester.getStartDate()) || request.getDate().isAfter(semester.getEndDate())) {
            throw new IllegalArgumentException(
                    "[HC-5] Ngày " + request.getDate() + " nằm ngoài khoảng thời gian học kỳ ("
                            + semester.getStartDate() + " đến " + semester.getEndDate() + ")");
        }

        // 1. Validate Weekday (HC-5)
        int requestedWeekday = request.getDate().getDayOfWeek().getValue() + 1; // 1(Mon)-7(Sun) -> 2(Mon)-8(Sun)
        boolean isValidWeekday = true;
        List<SemesterWeekday> weekdays = semester.getWeekdays();
        if (weekdays == null || weekdays.isEmpty()) {
            isValidWeekday = requestedWeekday >= 2 && requestedWeekday <= 7;
        } else {
            isValidWeekday = weekdays.stream()
                    .filter(sw -> sw.getWeekday() != null)
                    .anyMatch(sw -> sw.getWeekday().equals(requestedWeekday));
        }

        if (!isValidWeekday) {
            throw new IllegalArgumentException(
                    "[HC-5] Ngày " + request.getDate() + " không phải là ngày học hợp lệ trong tuần");
        }

        // 2. Validate Holiday (HC-4)
        boolean isHoliday = false;
        List<Holiday> semesterHolidays = semester.getHolidays();
        if (semesterHolidays != null) {
            isHoliday = semesterHolidays.stream()
                    .anyMatch(h -> h.getHolidayDate() != null && h.getHolidayDate().equals(request.getDate()));
        }
        if (!isHoliday) {
            isHoliday = holidayRepository.findBySemesterIdIsNull().stream()
                    .anyMatch(h -> h.getHolidayDate() != null && h.getHolidayDate().equals(request.getDate()));
        }
        if (isHoliday) {
            throw new IllegalArgumentException("[HC-4] Ngày " + request.getDate() + " là ngày nghỉ");
        }

        // 3. Validate Slot Range (HC-5)
        SemesterConfig config = semester.getConfig();
        if (config != null && config.getMaxSlotPerDay() != null
                && request.getSlotNumber() > config.getMaxSlotPerDay()) {
            throw new IllegalArgumentException(
                    "[HC-5] Tiết " + request.getSlotNumber() + " không hợp lệ (Giới hạn: " + config.getMaxSlotPerDay()
                            + " tiết/ngày)");
        }

        // 4. Check for room conflict (HC-1)
        boolean roomOccupied = timetableSlotRepository.existsByRoomIdAndDateAndSlotNumberAndStatusNot(
                request.getRoomId(), request.getDate(), request.getSlotNumber(),
                TimetableSlot.TimetableSlotStatus.CANCELLED);

        if (roomOccupied) {
            List<TimetableSlot> conflicts = timetableSlotRepository.findConflicts(request.getRoomId(),
                    request.getDate(), request.getSlotNumber());
            if (!conflicts.isEmpty() && !conflicts.get(0).getId().equals(id)) {
                throw new IllegalArgumentException("[HC-1] Phòng học đã có lịch vào tiết này");
            }
        }

        // 5. Check for lecturer conflict (HC-1)
        if (slot.getClassSection().getLecturer() != null) {
            boolean lecturerConflict = timetableSlotRepository
                    .existsByClassSectionLecturerIdAndDateAndSlotNumberAndStatusNot(
                            slot.getClassSection().getLecturer().getId(), request.getDate(), request.getSlotNumber(),
                            TimetableSlot.TimetableSlotStatus.CANCELLED);
            if (lecturerConflict) {
                var conflictingSlots = timetableSlotRepository.findByLecturerIdAndDateBetween(
                        slot.getClassSection().getLecturer().getId(), request.getDate(), request.getDate());
                if (conflictingSlots.stream()
                        .anyMatch(s -> !s.getId().equals(id) && s.getSlotNumber().equals(request.getSlotNumber()))) {
                    throw new IllegalArgumentException(
                            "[HC-1] Giảng viên " + slot.getClassSection().getLecturer().getFullName()
                                    + " đã có lịch vào tiết này");
                }
            }
        }

        // 6. Check for student conflict (HC-1)
        List<String> studentConflicts = timetableSlotRepository.findStudentsWithConflict(
                slot.getClassSection().getClassName(), request.getDate(), request.getSlotNumber(), id);
        if (!studentConflicts.isEmpty()) {
            throw new IllegalArgumentException("[HC-1] Có " + studentConflicts.size()
                    + " sinh viên trong lớp bị trùng lịch (ví dụ: " + studentConflicts.get(0) + ")");
        }

        // 7. Check for student max slots (HC-2)
        int maxSlotsPerDay = (config != null && config.getMaxSlotPerDay() != null) ? config.getMaxSlotPerDay() : 6;
        List<String> studentOverloads = timetableSlotRepository.findStudentsExceedingMaxSlots(
                slot.getClassSection().getClassName(), request.getDate(), maxSlotsPerDay, id);
        if (!studentOverloads.isEmpty()) {
            throw new IllegalArgumentException(
                    "[HC-2] Có " + studentOverloads.size() + " sinh viên vượt quá " + maxSlotsPerDay
                            + " tiết/ngày (ví dụ: " + studentOverloads.get(0) + ")");
        }

        // 8. Weekly Slot Count (HC-3) & Day Gap (HC-6)
        List<TimetableSlot> allClassSlots = timetableSlotRepository
                .findByClassName(slot.getClassSection().getClassName());

        // HC-3: Calculate slots in target week
        java.time.LocalDate newDate = request.getDate();
        java.time.LocalDate weekStart = newDate
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        java.time.LocalDate weekEnd = weekStart.plusDays(6);

        int requiredWeekSlots = (config != null && config.getSlotPerSubjectPerWeek() != null)
                ? config.getSlotPerSubjectPerWeek()
                : 2;

        long slotsInNewWeek = allClassSlots.stream()
                .filter(s -> !s.getId().equals(id) && s.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED)
                .filter(s -> !s.getDate().isBefore(weekStart) && !s.getDate().isAfter(weekEnd))
                .count() + 1; // +1 for the one we are moving in

        if (slotsInNewWeek > requiredWeekSlots) {
            throw new IllegalArgumentException(
                    "[HC-3] Lớp đã có đủ " + requiredWeekSlots + " tiết trong tuần này (" + weekStart
                            + " đến " + weekEnd + ")");
        }

        for (TimetableSlot otherSlot : allClassSlots) {
            if (!otherSlot.getId().equals(id) && otherSlot.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED) {
                // HC-1: Class conflict on same slot
                if (otherSlot.getDate().equals(request.getDate())
                        && otherSlot.getSlotNumber().equals(request.getSlotNumber())) {
                    throw new IllegalArgumentException(
                            "[HC-1] Lớp " + slot.getClassSection().getClassName() + " đã có lịch vào tiết này");
                }

                // HC-6 Day diff < 2 (must have at least 1 day gap)
                long daysDiff = Math
                        .abs(java.time.temporal.ChronoUnit.DAYS.between(otherSlot.getDate(), request.getDate()));
                if (daysDiff < 2) {
                    throw new IllegalArgumentException(
                            "[HC-6] Vi phạm quy tắc cách ngày: Lớp đã có tiết vào ngày " + otherSlot.getDate());
                }
            }
        }

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // 7. Update Slot Type
        SlotType newSlotType = slotTypeRepository
                .findBySemesterIdAndSlotIndex(semester.getId(), request.getSlotNumber())
                .orElse(slot.getSlotType());

        slot.setDate(request.getDate());
        slot.setSlotNumber(request.getSlotNumber());
        slot.setDayOfWeek(requestedWeekday);
        slot.setRoom(room);
        slot.setSlotType(newSlotType);
        slot.setStatus(TimetableSlot.TimetableSlotStatus.RESCHEDULED);

        TimetableSlot saved = timetableSlotRepository.save(slot);
        return convertToDTO(saved);
    }

    @Transactional(readOnly = true)
    public TimetableDTO.AvailabilityResponse getAvailability(LocalDate date, String semesterCode) {
        log.info("[TimetableSlotService] START getAvailability: date={}, semesterCode={}", date, semesterCode);
        try {
            Semester semester = semesterRepository.findByCode(semesterCode)
                    .orElseThrow(() -> new RuntimeException("Semester not found: " + semesterCode));

            // 1. Weekday Check (Fallback to Mon-Sat if not configured)
            int requestedWeekday = date.getDayOfWeek().getValue() + 1; // 2=Monday...8=Sunday
            boolean isValidWeekday = true;

            List<SemesterWeekday> weekdays = semester.getWeekdays();
            if (weekdays == null || weekdays.isEmpty()) {
                log.info("[TimetableSlotService] No weekdays configured for semester {}, defaulting to 2-7",
                        semesterCode);
                isValidWeekday = requestedWeekday >= 2 && requestedWeekday <= 7;
            } else {
                isValidWeekday = weekdays.stream()
                        .filter(sw -> sw.getWeekday() != null)
                        .anyMatch(sw -> sw.getWeekday().equals(requestedWeekday));
            }

            if (!isValidWeekday) {
                log.warn("[TimetableSlotService] Invalid weekday {} for date {}", requestedWeekday, date);
                return TimetableDTO.AvailabilityResponse.builder()
                        .availableSlots(List.of())
                        .allRooms(List.of())
                        .occupiedRoomIdsBySlot(java.util.Map.of())
                        .build();
            }

            // 2. Holiday Check
            boolean isHoliday = false;
            List<Holiday> semesterHolidays = semester.getHolidays();
            if (semesterHolidays != null && !semesterHolidays.isEmpty()) {
                isHoliday = semesterHolidays.stream()
                        .anyMatch(h -> h.getHolidayDate() != null && date.equals(h.getHolidayDate()));
            }

            if (!isHoliday) {
                List<Holiday> systemHolidays = holidayRepository.findBySemesterIdIsNull();
                if (systemHolidays != null) {
                    isHoliday = systemHolidays.stream()
                            .anyMatch(h -> h.getHolidayDate() != null && date.equals(h.getHolidayDate()));
                }
            }

            if (isHoliday) {
                log.warn("[TimetableSlotService] Holiday detected on date {}", date);
                return TimetableDTO.AvailabilityResponse.builder()
                        .availableSlots(List.of())
                        .allRooms(List.of())
                        .occupiedRoomIdsBySlot(java.util.Map.of())
                        .build();
            }

            // 3. Slot Range Check
            int maxSlots = 6;
            SemesterConfig config = semester.getConfig();
            if (config != null && config.getMaxSlotPerDay() != null) {
                maxSlots = config.getMaxSlotPerDay();
            }

            List<Integer> allSlots = new ArrayList<>();
            for (int i = 1; i <= maxSlots; i++) {
                allSlots.add(i);
            }

            log.info("[TimetableSlotService] Fetching rooms and occupied slots...");
            List<Room> allRooms = roomRepository.findAll();
            List<TimetableSlot> occupiedSlots = timetableSlotRepository.findBySemesterCodeAndDate(semesterCode, date);

            log.info("[TimetableSlotService] Found {} occupied slots for {} on {}", occupiedSlots.size(), semesterCode,
                    date);

            List<Integer> availableSlots = allSlots.stream()
                    .filter(slotNum -> {
                        long occupiedRoomsCount = occupiedSlots.stream()
                                .filter(s -> s.getSlotNumber() != null && s.getSlotNumber().equals(slotNum)
                                        && s.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED)
                                .map(s -> s.getRoom().getId())
                                .distinct()
                                .count();
                        return occupiedRoomsCount < allRooms.size();
                    })
                    .collect(Collectors.toList());

            List<TimetableDTO.RoomDTO> roomDTOs = allRooms.stream()
                    .map(r -> TimetableDTO.RoomDTO.builder()
                            .id(r.getId())
                            .code(r.getCode())
                            .name(r.getName())
                            .capacity(r.getCapacity())
                            .build())
                    .collect(Collectors.toList());

            java.util.Map<Integer, List<Long>> occupiedRoomIdsBySlot = occupiedSlots.stream()
                    .filter(s -> s.getStatus() != TimetableSlot.TimetableSlotStatus.CANCELLED)
                    .collect(Collectors.groupingBy(
                            TimetableSlot::getSlotNumber,
                            Collectors.mapping(s -> s.getRoom().getId(), Collectors.toList())));

            log.info("[TimetableSlotService] SUCCESS getAvailability: {} slots found", availableSlots.size());

            return TimetableDTO.AvailabilityResponse.builder()
                    .availableSlots(availableSlots)
                    .allRooms(roomDTOs)
                    .occupiedRoomIdsBySlot(occupiedRoomIdsBySlot)
                    .build();
        } catch (Exception e) {
            log.error("[TimetableSlotService] ERROR in getAvailability: " + e.getMessage(), e);
            throw e;
        }
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
