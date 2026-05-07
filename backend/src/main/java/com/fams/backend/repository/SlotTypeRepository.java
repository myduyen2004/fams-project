package com.fams.backend.repository;

import com.fams.backend.entity.SlotType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlotTypeRepository extends JpaRepository<SlotType, Long> {
    List<SlotType> findBySemesterIdOrderBySlotIndexAsc(Long semesterId);

    List<SlotType> findBySemesterCodeOrderBySlotIndexAsc(String semesterCode);

    java.util.Optional<SlotType> findBySemesterIdAndSlotIndex(Long semesterId, Integer slotIndex);

    @Modifying
    @Query("DELETE FROM SlotType st WHERE st.semester.id = :semesterId")
    void deleteBySemesterId(@Param("semesterId") Long semesterId);
}
