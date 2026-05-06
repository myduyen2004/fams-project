package com.fams.backend.config;

import com.fams.backend.service.DiscordNotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;

@Component
@Slf4j
public class StartupNotificationListener {

    @Autowired(required = false)
    private DiscordNotificationService discordNotificationService;

    @Value("${app.base-url:}")
    private String appBaseUrl;

    @Value("${ai-service.url:}")
    private String aiServiceUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (discordNotificationService != null) {
            String hostName = "Unknown";
            try {
                hostName = InetAddress.getLocalHost().getHostName();
            } catch (UnknownHostException e) {
                log.warn("Could not determine host name for startup notification");
            }

            log.info("Sending startup notification to Discord...");
            String statusDetails = "✅ System is up on " + hostName;
            
            discordNotificationService.sendDeploymentNotification(
                "success", 
                "main", 
                statusDetails,
                appBaseUrl
            );
        } else {
            log.info("Discord notification is disabled. Skipping startup message.");
        }
    }
}
