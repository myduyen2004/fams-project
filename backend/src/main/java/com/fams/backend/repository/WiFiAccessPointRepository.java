package com.fams.backend.repository;

import com.fams.backend.entity.WiFiAccessPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WiFiAccessPointRepository extends JpaRepository<WiFiAccessPoint, Long> {

    Optional<WiFiAccessPoint> findByBssid(String bssid);

    boolean existsByBssid(String bssid);
}
