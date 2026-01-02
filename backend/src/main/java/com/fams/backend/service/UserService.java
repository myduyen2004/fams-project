package com.fams.backend.service;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    Page<UserResponse> getAllUsers(String search, String role, String status, Pageable pageable);

    UserResponse getUserById(Long id);

    UserResponse createUser(UserRequest request, MultipartFile avatar);

    UserResponse updateUser(Long id, UserRequest request, MultipartFile avatar);

    void deleteUser(Long id);

    void activateUsers(java.util.List<Long> ids);

    void importUsers(MultipartFile file);

    void changePassword(String username, String newPassword);
}
