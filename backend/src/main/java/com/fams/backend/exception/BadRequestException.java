package com.fams.backend.exception;

/**
 * @author MyDuyen
 */

public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}