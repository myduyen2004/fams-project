package com.fams.backend.service.impl;

import com.fams.backend.dto.request.SemesterConfigRequest;
import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class SemesterServiceImpl implements SemesterService {

    private final SemesterRepository semesterRepository;
    private final SemesterConfigRepository semesterConfigRepository;
    private final SlotTypeRepository slotTypeRepository;
    private final HolidayRepository holidayRepository;
    private final SemesterWeekdayRepository semesterWeekdayRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final SystemLogService systemLogService;

    @Override
    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllOrderByStartDateDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SemesterResponse> getUpcomingSemesters() {
        return semesterRepository.findUpcomingSemesters()
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
        log.info("Creating semester - Input data: code={}, name={}, startDate={}, endDate={}",
                semesterDTO.getCode(), semesterDTO.getName(), semesterDTO.getStartDate(), semesterDTO.getEndDate());

        try {
            // Validate inputs
            if (semesterDTO.getCode() == null || semesterDTO.getCode().trim().isEmpty()) {
                log.error("Validation failed: Mã học kỳ is empty");
                throw new RuntimeException("Mã học kỳ không được để trống");
            }
            if (semesterDTO.getName() == null || semesterDTO.getName().trim().isEmpty()) {
                log.error("Validation failed: Tên học kỳ is empty");
                throw new RuntimeException("Tên học kỳ không được để trống");
            }
            if (semesterDTO.getStartDate() == null || semesterDTO.getEndDate() == null) {
                log.error("Validation failed: Dates are null");
                throw new RuntimeException("Ngày bắt đầu và ngày kết thúc không được để trống");
            }

            // Validate start date must be from today onwards
            LocalDate startDate = LocalDate.parse(semesterDTO.getStartDate());
            LocalDate endDate = LocalDate.parse(semesterDTO.getEndDate());
            LocalDate today = LocalDate.now();

            log.info("Parsed dates - startDate={}, endDate={}, today={}", startDate, endDate, today);

            if (startDate.isBefore(today)) {
                log.error("Validation failed: Start date {} is before today {}", startDate, today);
                throw new RuntimeException("Ngày bắt đầu học kỳ phải từ ngày hôm nay trở đi");
            }
            if (endDate.isBefore(startDate)) {
                log.error("Validation failed: End date {} is before start date {}", endDate, startDate);
                throw new RuntimeException("Ngày kết thúc không được trước ngày bắt đầu");
            }

            // Create new Semester entity
            Semester semester = new Semester();
            semester.setCode(semesterDTO.getCode().trim());
            semester.setName(semesterDTO.getName().trim());
            semester.setStartDate(startDate);
            semester.setEndDate(endDate);

            // Set status based on date
            if (today.isBefore(startDate)) {
                semester.setStatus(Semester.SemesterStatus.UPCOMING);
                log.info("Set status to UPCOMING");
            } else {
                semester.setStatus(Semester.SemesterStatus.ONGOING);
                log.info("Set status to ONGOING");
            }

            // Save and return
            log.info("Saving semester to database...");
            Semester savedSemester = semesterRepository.save(semester);
            log.info("Semester saved successfully with ID: {}", savedSemester.getId());
            systemLogService.logSemesterCreated(savedSemester.getCode(), savedSemester.getName());

            SemesterResponse response = convertToDTO(savedSemester);
            log.info("Returning semester response: {}", response);
            return response;
        } catch (Exception e) {
            log.error("Error creating semester: {}", e.getMessage(), e);
            throw e;
        }
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

        Semester updatedSemester = semesterRepository.save(semester);
        systemLogService.logSemesterUpdated(updatedSemester.getCode(), updatedSemester.getName());
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
        String semesterCode = semester.getCode();
        semesterRepository.delete(semester);
        systemLogService.logSemesterDeleted(semesterCode);
    }

    private SemesterResponse convertToDTO(Semester semester) {
        SemesterResponse dto = new SemesterResponse();
        dto.setId(semester.getId());
        dto.setCode(semester.getCode());
        dto.setName(semester.getName());
        if (semester.getStartDate() != null) {
            dto.setStartDate(semester.getStartDate().toString());
        }
        if (semester.getEndDate() != null) {
            dto.setEndDate(semester.getEndDate().toString());
        }

        // Dynamically compute status based on current date
        LocalDate today = LocalDate.now();
        Semester.SemesterStatus computedStatus;
        if (semester.getStartDate() != null && today.isBefore(semester.getStartDate())) {
            computedStatus = Semester.SemesterStatus.UPCOMING;
        } else if (semester.getEndDate() != null && today.isAfter(semester.getEndDate())) {
            computedStatus = Semester.SemesterStatus.COMPLETED;
        } else {
            computedStatus = Semester.SemesterStatus.ONGOING;
        }
        dto.setStatus(mapStatus(computedStatus));

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
            response.setMaxSlotsPerDay(4); // Default
            response.setSlotsPerSubjectPerWeek(2); // Default
            response.setSlotDuration(90); // Default
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

        // Restriction: Only allow editing UPCOMING semesters
        if (semester.getStatus() != Semester.SemesterStatus.UPCOMING) {
            throw new RuntimeException("Chỉ có thể chỉnh sửa cấu hình cho các học kỳ sắp diễn ra");
        }

        // Deleting existing TimetableSlots when configuration is updated for an
        // UPCOMING semester
        long existingSlots = timetableSlotRepository.countBySemesterCode(code);
        if (existingSlots > 0) {
            log.info("Deleting {} existing timetable slots for semester {} due to config update", existingSlots, code);
            timetableSlotRepository.deleteBySemesterCode(code);
        }

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

        // 2. Update Weekdays (Delete current and re-add using direct query)
        semesterWeekdayRepository.deleteBySemesterId(semester.getId());
        if (semester.getWeekdays() != null) {
            semester.getWeekdays().clear();
        } else {
            semester.setWeekdays(new java.util.ArrayList<>());
        }
        if (configRequest.getSelectedDays() != null) {
            for (String dayStr : configRequest.getSelectedDays()) {
                SemesterWeekday weekday = new SemesterWeekday();
                weekday.setSemester(semester);
                weekday.setWeekday(mapDayToInteger(dayStr));
                semester.getWeekdays().add(weekday);
            }
        }

        // 3. Update SlotTypes (Delete current and re-add using direct query)
        slotTypeRepository.deleteBySemesterId(semester.getId());
        if (semester.getSlotTypes() != null) {
            semester.getSlotTypes().clear();
        } else {
            semester.setSlotTypes(new java.util.ArrayList<>());
        }

        if (configRequest.getSlots() != null) {
            int index = 1;
            for (SemesterConfigRequest.SlotTypeRequest slotReq : configRequest.getSlots()) {
                if (slotReq.getStartTime() == null || slotReq.getStartTime().isEmpty())
                    continue;

                // Validate slot times before creating SlotType
                if (slotReq.getStartTime() == null || slotReq.getStartTime().isEmpty() ||
                        slotReq.getEndTime() == null || slotReq.getEndTime().isEmpty()) {
                    continue; // skip invalid slot entry
                }
                SlotType slotType = new SlotType();
                slotType.setSemester(semester);
                slotType.setName("Slot " + index);
                slotType.setSlotIndex(index++);
                slotType.setStartTime(LocalTime.parse(slotReq.getStartTime()));
                slotType.setEndTime(LocalTime.parse(slotReq.getEndTime()));

                // Map duration (90 phút hoặc 135 phút)
                if (configRequest.getSlotDuration() != null && configRequest.getSlotDuration() == 135) {
                    slotType.setDuration(SlotType.SlotDuration.MINUTES_135);
                } else {
                    slotType.setDuration(SlotType.SlotDuration.MINUTES_90);
                }

                semester.getSlotTypes().add(slotType);
            }
        }

        // 4. Update Holidays (Delete current and re-add using direct query)
        holidayRepository.deleteBySemesterId(semester.getId());
        if (semester.getHolidays() != null) {
            semester.getHolidays().clear();
        } else {
            semester.setHolidays(new java.util.ArrayList<>());
        }

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
        systemLogService.logSemesterConfigUpdated(semester.getCode());
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

    @Override
    @Transactional
    public void setPublished(String code, boolean isPublished) {
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));

        SemesterConfig config = semester.getConfig();
        if (config == null) {
            config = new SemesterConfig();
            config.setSemester(semester);
            config.setMaxSlotPerDay(4);
            config.setSlotPerSubjectPerWeek(2);
            config.setSlotDuration(90);
            semester.setConfig(config);
        }
        config.setIsPublished(isPublished);
        semesterConfigRepository.save(config);
        log.info("Set isPublished={} for semester {}", isPublished, code);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isPublished(String code) {
        Semester semester = semesterRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Semester not found with code: " + code));

        SemesterConfig config = semester.getConfig();
        return config != null && Boolean.TRUE.equals(config.getIsPublished());
    }
}
