package com.fams.backend.service.impl;

import com.fams.backend.dto.response.SemesterResponse;
import com.fams.backend.entity.Semester;
import com.fams.backend.repository.SemesterRepository;
import com.fams.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SemesterServiceImpl implements SemesterService {

    private final SemesterRepository semesterRepository;

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
        
        // Validate no overlapping semesters
        List<Semester> overlappingSemesters = semesterRepository.findOverlappingSemestersForNew(startDate, endDate);
        if (!overlappingSemesters.isEmpty()) {
            throw new RuntimeException("Trong một khoảng thời gian chỉ có duy nhất 1 kỳ học. Kỳ học bị trùng: " + overlappingSemesters.get(0).getName());
        }
        
        // Create new Semester entity
        Semester semester = new Semester();
        semester.setCode(semesterDTO.getCode());
        semester.setName(semesterDTO.getName());
        semester.setStartDate(startDate);
        semester.setEndDate(endDate);
        
        // Determine status based on dates
        if (today.isBefore(startDate)) {
            semester.setStatus(Semester.SemesterStatus.UPCOMING);
        } else if (today.isAfter(endDate)) {
            semester.setStatus(Semester.SemesterStatus.COMPLETED);
        } else {
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
        
        // Validate no overlapping semesters
        LocalDate newStartDate = LocalDate.parse(semesterDTO.getStartDate());
        LocalDate newEndDate = LocalDate.parse(semesterDTO.getEndDate());
        List<Semester> overlappingSemesters = semesterRepository.findOverlappingSemesters(newStartDate, newEndDate, code);
        if (!overlappingSemesters.isEmpty()) {
            throw new RuntimeException("Trong một khoảng thời gian chỉ có duy nhất 1 kỳ học. Kỳ học bị trùng: " + overlappingSemesters.get(0).getName());
        }
        
        // Update fields
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
        dto.setStartDate(semester.getStartDate().toString());
        dto.setEndDate(semester.getEndDate().toString());
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
}
