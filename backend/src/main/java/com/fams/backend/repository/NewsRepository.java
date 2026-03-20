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
}
