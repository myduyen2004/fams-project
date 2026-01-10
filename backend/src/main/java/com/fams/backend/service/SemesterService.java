package com.fams.backend.service;

import java.util.List;

import com.fams.backend.dto.request.SemesterDTORequest;

public interface SemesterService {
    List<SemesterDTORequest> getAllSemesters();
    SemesterDTORequest getSemesterById(Long id);
    SemesterDTORequest createSemester(SemesterDTORequest semesterDTO);
    SemesterDTORequest updateSemester(String code, SemesterDTORequest semesterDTO);
    void deleteSemester(String code);
}
