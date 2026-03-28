package com.fams.backend.service.impl;

import com.fams.backend.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendAccountInfo(String to, String fullName, String username, String password) {
        if (to == null || to.isEmpty()) {
            log.warn("Cannot send email: Recipient email is empty for user {}", username);
            return;
        }

        try {
            log.info("Sending account info email to: {}", to);
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "FAMS System");
            helper.setTo(to);
            helper.setSubject("Thông báo thông tin tài khoản FAMS");

            String htmlContent = String.format(
                    """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>Thông báo kích hoạt tài khoản</title>
                                <style>
                                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                                    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                                    .header { background-color: #F26F21; color: #fff; padding: 20px; text-align: center; }
                                    .header h1 { margin: 0; font-size: 24px; }
                                    .content { padding: 30px; }
                                    .info-box { background-color: #f9f9f9; border-left: 4px solid #F26F21; padding: 15px; margin: 20px 0; }
                                    .label { font-weight: bold; color: #555; }
                                    .value { font-family: 'Consolas', monospace; color: #333; font-weight: bold; }
                                    .footer { background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                                    .btn { display: inline-block; padding: 10px 20px; background-color: #F26F21; color: #fff; text-decoration: none; border-radius: 4px; margin-top: 10px; font-weight: bold; }
                                    .btn:hover { background-color: #d95e16; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>FAMS - Hệ thống Quản lý Học vụ</h1>
                                    </div>
                                    <div class="content">
                                        <p>Xin chào <strong>%s</strong>,</p>
                                        <p>Chúc mừng! Tài khoản của bạn đã được kích hoạt thành công.</p>
                                        <p>Dưới đây là thông tin đăng nhập vào hệ thống:</p>

                                        <div class="info-box">
                                            <p><span class="label">Tên đăng nhập:</span> <span class="value">%s</span></p>
                                            <p><span class="label">Mật khẩu:</span> <span class="value">%s</span></p>
                                        </div>

                                        <p>Để bảo mật tài khoản, vui lòng đăng nhập và thay đổi mật khẩu ngay trong lần truy cập đầu tiên.</p>

                                        <div style="text-align: center;">
                                            <a href="http://localhost:5173" class="btn">Truy cập FAMS ngay</a>
                                        </div>
                                    </div>
                                    <div class="footer">
                                        <p>Đây là email tự động, vui lòng không trả lời email này.</p>
                                        <p>FPT High School &copy; 2024</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                            """,
                    fullName, username, password);

            helper.setText(htmlContent, true);

            javaMailSender.send(message);
            log.info("Email sent successfully to {}", to);

        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            // We don't throw exception here to avoid rolling back the transaction if email
            // fails
        } catch (Exception e) {
            log.error("Unexpected error sending email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    @Override
    public void sendOtpEmail(String to, String otp) {
        if (to == null || to.isEmpty()) {
            log.warn("Cannot send OTP email: Recipient email is empty");
            return;
        }

        try {
            log.info("Sending OTP email to: {}", to);
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "FAMS System");
            helper.setTo(to);
            helper.setSubject("Mã xác thực (OTP) khôi phục mật khẩu FAMS");

            String htmlContent = String.format(
                    """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>Xác thực OTP</title>
                                <style>
                                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                                    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                                    .header { background-color: #F26F21; color: #fff; padding: 20px; text-align: center; }
                                    .header h1 { margin: 0; font-size: 24px; }
                                    .content { padding: 30px; text-align: center; }
                                    .otp-box { background-color: #f9f9f9; border: 2px dashed #F26F21; padding: 20px; margin: 20px auto; width: fit-content; }
                                    .otp-code { font-size: 32px; letter-spacing: 5px; color: #F26F21; font-weight: bold; }
                                    .footer { background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                                    .warning { color: #e11d48; font-size: 13px; margin-top: 20px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>FAMS - Khôi phục mật khẩu</h1>
                                    </div>
                                    <div class="content">
                                        <p>Xin chào,</p>
                                        <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản FAMS. Mã OTP của bạn là:</p>

                                        <div class="otp-box">
                                            <span class="otp-code">%s</span>
                                        </div>

                                        <p>Mã này có hiệu lực trong <strong>10 phút</strong>. Vui lòng không cung cấp mã này cho bất kỳ ai khác.</p>

                                        <p class="warning">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                                    </div>
                                    <div class="footer">
                                        <p>Đây là email tự động, vui lòng không trả lời email này.</p>
                                        <p>FPT High School &copy; 2024</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                            """,
                    otp);

            helper.setText(htmlContent, true);

            javaMailSender.send(message);
            log.info("OTP Email sent successfully to {}", to);

        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending OTP email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    @Override
    public void sendEmail(String to, String subject, String content) {
        if (to == null || to.isEmpty()) {
            log.warn("Cannot send email: Recipient email is empty");
            return;
        }

        try {
            log.info("Sending generic email to: {}", to);
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "FAMS AI Assistant");
            helper.setTo(to);
            helper.setSubject(subject);

            String htmlContent = String.format(
                    """
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <style>
                                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                                    .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                                    .header { background-color: #F26F21; color: #fff; padding: 20px; text-align: center; }
                                    .header h1 { margin: 0; font-size: 24px; }
                                    .content { padding: 30px; }
                                    .footer { background-color: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>FAMS Notification</h1>
                                    </div>
                                    <div class="content">
                                        %s
                                    </div>
                                    <div class="footer">
                                        <p>Đây là email được gửi tự động từ FAMS AI Assistant.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                            """,
                    content.replace("\n", "<br>"));

            helper.setText(htmlContent, true);

            javaMailSender.send(message);
            log.info("Generic email sent successfully to {}", to);

        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("Failed to send generic email to {}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending generic email to {}: {}", to, e.getMessage());
        }
    }
}
