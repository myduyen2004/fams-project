package com.fams.backend.repository;

import com.fams.backend.document.NewsReadStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsReadStatusMongoRepository extends MongoRepository<NewsReadStatus, String> {
    boolean existsByUserIdAndNewsId(Long userId, Long newsId);
    long countByUserIdAndNewsIdIn(Long userId, List<Long> newsIds);
}
