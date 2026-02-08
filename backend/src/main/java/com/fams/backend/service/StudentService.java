package com.fams.backend.service;

import com.fams.backend.dto.StudentImportDTO;
import com.fams.backend.dto.request.StudentUpdateRequest;
import com.fams.backend.dto.response.StudentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface StudentService {

    Page<StudentResponse> getAllStudents(String search, String status, String major, String specialization,
            String subSpecialization, Pageable pageable);

    StudentResponse getStudentById(Long id);

    void deleteStudent(Long id);

    void deleteStudents(List<Long> ids);

    StudentResponse updateStudent(Long id, StudentUpdateRequest request, MultipartFile avatar);

    byte[] exportStudents(String major, String specialization, String subSpecialization, String status);

    Map<String, Object> importStudents(MultipartFile file);

    List<StudentImportDTO> previewImportStudents(MultipartFile file);

    Map<String, Object> saveImportedStudents(List<StudentImportDTO> dtos);

    List<String> getAllMajors();

    List<String> getAllSpecializations();

    List<String> getSpecializationsByMajor(String majorName);

    List<String> getSubSpecializationsBySpecialization(String specializationName);
}
