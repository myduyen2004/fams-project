package com.fams.backend.service.impl;

import com.fams.backend.dto.request.SemesterConfigRequest;
import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SemesterServiceImpl implements SemesterService {

    private final SemesterRepository semesterRepository;
    private final SemesterConfigRepository semesterConfigRepository;
    private final SlotTypeRepository slotTypeRepository;
    private final HolidayRepository holidayRepository;
    private final SemesterWeekdayRepository semesterWeekdayRepository;

    @Override
    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllOrderByStartDateDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SemesterResponse getSemesterById(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Semester not found with id: " + id));
        return convertToDTO(semester);
    }

    @Override
    public SemesterResponse createSemester(SemesterResponse semesterDTO) {
        // Validate start date must be from today onwards
        LocalDate startDate = LocalDate.parse(semesterDTO.getStartDate());
        LocalDate endDate = LocalDate.parse(semesterDTO.getEndDate());
        LocalDate today = LocalDate.now();

        if (startDate.isBefore(today)) {
            throw new RuntimeException("Ngày bắt đầu học kỳ phải từ ngày hôm nay trở đi");
        }
        if (endDate.isBefore(startDate)) {
            throw new RuntimeException("Ngày kết thúc không được trước ngày bắt đầu");
        }

        // Create new Semester entity
        Semester semester = new Semester();
        semester.setCode(semesterDTO.getCode());
        semester.setName(semesterDTO.getName());
        semester.setStartDate(startDate);
        semester.setEndDate(endDate);

        // 2. Xác định status (Chỉ cần 2 trạng thái khi tạo mới)
        if (today.isBefore(startDate)) {
            semester.setStatus(Semester.SemesterStatus.UPCOMING);
        } else {
            // Vì startDate >= today và endDate >= startDate,
            // nên ở đây chắc chắn là học kỳ đang diễn ra (ONGOING)
            semester.setStatus(Semester.SemesterStatus.ONGOING);
        }

        // Save and return
        Semester savedSemester = semesterRepository.save(semester);
        return convertToDTO(savedSemester);
    }

    @Override
    public SemesterResponse updateSemester(String code, SemesterResponse semesterDTO) {
        // Find existing semester by code
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));

        // Check if semester can be updated (only UPCOMING or ONGOING)
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING &&
                semester.getStatus() != Semester.SemesterStatus.ONGOING) {
            throw new RuntimeException("Chỉ có thể cập nhật các học kỳ sắp diễn ra hoặc đang diễn ra");
        }

        // Update fields
        LocalDate newStartDate = LocalDate.parse(semesterDTO.getStartDate());
        LocalDate newEndDate = LocalDate.parse(semesterDTO.getEndDate());
        semester.setName(semesterDTO.getName());
        semester.setStartDate(newStartDate);
        semester.setEndDate(newEndDate);

        // Recalculate status based on new dates
        LocalDate today = LocalDate.now();
        LocalDate startDate = semester.getStartDate();
        LocalDate endDate = semester.getEndDate();

        if (today.isBefore(startDate)) {
            semester.setStatus(Semester.SemesterStatus.UPCOMING);
        } else if (today.isAfter(endDate)) {
            semester.setStatus(Semester.SemesterStatus.COMPLETED);
        } else {
            semester.setStatus(Semester.SemesterStatus.ONGOING);
        }

        // Save and return
        Semester updatedSemester = semesterRepository.save(semester);
        return convertToDTO(updatedSemester);
    }

    @Override
    public void deleteSemester(String code) {
        // Find existing semester by code
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));

        // Only allow deleting UPCOMING semesters
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể xóa các học kỳ sắp diễn ra (chưa bắt đầu)");
        }

        // Delete the semester
        semesterRepository.delete(semester);
    }

    private SemesterResponse convertToDTO(Semester semester) {
        SemesterResponse dto = new SemesterResponse();
        dto.setCode(semester.getCode());
        dto.setName(semester.getName());
        if (semester.getStartDate() != null) {
            dto.setStartDate(semester.getStartDate().toString());
        }
        if (semester.getEndDate() != null) {
            dto.setEndDate(semester.getEndDate().toString());
        }
        dto.setStatus(mapStatus(semester.getStatus()));
        return dto;
    }

    private String mapStatus(Semester.SemesterStatus status) {
        switch (status) {
            case ONGOING:
                return "active";
            case UPCOMING:
                return "upcoming";
            case COMPLETED:
                return "ended";
            default:
                return "unknown";
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SemesterResponse getSemesterByCode(String code) {
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));
        SemesterResponse response = convertToDTO(semester);

        SemesterConfig config = semester.getConfig();
        if (config != null) {
            response.setIsPublished(config.getIsPublished());
            response.setMaxSlotsPerDay(config.getMaxSlotPerDay());
            response.setSlotsPerSubjectPerWeek(config.getSlotPerSubjectPerWeek());
            response.setSlotDuration(config.getSlotDuration());
        } else {
            response.setIsPublished(false);
        }

        // Map Weekdays
        if (semester.getWeekdays() != null) {
            response.setSelectedDays(semester.getWeekdays().stream()
                    .map(w -> mapIntegerToDay(w.getWeekday()))
                    .collect(Collectors.toList()));
        }

        // Map SlotTypes
        if (semester.getSlotTypes() != null) {
            response.setSlots(semester.getSlotTypes().stream()
                    .map(s -> new SemesterResponse.SlotTypeResponse(
                            s.getStartTime() != null ? s.getStartTime().toString() : "",
                            s.getEndTime() != null ? s.getEndTime().toString() : ""))
                    .collect(Collectors.toList()));
        }

        // Map Holidays
        if (semester.getHolidays() != null) {
            response.setHolidays(semester.getHolidays().stream()
                    .filter(h -> h.getHolidayDate() != null)
                    .map(h -> new SemesterResponse.HolidayResponse(
                            h.getHolidayDate().toString(),
                            h.getDescription()))
                    .collect(Collectors.toList()));
        }

        return response;
    }

    private String mapIntegerToDay(Integer day) {
        switch (day) {
            case 2:
                return "MON";
            case 3:
                return "TUE";
            case 4:
                return "WED";
            case 5:
                return "THU";
            case 6:
                return "FRI";
            case 7:
                return "SAT";
            case 8:
                return "SUN";
            default:
                return "MON";
        }
    }

    @Override
    @Transactional
    public void saveSemesterConfig(String code, SemesterConfigRequest configRequest) {
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));

        // 1. Update or Create SemesterConfig
        SemesterConfig config = semester.getConfig();
        if (config == null) {
            config = new SemesterConfig();
            config.setSemester(semester);
            semester.setConfig(config);
        }
        config.setMaxSlotPerDay(configRequest.getMaxSlotsPerDay());
        config.setSlotPerSubjectPerWeek(configRequest.getSlotsPerSubjectPerWeek());
        config.setSlotDuration(configRequest.getSlotDuration());
        config.setIsPublished(configRequest.getIsPublished());
        semesterConfigRepository.save(config);

        // 2. Update Weekdays (Delete current and re-add)
        semesterWeekdayRepository.deleteAll(semester.getWeekdays());
        semester.getWeekdays().clear();
        if (configRequest.getSelectedDays() != null) {
            for (String dayStr : configRequest.getSelectedDays()) {
                SemesterWeekday weekday = new SemesterWeekday();
                weekday.setSemester(semester);
                weekday.setWeekday(mapDayToInteger(dayStr));
                semester.getWeekdays().add(weekday);
            }
        }

        // 3. Update SlotTypes (Delete current and re-add)
        slotTypeRepository.deleteAll(semester.getSlotTypes());
        semester.getSlotTypes().clear();
        if (configRequest.getSlots() != null) {
            int index = 1;
            for (SemesterConfigRequest.SlotTypeRequest slotReq : configRequest.getSlots()) {
                if (slotReq.getStartTime() == null || slotReq.getStartTime().isEmpty())
                    continue;

                SlotType slotType = new SlotType();
                slotType.setSemester(semester);
                slotType.setName("Slot " + index);
                slotType.setSlotIndex(index++);
                slotType.setStartTime(LocalTime.parse(slotReq.getStartTime()));
                slotType.setEndTime(LocalTime.parse(slotReq.getEndTime()));

                // Map duration
                if (configRequest.getSlotDuration() == 45) {
                    slotType.setDuration(SlotType.SlotDuration.MINUTES_45);
                } else if (configRequest.getSlotDuration() == 120) {
                    slotType.setDuration(SlotType.SlotDuration.MINUTES_120);
                } else {
                    slotType.setDuration(SlotType.SlotDuration.MINUTES_90);
                }

                semester.getSlotTypes().add(slotType);
            }
        }

        // 4. Update Holidays (Delete current and re-add)
        List<Holiday> currentHolidays = holidayRepository.findBySemesterId(semester.getId());
        holidayRepository.deleteAll(currentHolidays);
        semester.getHolidays().clear();

        if (configRequest.getHolidays() != null) {
            for (SemesterConfigRequest.HolidayRequest holReq : configRequest.getHolidays()) {
                if (holReq.getHolidayDate() == null || holReq.getHolidayDate().isEmpty())
                    continue;

                Holiday holiday = new Holiday();
                holiday.setSemester(semester);
                holiday.setHolidayDate(LocalDate.parse(holReq.getHolidayDate()));
                holiday.setDescription(holReq.getDescription());
                holiday.setIsRecurring(false);
                semester.getHolidays().add(holiday);
            }
        }

        semesterRepository.save(semester);
    }

    private Integer mapDayToInteger(String day) {
        switch (day) {
            case "MON":
                return 2;
            case "TUE":
                return 3;
            case "WED":
                return 4;
            case "THU":
                return 5;
            case "FRI":
                return 6;
            case "SAT":
                return 7;
            case "SUN":
                return 8;
            default:
                throw new IllegalArgumentException("Invalid day: " + day);
        }
    }
}
