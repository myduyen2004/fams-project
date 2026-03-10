package com.fams.backend.service;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    Page<UserResponse> getAllUsers(String search, String role, String status, Pageable pageable);

    UserResponse getUserById(Long id);

    UserResponse getUserByUsername(String username);

    UserResponse createUser(UserRequest request, MultipartFile avatar);

    UserResponse updateUser(Long id, UserRequest request, MultipartFile avatar);

    void deleteUser(Long id);

    void activateUsers(java.util.List<Long> ids);

    void activateAllInactiveUsers();

    void changePassword(String username, String newPassword);

    UserResponse updateMyProfile(String username, com.fams.backend.dto.request.UpdateProfileRequest request,
            MultipartFile avatar);

    void importUsers(MultipartFile file, String importMode);

    // New methods for background job import
    void importExcelSync(MultipartFile file, String importMode);

    String importZipAsync(byte[] fileBytes, String filename, String importMode);

    com.fams.backend.dto.response.ImportJobResponse getImportJobStatus(String jobId);

    com.fams.backend.dto.response.ImportJobResponse getActiveImportJob();

    void cleanupStuckJobs();

    void cancelMyActiveImportJob();

    com.fams.backend.dto.response.PreviewImportResponse previewImportFile(MultipartFile file);

    Object getActivationProgress(String username);

    byte[] downloadSampleFile();
}
