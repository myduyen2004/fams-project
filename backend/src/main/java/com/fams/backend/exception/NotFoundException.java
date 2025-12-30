package com.fams.backend.exception;

/**
 * @author MyDuyen
 */

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}