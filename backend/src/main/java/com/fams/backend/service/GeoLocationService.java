package com.fams.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class GeoLocationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Free IP geolocation API
    private static final String GEO_API_URL = "http://ip-api.com/json/";

    // Mapping English province names to Vietnamese
    private static final Map<String, String> PROVINCE_MAP = new HashMap<>();

    static {
        // North Vietnam
        PROVINCE_MAP.put("Hanoi", "Hà Nội");
        PROVINCE_MAP.put("Hai Phong", "Hải Phòng");
        PROVINCE_MAP.put("Quang Ninh", "Quảng Ninh");
        PROVINCE_MAP.put("Bac Ninh", "Bắc Ninh");
        PROVINCE_MAP.put("Hai Duong", "Hải Dương");
        PROVINCE_MAP.put("Hung Yen", "Hưng Yên");
        PROVINCE_MAP.put("Thai Binh", "Thái Bình");
        PROVINCE_MAP.put("Nam Dinh", "Nam Định");
        PROVINCE_MAP.put("Ninh Binh", "Ninh Bình");
        PROVINCE_MAP.put("Vinh Phuc", "Vĩnh Phúc");
        PROVINCE_MAP.put("Bac Giang", "Bắc Giang");
        PROVINCE_MAP.put("Phu Tho", "Phú Thọ");

        // Central Vietnam
        PROVINCE_MAP.put("Thanh Hoa", "Thanh Hóa");
        PROVINCE_MAP.put("Nghe An", "Nghệ An");
        PROVINCE_MAP.put("Ha Tinh", "Hà Tĩnh");
        PROVINCE_MAP.put("Quang Binh", "Quảng Bình");
        PROVINCE_MAP.put("Quang Tri", "Quảng Trị");
        PROVINCE_MAP.put("Thua Thien-Hue", "Thừa Thiên Huế");
        PROVINCE_MAP.put("Da Nang", "Đà Nẵng");
        PROVINCE_MAP.put("Quang Nam", "Quảng Nam");
        PROVINCE_MAP.put("Quang Ngai", "Quảng Ngãi");
        PROVINCE_MAP.put("Binh Dinh", "Bình Định");
        PROVINCE_MAP.put("Phu Yen", "Phú Yên");
        PROVINCE_MAP.put("Khanh Hoa", "Khánh Hòa");
        PROVINCE_MAP.put("Ninh Thuan", "Ninh Thuận");
        PROVINCE_MAP.put("Binh Thuan", "Bình Thuận");

        // South Vietnam
        PROVINCE_MAP.put("Ho Chi Minh City", "Hồ Chí Minh");
        PROVINCE_MAP.put("Dong Nai", "Đồng Nai");
        PROVINCE_MAP.put("Binh Duong", "Bình Dương");
        PROVINCE_MAP.put("Ba Ria-Vung Tau", "Bà Rịa - Vũng Tàu");
        PROVINCE_MAP.put("Long An", "Long An");
        PROVINCE_MAP.put("Tien Giang", "Tiền Giang");
        PROVINCE_MAP.put("Ben Tre", "Bến Tre");
        PROVINCE_MAP.put("Vinh Long", "Vĩnh Long");
        PROVINCE_MAP.put("Tra Vinh", "Trà Vinh");
        PROVINCE_MAP.put("Can Tho", "Cần Thơ");
        PROVINCE_MAP.put("Dong Thap", "Đồng Tháp");
        PROVINCE_MAP.put("An Giang", "An Giang");
        PROVINCE_MAP.put("Kien Giang", "Kiên Giang");
        PROVINCE_MAP.put("Soc Trang", "Sóc Trăng");
        PROVINCE_MAP.put("Bac Lieu", "Bạc Liêu");
        PROVINCE_MAP.put("Ca Mau", "Cà Mau");
    }

    public GeoLocationService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000); // 3 seconds
        factory.setReadTimeout(3000); // 3 seconds
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    public LocationData getLocationFromIP(String ipAddress) {
        try {
            // Skip localhost/private IPs
            if (isPrivateIP(ipAddress)) {
                log.debug("Private IP detected: {}, returning default location (Hanoi)", ipAddress);
                return LocationData.builder()
                        .province("Hà Nội")
                        .city("Hà Nội")
                        .latitude(new BigDecimal("21.0285"))
                        .longitude(new BigDecimal("105.8542"))
                        .build();
            }

            String url = GEO_API_URL + ipAddress;
            String response = restTemplate.getForObject(url, String.class);

            JsonNode root = objectMapper.readTree(response);

            if ("success".equals(root.get("status").asText())) {
                String regionName = root.get("regionName").asText();
                String city = root.get("city").asText();
                double lat = root.get("lat").asDouble();
                double lon = root.get("lon").asDouble();

                // Map to Vietnamese province name
                String vietnameseProvince = PROVINCE_MAP.getOrDefault(regionName, regionName);

                return LocationData.builder()
                        .province(vietnameseProvince)
                        .city(city)
                        .latitude(new BigDecimal(lat))
                        .longitude(new BigDecimal(lon))
                        .build();
            }

            log.warn("Failed to get location for IP: {}", ipAddress);
            return getDefaultLocation();

        } catch (Exception e) {
            log.error("Error getting location for IP: {}", ipAddress, e);
            return getDefaultLocation();
        }
    }

    private boolean isPrivateIP(String ip) {
        if (ip == null)
            return true;
        return ip.startsWith("127.") ||
                ip.startsWith("10.") ||
                ip.startsWith("192.168.") ||
                ip.startsWith("172.") ||
                "0:0:0:0:0:0:0:1".equals(ip) ||
                "::1".equals(ip);
    }

    private LocationData getDefaultLocation() {
        return LocationData.builder()
                .province("Hà Nội")
                .city("Hà Nội")
                .latitude(new BigDecimal("21.0285"))
                .longitude(new BigDecimal("105.8542"))
                .build();
    }

    @lombok.Data
    @lombok.Builder
    public static class LocationData {
        private String province;
        private String city;
        private BigDecimal latitude;
        private BigDecimal longitude;
    }
}
