package com.fams.backend.exception;

import com.fams.backend.service.DiscordNotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.dao.DataIntegrityViolationException;
import com.fams.backend.util.DatabaseErrorTranslator;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @Autowired(required = false)
    private DiscordNotificationService discordNotificationService;

    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private int status;
        private String message;
        private LocalDateTime timestamp;
        private Map<String, String> errors;

        public ErrorResponse(int status, String message) {
            this.status = status;
            this.message = message;
            this.timestamp = LocalDateTime.now();
            this.errors = null;
        }
    }

    /**
     * Handle UnauthorizedException
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex) {
        log.error("Unauthorized: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    /**
     * Handle BadRequestException
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        log.error("Bad request: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle NotFoundException
     */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
        log.error("Not found: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    /**
     * Handle Validation Errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        String firstErrorMessage = "Validation failed"; // Default

        for (int i = 0; i < ex.getBindingResult().getAllErrors().size(); i++) {
            var error = ex.getBindingResult().getAllErrors().get(i);
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);

            // Take the first error message as the primary message
            if (i == 0) {
                firstErrorMessage = errorMessage;
            }
        }

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                firstErrorMessage,
                LocalDateTime.now(),
                errors);
        log.warn("Validation failed: {} | Errors: {}", firstErrorMessage, errors);
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle Business Logic Exceptions (IllegalArgumentException)
     */
    @ExceptionHandler({ IllegalArgumentException.class })
    public ResponseEntity<ErrorResponse> handleBusinessExceptions(IllegalArgumentException ex) {
        log.error("Business error: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle RuntimeException (business logic errors from service layer)
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Runtime error: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handle Generic Exception
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        System.err.println("DEBUG: GlobalExceptionHandler caught exception: " + ex);
        ex.printStackTrace(); // Print full stack trace to stderr
        log.error("Internal server error", ex);

        // Send Discord notification for production errors
        if (discordNotificationService != null) {
            String stackTrace = getStackTrace(ex);
            discordNotificationService.sendErrorNotification(
                    ex.getClass().getSimpleName(),
                    ex.getMessage() != null ? ex.getMessage() : "No error message",
                    stackTrace,
                    request.getRequestURI(),
                    request.getMethod());
        }

        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    /**
     * Handle AuthorizationDeniedException
     */
    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAuthorizationDenied(AuthorizationDeniedException ex) {
        log.error("Access denied: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                "Bạn không có quyền thực hiện hành động này");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("Database error: {}", ex.getMessage());
        String friendlyMessage = DatabaseErrorTranslator.translate(ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                friendlyMessage);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    /**
     * Helper method to get stack trace as string
     */
    private String getStackTrace(Exception ex) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        ex.printStackTrace(pw);
        return sw.toString();
    }
}