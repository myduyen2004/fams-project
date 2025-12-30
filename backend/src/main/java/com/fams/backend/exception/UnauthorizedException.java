package com.fams.backend.exception;

/**
 * @author MyDuyen
 */

public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}