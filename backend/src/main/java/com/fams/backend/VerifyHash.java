package com.fams.backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class VerifyHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        String hash = "$2a$04$x4TdWUpyRxUfl2NOkfCIOe7yxi6Szw7w3iPl4BcY6tv6aGWdl1nhq";
        System.out.println("Match staff123: " + encoder.matches("staff123", hash));
        System.out.println("Match admin123: " + encoder.matches("admin123", hash));
    }
}
