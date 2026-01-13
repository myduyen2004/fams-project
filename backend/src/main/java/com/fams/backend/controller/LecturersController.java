// package com.fams.backend.controller;

// import com.fams.backend.dto.request.LecturerUpdateRequest;
// import com.fams.backend.dto.request.UserRequest;
// import com.fams.backend.dto.response.UserResponse;
// import com.fams.backend.service.UserService;
// import io.swagger.v3.oas.annotations.Operation;
// import io.swagger.v3.oas.annotations.tags.Tag;
// import jakarta.validation.Valid;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
// import org.springframework.web.bind.annotation.*;
// import org.springframework.web.multipart.MultipartFile;

// @RestController
// @RequestMapping("/api/lecturers")
// @RequiredArgsConstructor
// @Slf4j
// @Tag(name = "Lecturer Management", description = "API quản lý giảng viên
// (Academic Staff only)")
// @PreAuthorize("hasRole('ACADEMIC_STAFF')")
// public class LecturersController {

// private final UserService userService;
// private final com.fams.backend.service.LecturerService lecturerService;

// @GetMapping
// @Operation(summary = "Lấy danh sách giảng viên", description = "Lấy danh sách
// giảng viên với phân trang và lọc")
// public ResponseEntity<Page<UserResponse>> getAllUsers(
// @RequestParam(required = false) String search,
// @RequestParam(required = false) String role,
// @RequestParam(required = false) String status,
// Pageable pageable) {
// log.info("GET /users | search={}, role={}, status={}", search, role, status);
// return ResponseEntity.ok(userService.getAllUsers(search, role, status,
// pageable));
// }

// @GetMapping("/{id}")
// @Operation(summary = "Lấy thông tin chi tiết giảng viên")
// public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
// log.info("GET /lecturers/{}", id);
// return ResponseEntity.ok(userService.getUserById(id));
// }

// @PostMapping(consumes =
// org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
// @Operation(summary = "Tạo giảng viên mới")
// public ResponseEntity<UserResponse> createUser(
// @RequestPart("user") @Valid UserRequest request,
// @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
// log.info("POST /lecturers | code={}", request.getCode());
// return ResponseEntity.ok(userService.createUser(request, avatar));
// }

// @PutMapping(value = "/{id}", consumes =
// org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
// @Operation(summary = "Cập nhật giảng viên")
// public ResponseEntity<com.fams.backend.dto.response.LecturerResponse>
// updateUser(
// @PathVariable Long id,
// @RequestPart("user") @Valid LecturerUpdateRequest request,
// @RequestPart(value = "avatar", required = false) MultipartFile avatar) {
// log.info("PUT /lecturers/{} | code={}", id, request.getCode());
// log.info("Request data: dept='{}', exp='{}', bio='{}'",
// request.getDepartment(), request.getExpertise(),
// request.getBio());
// log.info("User data: fullName='{}', email='{}'", request.getFullName(),
// request.getEmail());
// return ResponseEntity.ok(lecturerService.updateLecturer(id, request,
// avatar));
// }

// @DeleteMapping("/{id}")
// @Operation(summary = "Xóa giảng viên")
// public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
// log.info("DELETE /lecturers/{}", id);
// userService.deleteUser(id);
// return ResponseEntity.ok().build();
// }

// @PostMapping("/activate")
// @Operation(summary = "Kích hoạt hàng loạt tài khoản giảng viên")
// public ResponseEntity<Void> activateUsers(@RequestBody java.util.List<Long>
// ids) {
// log.info("POST /lecturers/activate | ids={}", ids);
// userService.activateUsers(ids);
// return ResponseEntity.ok().build();
// }

// @PostMapping("/import")
// @Operation(summary = "Import giảng viên từ file Excel/CSV")
// public ResponseEntity<Void> importUsers(@RequestParam("file") MultipartFile
// file) {
// log.info("POST /lecturers/import | filename={}", file.getOriginalFilename());
// userService.importUsers(file);
// return ResponseEntity.ok().build();
// }
// }
