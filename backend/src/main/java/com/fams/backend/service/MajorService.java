package com.fams.backend.service;

import com.fams.backend.dto.MajorDTO;
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
public class MajorService {

    private final MajorRepository majorRepository;

    public Page<Major> getMajors(String keyword, Major.MajorStatus status, Pageable pageable) {
        return majorRepository.searchMajors(keyword, status, pageable);
    }

    public Major createMajor(MajorDTO majorDTO) {
        if (majorRepository.existsByCode(majorDTO.getCode())) {
            throw new IllegalArgumentException("Mã ngành đã tồn tại: " + majorDTO.getCode());
        }
        if (majorRepository.existsByName(majorDTO.getName())) {
            throw new IllegalArgumentException("Tên ngành đã tồn tại: " + majorDTO.getName());
        }

        Major major = Major.builder()
                .code(majorDTO.getCode())
                .name(majorDTO.getName())
                .description(majorDTO.getDescription())
                .programDuration(majorDTO.getProgramDuration())
                .status(Major.MajorStatus.ACTIVE)
                .build();

        return majorRepository.save(major);
    }

    public Major getMajor(Long id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ngành với mã ngành: " + id));
    }

    public Major updateStatus(Long id, Major.MajorStatus status) {
        Major major = getMajor(id);
        major.setStatus(status);
        return majorRepository.save(major);
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
