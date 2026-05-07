package com.fams.backend.repository;

import com.fams.backend.entity.AcademicRequest;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AcademicRequestRepository extends JpaRepository<AcademicRequest, Long> {

        /**
         * Find all requests by student ID
         */
        List<AcademicRequest> findByStudentIdOrderByCreatedAtDesc(Long studentId);

        /**
         * Find all requests by student ID with pagination
         */
        Page<AcademicRequest> findByStudentId(Long studentId, Pageable pageable);

        /**
         * Find requests by student ID with pagination and filters
         */
        @Query("SELECT ar FROM AcademicRequest ar " +
                        "WHERE ar.student.id = :studentId " +
                        "AND (:status IS NULL OR ar.status = :status) " +
                        "AND (:requestType IS NULL OR ar.requestType = :requestType) " +
                        "ORDER BY ar.createdAt DESC")
        Page<AcademicRequest> findByStudentWithFilters(
                        @Param("studentId") Long studentId,
                        @Param("status") RequestStatus status,
                        @Param("requestType") AcademicRequestType requestType,
                        Pageable pageable);

        /**
         * Find requests by status
         */
        List<AcademicRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status);

        /**
         * Find requests by status with pagination
         */
        Page<AcademicRequest> findByStatus(RequestStatus status, Pageable pageable);

        /**
         * Find requests by type
         */
        List<AcademicRequest> findByRequestTypeOrderByCreatedAtDesc(AcademicRequestType requestType);

        /**
         * Find pending requests for a specific semester
         */
        @Query("SELECT ar FROM AcademicRequest ar WHERE ar.semester.id = :semesterId AND ar.status = :status ORDER BY ar.createdAt DESC")
        List<AcademicRequest> findBySemesterIdAndStatus(@Param("semesterId") Long semesterId,
                        @Param("status") RequestStatus status);

        /**
         * Find requests by student and type (to check duplicates)
         */
        @Query("SELECT ar FROM AcademicRequest ar WHERE ar.student.id = :studentId AND ar.requestType = :requestType AND ar.status IN :statuses")
        List<AcademicRequest> findByStudentIdAndRequestTypeAndStatusIn(
                        @Param("studentId") Long studentId,
                        @Param("requestType") AcademicRequestType requestType,
                        @Param("statuses") List<RequestStatus> statuses);

        /**
         * Find all pending requests with eager fetch
         */
        @Query("SELECT ar FROM AcademicRequest ar " +
                        "JOIN FETCH ar.student s " +
                        "LEFT JOIN FETCH s.studentProfile sp " +
                        "LEFT JOIN FETCH ar.semester sem " +
                        "LEFT JOIN FETCH ar.course c " +
                        "WHERE ar.status = :status " +
                        "ORDER BY ar.createdAt DESC")
        List<AcademicRequest> findByStatusWithDetails(@Param("status") RequestStatus status);

        /**
         * Find all pending requests with pagination and filters
         */
        @Query("SELECT ar FROM AcademicRequest ar " +
                        "JOIN ar.student s " +
                        "WHERE (:status IS NULL OR ar.status = :status) " +
                        "AND (:requestType IS NULL OR ar.requestType = :requestType) " +
                        "AND (:search IS NULL OR :search = '' OR " +
                        "LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(s.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "LOWER(ar.requestTitle) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "ORDER BY ar.createdAt DESC")
        Page<AcademicRequest> findWithFilters(
                        @Param("status") RequestStatus status,
                        @Param("requestType") AcademicRequestType requestType,
                        @Param("search") String search,
                        Pageable pageable);

        /**
         * Count pending requests
         */
        long countByStatus(RequestStatus status);

        /**
         * Check if student has active request of same type in current semester
         */
        @Query("SELECT COUNT(ar) > 0 FROM AcademicRequest ar " +
                        "WHERE ar.student.id = :studentId " +
                        "AND ar.requestType = :requestType " +
                        "AND ar.semester.id = :semesterId " +
                        "AND ar.status = com.fams.backend.entity.AcademicRequest.RequestStatus.PENDING")
        boolean existsPendingRequest(
                        @Param("studentId") Long studentId,
                        @Param("requestType") AcademicRequestType requestType,
                        @Param("semesterId") Long semesterId);

        /**
         * Find requests with due date approaching
         */
        @Query("SELECT ar FROM AcademicRequest ar WHERE ar.status = 'PENDING' AND ar.dueDate <= :date ORDER BY ar.dueDate ASC")
        List<AcademicRequest> findPendingRequestsWithDueDateBefore(@Param("date") LocalDate date);
}
