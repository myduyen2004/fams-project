package com.fams.backend.repository;

import com.fams.backend.entity.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<News, Long>, JpaSpecificationExecutor<News> {
    List<News> findByStatusAndScheduledAtLessThanEqual(News.NewsStatus status, LocalDateTime scheduledAt);

    boolean existsByTitleIgnoreCase(String title);

    boolean existsByTitleIgnoreCaseAndIdNot(String title, Long id);

    long countByStatusAndTargetTypeIn(News.NewsStatus status, List<News.TargetType> targetTypes);

    @org.springframework.data.jpa.repository.Query("SELECT n.id FROM News n WHERE n.status = :status AND n.targetType IN :targetTypes")
    List<Long> findIdsByStatusAndTargetTypeIn(News.NewsStatus status, List<News.TargetType> targetTypes);
}
