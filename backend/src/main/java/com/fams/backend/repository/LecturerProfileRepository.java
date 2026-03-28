package com.fams.backend.repository;

import com.fams.backend.dto.response.GroupedStatDTO;
import com.fams.backend.entity.LecturerProfile;
import com.fams.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {
    Optional<LecturerProfile> findByUser(User user);

    boolean existsByUser(User user);

    List<LecturerProfile> findAllByUserIdIn(List<Long> userIds);

    @Query("SELECT new com.fams.backend.dto.response.GroupedStatDTO(" +
            "COALESCE(lp.department, 'Chưa xác định'), COUNT(lp)) " +
            "FROM LecturerProfile lp " +
            "GROUP BY lp.department")
    List<GroupedStatDTO> countByDepartment();
}
