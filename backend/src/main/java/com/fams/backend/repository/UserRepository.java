package com.fams.backend.repository;

import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    @Query("SELECT u.code FROM User u WHERE u.code IS NOT NULL")
    Set<String> findAllCodes();

    @Query("SELECT u FROM User u WHERE LOWER(u.username) IN :usernames")
    List<User> findByUsernameInIgnoreCase(@Param("usernames") Collection<String> usernames);

    @Query("SELECT u FROM User u WHERE LOWER(u.code) IN :codes")
    List<User> findByCodeInIgnoreCase(@Param("codes") Collection<String> codes);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) IN :emails")
    List<User> findByEmailInIgnoreCase(@Param("emails") Collection<String> emails);

    @Query("SELECT u.email FROM User u")
    Set<String> findAllEmails();

    @Query("SELECT u FROM User u " +
            "LEFT JOIN FETCH u.studentProfile sp " +
            "LEFT JOIN FETCH sp.major " +
            "LEFT JOIN FETCH sp.specialization " +
            "LEFT JOIN FETCH sp.subSpecialization " +
            "LEFT JOIN FETCH u.lecturerProfile " +
            "WHERE u.username = :username")
    Optional<User> findByUsernameWithProfiles(@Param("username") String username);

    Optional<User> findByUsername(String username);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) = LOWER(:username)")
    Optional<User> findByUsernameIgnoreCase(@Param("username") String username);

    Optional<List<User>> findByRole(User.UserRole role);

    List<User> findByStatus(User.UserStatus status);

    List<User> findByStatusOrderByIdDesc(User.UserStatus status);

    Optional<User> findByEmail(String email);

    Optional<User> findByCode(String code);

    @Query("SELECT u FROM User u WHERE LOWER(u.code) = LOWER(:code)")
    Optional<User> findByCodeIgnoreCase(@Param("code") String code);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByCode(String code);

    long countByRole(User.UserRole role);

    Optional<User> findByIdAndRole(Long id, User.UserRole role);

    void deleteAllByRoleNot(User.UserRole role);

    long deleteAllByRoleIn(Collection<User.UserRole> roles);

    @Transactional
    @Modifying
    long deleteAllByRoleInAndStatus(Collection<User.UserRole> roles, User.UserStatus status);

    @Query(value = """
                SELECT DISTINCT u.id FROM users u
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                JOIN class_sections cs ON cs.class_name = :className
                WHERE u.role = 'STUDENT'
                AND u.id NOT IN (
                    SELECT e.student_id FROM enrollments e WHERE e.class_name = :className
                )
                AND (
                    EXISTS (
                        SELECT 1 FROM specialization_courses sc
                        WHERE sc.specialization_id = sp.specialization_id
                        AND sc.course_id = cs.course_id
                    )
                    OR EXISTS (
                        SELECT 1 FROM sub_specialization_courses ssc
                        WHERE ssc.sub_specialization_id = sp.sub_specialization_id
                        AND ssc.course_id = cs.course_id
                    )
                )
            """, nativeQuery = true)
    List<Long> findStudentIdsNotEnrolledInClassSection(@Param("className") String className);

    @Query("SELECT u FROM User u " +
           "LEFT JOIN FETCH u.studentProfile sp " +
           "LEFT JOIN FETCH sp.major " +
           "LEFT JOIN FETCH sp.specialization " +
           "LEFT JOIN FETCH sp.subSpecialization " +
           "WHERE u.id IN :ids " +
           "ORDER BY u.code ASC")
    List<User> findStudentsWithProfilesByIds(@Param("ids") List<Long> ids);

    @Query("SELECT u FROM User u " +
           "LEFT JOIN FETCH u.studentProfile sp " +
           "LEFT JOIN FETCH sp.major " +
           "LEFT JOIN FETCH sp.specialization " +
           "LEFT JOIN FETCH sp.subSpecialization " +
           "WHERE u.role = 'STUDENT'")
    List<User> findAllStudentsWithProfiles();

    @Query("SELECT u FROM User u " +
           "LEFT JOIN FETCH u.lecturerProfile lp " +
           "WHERE u.role = 'LECTURER'")
    List<User> findAllLecturersWithProfiles();

    List<User> findByRoleAndStatus(User.UserRole role, User.UserStatus status);
}