package com.fams.backend.service;

public interface EmailService {
    void sendAccountInfo(String to, String fullName, String username, String password);

    void sendOtpEmail(String to, String otp);
}
