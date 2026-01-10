package com.fams.backend.service;

import com.fams.backend.dto.request.MajorRequest;
import com.fams.backend.dto.response.MajorResponse;
import com.fams.backend.entity.Major;
import com.fams.backend.repository.MajorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MajorService {

    private final MajorRepository majorRepository;
    private final com.fams.backend.repository.StudentProfileRepository studentProfileRepository;

    public Page<MajorResponse> getMajors(String keyword, Major.MajorStatus status, Pageable pageable) {
        Page<Major> majors = majorRepository.searchMajors(keyword, status, pageable);
        return majors.map(this::convertToResponse);
    }

    @Transactional
    public Major createMajor(MajorRequest request) {
        if (majorRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + request.getCode());
        }
        if (majorRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + request.getName());
        }

        Major major = Major.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .programDuration(request.getProgramDuration())
                .status(Major.MajorStatus.ACTIVE)
                .build();

        return majorRepository.save(major);
    }

    @Transactional
    public Major updateMajor(Long id, MajorRequest request) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));

        if (!major.getCode().equals(request.getCode()) && majorRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + request.getCode());
        }
        if (!major.getName().equals(request.getName()) && majorRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + request.getName());
        }

        major.setCode(request.getCode());
        major.setName(request.getName());
        major.setDescription(request.getDescription());
        major.setProgramDuration(request.getProgramDuration());

        return majorRepository.save(major);
    }

    public MajorResponse getMajor(Long id) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
        return convertToResponse(major);
    }

    @Transactional
    public Major updateStatus(Long id, Major.MajorStatus status) {
        Major major = majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
        major.setStatus(status);
        return majorRepository.save(major);
    }

    @Transactional
    public void deleteMajor(Long id) {
        if (studentProfileRepository.existsByMajorId(id)) {
            throw new IllegalArgumentException("Không thể xóa ngành này vì đã có sinh viên theo học.");
        }
        majorRepository.deleteById(id);
    }

    private MajorResponse convertToResponse(Major major) {
        boolean canDelete = !studentProfileRepository.existsByMajorId(major.getId());
        return MajorResponse.builder()
                .id(major.getId())
                .code(major.getCode())
                .name(major.getName())
                .description(major.getDescription())
                .programDuration(major.getProgramDuration())
                .status(major.getStatus())
                .canDelete(canDelete)
                .numberOfSpecializations(major.getSpecializations() != null ? major.getSpecializations().size() : 0)
                .build();
    }

    @Transactional
    public List<Major> importMajors(MultipartFile file) throws IOException {
        List<Major> majors = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) { // Skip header if present
                    firstLine = false;
                    continue;
                }
                String[] data = line.split(",");
                if (data.length >= 2) {
                    String code = data[0].trim();
                    if (!majorRepository.existsByCode(code)) {
                        Major major = Major.builder()
                                .code(code)
                                .name(data[1].trim())
                                .programDuration(data.length > 2 ? data[2].trim() : "9 kì")
                                .status(Major.MajorStatus.ACTIVE)
                                .build();
                        majors.add(major);
                    }
                }
            }
        }
        return majorRepository.saveAll(majors);
    }
}
