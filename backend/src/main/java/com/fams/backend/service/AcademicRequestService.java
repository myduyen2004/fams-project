package com.fams.backend.service;

import com.fams.backend.dto.request.CreateAcademicRequestDTO;
import com.fams.backend.dto.response.AcademicRequestResponse;
import com.fams.backend.entity.AcademicRequest.AcademicRequestType;
import com.fams.backend.entity.AcademicRequest.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface AcademicRequestService {

    /**
     * Create a new academic request
     * 
     * @param request   DTO containing request details
     * @param file      Optional file attachment
     * @param studentId ID of the student making the request
     * @return Created request response
     */
    AcademicRequestResponse createRequest(CreateAcademicRequestDTO request, MultipartFile file, Long studentId);

    /**
     * Get all requests for a student
     * 
     * @param studentId ID of the student
     * @param pageable  Pagination info
     * @return Page of requests
     */
    Page<AcademicRequestResponse> getRequestsByStudent(Long studentId, Pageable pageable);

    /**
     * Get all requests for a student with filters
     *
     * @param studentId   ID of the student
     * @param status      Filter by status
     * @param requestType Filter by type
     * @param pageable    Pagination info
     * @return Page of requests
     */
    Page<AcademicRequestResponse> getRequestsByStudent(Long studentId, RequestStatus status,
            AcademicRequestType requestType, Pageable pageable);

    /**
     * Get all requests with filters (for academic staff)
     * 
     * @param search      Search query
     * @param status      Filter by status
     * @param requestType Filter by type
     * @param pageable    Pagination info
     * @return Page of requests
     */
    Page<AcademicRequestResponse> getRequests(
            String search,
            RequestStatus status,
            AcademicRequestType requestType,
            Pageable pageable);

    /**
     * Get request by ID
     * 
     * @param id Request ID
     * @return Request response
     */
    AcademicRequestResponse getRequestById(Long id);

    /**
     * Update request status (approve/reject)
     * 
     * @param id         Request ID
     * @param status     New status
     * @param note       Approver note
     * @param approverId ID of the approver
     * @return Updated request response
     */
    AcademicRequestResponse updateRequestStatus(Long id, RequestStatus status, String note, Long approverId);

    /**
     * Cancel a pending request (by student)
     * 
     * @param id        Request ID
     * @param studentId ID of the student
     * @return Updated request response
     */
    AcademicRequestResponse cancelRequest(Long id, Long studentId);

    /**
     * Get request statistics
     * 
     * @return Map of status to count
     */
    Map<String, Long> getRequestStats();

    /**
     * Get all request types with deadline info
     * 
     * @param studentId ID of the student (to check class section for 3DA)
     * @return List of request type info
     */
    List<Map<String, Object>> getRequestTypes(Long studentId);

    /**
     * Check if request can be submitted (within deadline window)
     * 
     * @param requestType    Type of request
     * @param classSectionId Class section ID (for 3DA type)
     * @return Map with canSubmit flag and deadline info
     */
    Map<String, Object> checkDeadline(AcademicRequestType requestType, String classSectionId);
}
