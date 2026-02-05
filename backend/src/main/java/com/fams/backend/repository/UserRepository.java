package com.fams.backend.repository;

import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // Batch fetch users by usernames (for import optimization)
    @Query("SELECT u FROM User u WHERE LOWER(u.username) IN :usernames")
    List<User> findByUsernameInIgnoreCase(@Param("usernames") java.util.Collection<String> usernames);

    // Batch fetch users by codes (for import optimization)
    @Query("SELECT u FROM User u WHERE LOWER(u.code) IN :codes")
    List<User> findByCodeInIgnoreCase(@Param("codes") java.util.Collection<String> codes);

    // Batch fetch users by emails (for import optimization)
    @Query("SELECT u FROM User u WHERE LOWER(u.email) IN :emails")
    List<User> findByEmailInIgnoreCase(@Param("emails") java.util.Collection<String> emails);

    @Query("SELECT u.email FROM User u")
    Set<String> findAllEmails();

    /**
     * Tìm user theo username kèm theo thông tin profiles
     */
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.studentProfile LEFT JOIN FETCH u.lecturerProfile WHERE u.username = :username")
    Optional<User> findByUsernameWithProfiles(String username);

    /**
     * Tìm user theo username
     */
    Optional<User> findByUsername(String username);

    /**
     * Tìm user theo username - case insensitive
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<List<User>> findByRole(User.UserRole role);

    List<User> findByStatus(User.UserStatus status);

    List<User> findByStatusOrderByIdDesc(User.UserStatus status);

    /**
     * Tìm user theo email
     */
    Optional<User> findByEmail(String email);

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

    /**
     * Find students not enrolled in a specific class section - optimized query
     * Uses JOIN FETCH to avoid N+1 and filters directly in SQL
     */
    @Query("""
                SELECT u FROM User u
                LEFT JOIN FETCH u.studentProfile sp
                LEFT JOIN FETCH sp.major
                LEFT JOIN FETCH sp.specialization
                WHERE u.role = 'STUDENT'
                AND u.id NOT IN (
                    SELECT e.student.id FROM Enrollment e WHERE e.classSection.className = :className
                )
                ORDER BY u.code ASC
            """)
    List<User> findStudentsNotEnrolledInClassSection(@Param("className") String className);
}