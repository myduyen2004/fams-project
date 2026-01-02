package com.fams.backend.service.impl;

import com.fams.backend.dto.request.UserRequest;
import com.fams.backend.dto.response.UserResponse;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.UserRepository;
import com.fams.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.criteria.Predicate;

import java.time.format.DateTimeFormatter;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.fams.backend.service.UploadService uploadService;

    private static final DateTimeFormatter DOB_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter PASSWORD_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy");

    @Override
    public Page<UserResponse> getAllUsers(String search, String role, String status, Pageable pageable) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), userStatus));
                } catch (Exception e) {
                    log.error("Invalid status filter: {}", status);
                }
            }

            if (role != null && !role.isEmpty() && !role.equalsIgnoreCase("all")) {
                try {
                    User.UserRole userRole = User.UserRole.valueOf(role.toUpperCase());
                    predicates.add(cb.equal(root.get("role"), userRole));
                } catch (Exception e) {
                    log.error("Invalid role filter: {}", role);
                }
            }

            if (search != null && !search.isEmpty()) {
                String searchLower = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), searchLower),
                        cb.like(cb.lower(root.get("email")), searchLower),
                        cb.like(cb.lower(root.get("code")), searchLower),
                        cb.like(cb.lower(root.get("username")), searchLower)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec, pageable).map(UserResponse::fromUser);
    }

    @Override
    public UserResponse getUserById(Long id) {
        return userRepository.findById(id)
                .map(UserResponse::fromUser)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request, MultipartFile avatar) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã tồn tại");
        }
        if (userRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã số đã tồn tại");
        }

        // Upload avatar to cloud if present
        String avatarUrl = uploadService.uploadFile(avatar);

        // New flow: Initial users are INACTIVE and have NO username/password
        User user = User.builder()
                .code(request.getCode())
                .username(null) // No account yet
                .password(null) // No account yet
                .fullName(request.getFullName())
                .email(request.getEmail())
                .dob(request.getDob())
                .phone(request.getPhone())
                .role(request.getRole())
                .status(User.UserStatus.INACTIVE) // Initially inactive
                .avatar(avatarUrl)
                .faceDataStatus(avatarUrl != null ? User.FaceDataStatus.REGISTERED
                        : (request.getFaceDataStatus() != null ? request.getFaceDataStatus()
                                : User.FaceDataStatus.NOT_REGISTERED))
                .build();

        return UserResponse.fromUser(userRepository.save(user));
    }

    @Override
    @Transactional
    public void activateUsers(List<Long> ids) {
        log.info("Activating users: {}", ids);
        List<User> users = userRepository.findAllById(ids);
        for (User user : users) {
            if (user.getStatus() != User.UserStatus.ACTIVE) {
                // Generate username: same as code
                user.setUsername(user.getCode());

                // Generate password: [UnaccentedFirstName]@ddMMyyyy
                String unaccentedName = unaccent(
                        user.getFullName().split(" ")[user.getFullName().split(" ").length - 1]);
                String dobStr = user.getDob().format(PASSWORD_FORMATTER);
                String rawPassword = unaccentedName + "@" + dobStr;

                user.setPassword(passwordEncoder.encode(rawPassword));
                user.setStatus(User.UserStatus.ACTIVE);
            }
        }
        userRepository.saveAll(users);
        log.info("Activated {} users successfully", users.size());
    }

    private String unaccent(String src) {
        if (src == null)
            return "";
        String nfdNormalizedString = java.text.Normalizer.normalize(src, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(nfdNormalizedString).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long id, UserRequest request, MultipartFile avatar) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found with id: " + id));

        // Check unique fields if changed
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())
                && userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username đã tồn tại");
        }
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã tồn tại");
        }
        if (!user.getCode().equals(request.getCode()) && userRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã số đã tồn tại");
        }

        // Upload new avatar if present
        if (avatar != null && !avatar.isEmpty()) {
            String avatarUrl = uploadService.uploadFile(avatar);
            user.setAvatar(avatarUrl);
            user.setFaceDataStatus(User.FaceDataStatus.REGISTERED);
        }

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setDob(request.getDob());
        user.setRole(request.getRole());
        user.setStatus(request.getStatus());

        if (request.getFaceDataStatus() != null) {
            // Only update if not already set by avatar upload in this call
            if (avatar == null || avatar.isEmpty()) {
                user.setFaceDataStatus(request.getFaceDataStatus());
            }
        }

        return UserResponse.fromUser(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void importUsers(MultipartFile file) {
        log.info("Importing users from file: {}", file.getOriginalFilename());
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            List<User> usersToSave = new ArrayList<>();
            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();

                // Skip header
                if (rowNumber == 0) {
                    rowNumber++;
                    continue;
                }

                String fullName = getCellValue(currentRow.getCell(0));
                String code = getCellValue(currentRow.getCell(1));
                String roleStr = getCellValue(currentRow.getCell(2));
                String dobStr = getCellValue(currentRow.getCell(3));
                String email = getCellValue(currentRow.getCell(4));
                String phone = getCellValue(currentRow.getCell(5));

                if (code == null || code.isEmpty() || email == null || email.isEmpty()) {
                    continue;
                }

                if (userRepository.existsByCode(code) || userRepository.existsByEmail(email)) {
                    log.warn("User already exists: code={}, email={}", code, email);
                    continue;
                }

                LocalDate dob;
                try {
                    dob = LocalDate.parse(dobStr, DOB_FORMATTER);
                } catch (Exception e) {
                    log.error("Invalid DOB format at row {}: {}", rowNumber, dobStr);
                    continue;
                }

                String username = code.toLowerCase();
                String rawPassword = dob.format(PASSWORD_FORMATTER);

                User user = User.builder()
                        .fullName(fullName)
                        .code(code)
                        .username(username)
                        .password(passwordEncoder.encode(rawPassword))
                        .email(email)
                        .phone(phone)
                        .dob(dob)
                        .role(mapRole(roleStr))
                        .status(User.UserStatus.ACTIVE)
                        .faceDataStatus(User.FaceDataStatus.NOT_REGISTERED)
                        .build();

                usersToSave.add(user);
                rowNumber++;
            }

            if (!usersToSave.isEmpty()) {
                userRepository.saveAll(usersToSave);
                log.info("Imported {} users successfully", usersToSave.size());
            }

        } catch (Exception e) {
            log.error("Failed to import users", e);
            throw new BadRequestException("Lỗi khi xử lý file import: " + e.getMessage());
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null)
            return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield DOB_FORMATTER.format(cell.getLocalDateTimeCellValue().toLocalDate());
                }
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            default -> "";
        };
    }

    private User.UserRole mapRole(String roleStr) {
        if (roleStr == null)
            return User.UserRole.STUDENT;
        return switch (roleStr.toLowerCase()) {
            case "admin", "quản trị viên" -> User.UserRole.ADMIN;
            case "phòng đào tạo", "academic_staff" -> User.UserRole.ACADEMIC_STAFF;
            case "giảng viên", "lecturer" -> User.UserRole.LECTURER;
            default -> User.UserRole.STUDENT;
        };
    }
}
