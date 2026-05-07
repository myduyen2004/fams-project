package com.fams.backend.service;

import java.util.List;

import com.fams.backend.dto.response.SemesterResponse;

public interface SemesterService {
    List<SemesterResponse> getAllSemesters();

    List<SemesterResponse> getUpcomingSemesters();

    SemesterResponse getSemesterById(Long id);

    SemesterResponse createSemester(SemesterResponse semesterDTO);

    SemesterResponse updateSemester(String code, SemesterResponse semesterDTO);

    void deleteSemester(String code);

    SemesterResponse getSemesterByCode(String code);

    void saveSemesterConfig(String code, com.fams.backend.dto.request.SemesterConfigRequest configRequest);

    void setPublished(String code, boolean isPublished);

    boolean isPublished(String code);
}
