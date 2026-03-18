package com.fams.backend.repository;

import com.fams.backend.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    List<UserPermission> findByUserId(Long userId);

    @Query("SELECT up.permission FROM UserPermission up WHERE up.user.id = :userId")
    List<UserPermission.Permission> findPermissionsByUserId(@Param("userId") Long userId);

    Optional<UserPermission> findByUserIdAndPermission(Long userId, UserPermission.Permission permission);

    boolean existsByUserIdAndPermission(Long userId, UserPermission.Permission permission);

    @Modifying
    void deleteByUserIdAndPermission(Long userId, UserPermission.Permission permission);

    @Modifying
    void deleteByUserId(Long userId);
}
