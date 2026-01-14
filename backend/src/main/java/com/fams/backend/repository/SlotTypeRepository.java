package com.fams.backend.repository;

import com.fams.backend.entity.SlotType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlotTypeRepository extends JpaRepository<SlotType, Long> {
    List<SlotType> findBySemesterIdOrderBySlotIndexAsc(Long semesterId);
}
