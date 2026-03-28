package com.fams.backend.service.timetable;

import com.fams.backend.entity.*;
import com.fams.backend.repository.*;
import com.fams.backend.service.timetable.ga.core.GeneticAlgorithm;
import com.fams.backend.service.timetable.ga.model.Chromosome;
import com.fams.backend.service.timetable.ga.model.GAConfig;
import com.fams.backend.service.timetable.ga.model.TimetableData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * TimetableDataLoader - Load dữ liệu từ database để chuẩn bị cho GA
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableDataLoader {

    private final SemesterRepository semesterRepository;
    private final SemesterConfigRepository semesterConfigRepository;
    private final SemesterWeekdayRepository semesterWeekdayRepository;
    private final HolidayRepository holidayRepository;
    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final RoomRepository roomRepository;

    /**
     * Load toàn bộ dữ liệu cho một học kỳ
     */
    @Transactional(readOnly = true)
    public TimetableData loadDataForSemester(String semesterCode) {
        log.info("Loading timetable data for semester: {}", semesterCode);

        // Load semester
        Semester semester = semesterRepository.findAll().stream()
                .filter(s -> s.getCode().equals(semesterCode))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy học kỳ: " + semesterCode));

        // Load semester config
        SemesterConfig config = semesterConfigRepository.findAll().stream()
                .filter(c -> c.getSemester().getId().equals(semester.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cấu hình học kỳ"));

        // Load weekdays
        List<SemesterWeekday> weekdays = semesterWeekdayRepository.findAll().stream()
                .filter(w -> w.getSemester().getId().equals(semester.getId()))
                .toList();

        // Load holidays
        Set<LocalDate> holidays = holidayRepository.findAll().stream()
                .filter(h -> h.getSemester() == null || h.getSemester().getId().equals(semester.getId()))
                .filter(h -> !h.getHolidayDate().isBefore(semester.getStartDate())
                        && !h.getHolidayDate().isAfter(semester.getEndDate()))
                .map(Holiday::getHolidayDate)
                .collect(Collectors.toSet());

        // Load class sections
        List<ClassSection> classSections = classSectionRepository.findSchedulableClassSections(semesterCode);

        // Load enrollments
        List<Enrollment> enrollments = enrollmentRepository.findAllEnrolledBySemesterCode(semesterCode);

        // Load rooms
        List<Room> rooms = roomRepository.findAll().stream()
                .filter(r -> r.getStatus() == Room.RoomStatus.ACTIVE)
                .toList();

        // Build TimetableData
        return buildTimetableData(semester, config, weekdays, holidays, classSections, enrollments, rooms);
    }

    /**
     * Build TimetableData object từ entities
     */
    private TimetableData buildTimetableData(
            Semester semester,
            SemesterConfig config,
            List<SemesterWeekday> weekdays,
            Set<LocalDate> holidays,
            List<ClassSection> classSections,
            List<Enrollment> enrollments,
            List<Room> rooms) {

        TimetableData.TimetableDataBuilder builder = TimetableData.builder();

        // Basic config
        builder.semesterCode(semester.getCode())
                .semesterStartDate(semester.getStartDate())
                .semesterEndDate(semester.getEndDate())
                .maxSlotPerDay(config.getMaxSlotPerDay())
                .slotPerSubjectPerWeek(config.getSlotPerSubjectPerWeek());

        // Calculate periods per day from slot types
        int periodsPerDay = semester.getSlotTypes().size();
        if (periodsPerDay == 0)
            periodsPerDay = 6; // Default
        builder.periodsPerDay(periodsPerDay);

        // Valid weekdays (convert from DB format: 2=Mon to 0=Mon)
        Set<Integer> validWeekdays = new HashSet<>();
        for (SemesterWeekday wd : weekdays) {
            int dayIndex = wd.getWeekday() - 2; // DB: 2=Mon -> Index: 0=Mon
            if (dayIndex >= 0 && dayIndex <= 6) {
                validWeekdays.add(dayIndex);
            }
        }
        if (validWeekdays.isEmpty()) {
            // Default: Mon-Sat
            for (int i = 0; i < 6; i++)
                validWeekdays.add(i);
        }
        builder.validWeekdays(validWeekdays);
        builder.daysPerWeek(validWeekdays.size());

        // Build valid slot indices
        Set<Integer> validSlotIndices = new HashSet<>();
        for (int day : validWeekdays) {
            for (int period = 0; period < periodsPerDay; period++) {
                int slotIndex = day * periodsPerDay + period;
                validSlotIndices.add(slotIndex);
            }
        }
        builder.validSlotIndices(validSlotIndices);

        // Holidays
        builder.holidays(holidays);

        // Build class list
        List<TimetableData.ClassInfo> classes = new ArrayList<>();
        Map<String, Long> classLecturer = new HashMap<>();
        Map<Long, Set<String>> lecturerClasses = new HashMap<>();

        for (ClassSection cs : classSections) {
            TimetableData.ClassInfo classInfo = TimetableData.ClassInfo.builder()
                    .className(cs.getClassName())
                    .courseCode(cs.getCourse().getCode())
                    .courseName(cs.getCourse().getName())
                    .lecturerId(cs.getLecturer() != null ? cs.getLecturer().getId() : null)
                    .lecturerName(cs.getLecturer() != null ? cs.getLecturer().getFullName() : null)
                    .numberOfSlots(cs.getNumberOfSlots())
                    .slotsPerWeek(config.getSlotPerSubjectPerWeek())
                    .currentEnrollment(cs.getCurrentEnrollment())
                    .maxStudents(cs.getMaxStudents())
                    .build();
            classes.add(classInfo);

            // Lecturer mapping
            if (cs.getLecturer() != null) {
                Long lecId = cs.getLecturer().getId();
                classLecturer.put(cs.getClassName(), lecId);
                lecturerClasses.computeIfAbsent(lecId, k -> new HashSet<>()).add(cs.getClassName());
            }
        }
        builder.classes(classes);
        builder.classLecturer(classLecturer);
        builder.lecturerClasses(lecturerClasses);

        // Build enrollment mappings
        Map<Long, Set<String>> studentEnrollments = new HashMap<>();
        Map<String, Set<Long>> classStudents = new HashMap<>();

        for (Enrollment enrollment : enrollments) {
            Long studentId = enrollment.getStudent().getId();
            String className = enrollment.getClassSection().getClassName();

            studentEnrollments.computeIfAbsent(studentId, k -> new HashSet<>()).add(className);
            classStudents.computeIfAbsent(className, k -> new HashSet<>()).add(studentId);
        }
        builder.studentEnrollments(studentEnrollments);
        builder.classStudents(classStudents);

        // Rooms
        List<TimetableData.RoomInfo> roomInfos = rooms.stream()
                .map(r -> TimetableData.RoomInfo.builder()
                        .id(r.getId())
                        .code(r.getCode())
                        .name(r.getName())
                        .capacity(r.getCapacity())
                        .type(r.getType().name())
                        .building(r.getBuilding())
                        .build())
                .toList();
        builder.rooms(roomInfos);

        TimetableData data = builder.build();

        log.info("Loaded timetable data: {} classes, {} students, {} lecturers, {} rooms",
                classes.size(),
                studentEnrollments.size(),
                lecturerClasses.size(),
                roomInfos.size());

        return data;
    }
}
