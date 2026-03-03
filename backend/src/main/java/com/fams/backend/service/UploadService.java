package com.fams.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface UploadService {
    String uploadFile(MultipartFile file);

    String uploadFile(MultipartFile file, String folder);

    String uploadBytes(byte[] bytes, String fileName, String folder);
}
