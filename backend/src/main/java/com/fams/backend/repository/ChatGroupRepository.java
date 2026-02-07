package com.fams.backend.repository;

import com.fams.backend.entity.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {

    Optional<ChatGroup> findByClassSectionClassName(String className);

    boolean existsByClassSectionClassName(String className);

    @Query("SELECT cg FROM ChatGroup cg JOIN cg.members m WHERE m.user.id = :userId AND m.leftAt IS NULL ORDER BY cg.createdAt DESC")
    List<ChatGroup> findByMemberId(@Param("userId") Long userId);

    @Query("SELECT cg FROM ChatGroup cg LEFT JOIN FETCH cg.classSection WHERE cg.id = :id")
    Optional<ChatGroup> findByIdWithClassSection(@Param("id") Long id);
}
