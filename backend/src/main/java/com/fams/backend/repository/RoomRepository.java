package com.fams.backend.repository;

import com.fams.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByCode(String code);

    List<Room> findByBuilding(String building);

    boolean existsByCode(String code);
}
