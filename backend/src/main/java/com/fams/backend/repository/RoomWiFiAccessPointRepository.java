package com.fams.backend.repository;

import com.fams.backend.entity.RoomWiFiAccessPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomWiFiAccessPointRepository extends JpaRepository<RoomWiFiAccessPoint, Long> {

    /**
     * Find all WiFi access points for a room
     */
    List<RoomWiFiAccessPoint> findByRoomId(Long roomId);

    /**
     * Find the primary access point for a room
     */
    RoomWiFiAccessPoint findByRoomIdAndIsPrimaryTrue(Long roomId);

    /**
     * Check if a BSSID is associated with a room
     */
    @Query("SELECT CASE WHEN COUNT(rwap) > 0 THEN true ELSE false END " +
            "FROM RoomWiFiAccessPoint rwap " +
            "WHERE rwap.room.id = :roomId " +
            "AND rwap.wifiAccessPoint.bssid = :bssid")
    boolean existsByRoomIdAndWifiAccessPointBssid(
            @Param("roomId") Long roomId,
            @Param("bssid") String bssid);

    /**
     * Get all BSSIDs for a room
     */
    @Query("SELECT rwap.wifiAccessPoint.bssid FROM RoomWiFiAccessPoint rwap " +
            "WHERE rwap.room.id = :roomId")
    List<String> findBssidsByRoomId(@Param("roomId") Long roomId);
}
