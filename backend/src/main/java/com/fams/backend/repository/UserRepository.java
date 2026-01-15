package com.fams.backend.repository;

import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import java.util.Set;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    @Query("SELECT u.code FROM User u WHERE u.code IS NOT NULL")
    Set<String> findAllCodes();

    @Query("SELECT u.email FROM User u")
    Set<String> findAllEmails();

    /**
     * Tìm user theo username
     */
    Optional<User> findByUsername(String username);

    Optional<List<User>> findByRole(User.UserRole role);

    /**
     * Tìm user theo email
     */
    Optional<User> findByEmail(String email);

    Optional<User> findById(Long id);

    /**
     * Tìm user theo mã số (MSSV/MSGV/MSNV)
     */
    Optional<User> findByCode(String code);

    /**
     * Tìm user theo mã số (MSSV/MSGV/MSNV) - case insensitive
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.code) = LOWER(:code)")
    Optional<User> findByCodeIgnoreCase(String code);

    /**
     * Kiểm tra username đã tồn tại
     */
    boolean existsByUsername(String username);

    /**
     * Kiểm tra email đã tồn tại
     */
    boolean existsByEmail(String email);

    /**
     * Kiểm tra mã số đã tồn tại
     */
    boolean existsByCode(String code);

    /**
     * Đếm số lượng user theo role
     */
    long countByRole(User.UserRole role);

    Optional<User> findByIdAndRole(Long id, User.UserRole role);

    /**
     * Xóa tất cả user ngoại trừ role chỉ định
     */
    void deleteAllByRoleNot(User.UserRole role);

    /**
     * Xóa tất cả user có role nằm trong danh sách
     */
    long deleteAllByRoleIn(Collection<User.UserRole> roles);

    /**
     * Xóa tất cả user có role nằm trong danh sách và trạng thái chỉ định
     */

    @Transactional
    @Modifying
    long deleteAllByRoleInAndStatus(Collection<User.UserRole> roles, User.UserStatus status);
}