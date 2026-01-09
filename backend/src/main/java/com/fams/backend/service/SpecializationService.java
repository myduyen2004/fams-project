package com.fams.backend.service;

import com.fams.backend.entity.Specialization;
import com.fams.backend.repository.SpecializationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SpecializationService {
    private final SpecializationRepository specializationRepository;
    private final com.fams.backend.repository.MajorRepository majorRepository; // Inject MajorRepository

    public Page<Specialization> getSpecializationsByMajor(Long majorId, String keyword,
            Specialization.SpecializationStatus status, Pageable pageable) {
        return specializationRepository.findByMajorIdAndSearch(majorId, keyword, status, pageable);
    }

    public Specialization updateStatus(Long id, Specialization.SpecializationStatus status) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyên ngành"));
        specialization.setStatus(status);
        return specializationRepository.save(specialization);
    }

    public Specialization createSpecialization(com.fams.backend.dto.SpecializationCreateRequest request) {
        if (specializationRepository.findByCode(request.getCode()).isPresent()) {
            throw new RuntimeException("Mã chuyên ngành đã tồn tại: " + request.getCode());
        }
        if (specializationRepository.existsByName(request.getName())) {
            throw new RuntimeException("Tên chuyên ngành đã tồn tại: " + request.getName());
        }

        com.fams.backend.entity.Major major = majorRepository.findById(request.getMajorId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngành"));

        Specialization specialization = Specialization.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : Specialization.SpecializationStatus.ACTIVE)
                .major(major)
                .build();

        return specializationRepository.save(specialization);
    }
}
