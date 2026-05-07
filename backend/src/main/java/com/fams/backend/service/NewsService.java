package com.fams.backend.service;

import com.fams.backend.dto.request.NewsRequest;
import com.fams.backend.dto.response.NewsResponse;
import com.fams.backend.entity.News;
import com.fams.backend.document.NewsReadStatus;
import com.fams.backend.entity.User;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.exception.NotFoundException;
import com.fams.backend.repository.NewsRepository;
import com.fams.backend.repository.NewsReadStatusMongoRepository;
import com.fams.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {

    private final NewsRepository newsRepository;
    private final NewsReadStatusMongoRepository newsReadStatusMongoRepository;
    private final UserRepository userRepository;
    private final FcmService fcmService;

    @Transactional(readOnly = true)
    public Page<NewsResponse> getAdminNews(String search, String targetType, String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<News> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("content")), pattern)
                ));
            }

            if (targetType != null && !targetType.trim().isEmpty() && !"ALL".equalsIgnoreCase(targetType)) {
                try {
                    predicates.add(cb.equal(root.get("targetType"), News.TargetType.valueOf(targetType.toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                }
            }

            if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                try {
                    predicates.add(cb.equal(root.get("status"), News.NewsStatus.valueOf(status.toUpperCase())));
                } catch (IllegalArgumentException ignored) {
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return newsRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public NewsResponse getAdminNewsById(Long id) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin tức với ID: " + id));
        return toResponse(news);
    }

    @Transactional
    public NewsResponse createNews(NewsRequest request) {
        User sender = getCurrentUser();

        if (newsRepository.existsByTitleIgnoreCase(request.getTitle())) {
            throw new BadRequestException("Tiêu đề đã tồn tại, vui lòng dùng tiêu đề khác");
        }

        log.info("Creating news: title='{}', targetType={}, status={}, scheduledAt={}",
            request.getTitle(), request.getTargetType(), request.getStatus(), request.getScheduledAt());

        News news = News.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .targetType(request.getTargetType())
                .type(request.getType() != null ? request.getType() : News.NewsType.SYSTEM)
                .thumbnailImage(request.getThumbnailImage())
                .attachmentUrls(request.getAttachmentUrls() != null ? new ArrayList<>(request.getAttachmentUrls()) : new ArrayList<>())
                .sender(sender)
                .status(request.getStatus() != null ? request.getStatus() : News.NewsStatus.DRAFT)
                .scheduledAt(request.getScheduledAt())
                .build();

        if (news.getStatus() == News.NewsStatus.SENT) {
            news.setSentAt(LocalDateTime.now());
        }

        News saved = newsRepository.save(news);

        log.info("Created news ID {} with status {}", saved.getId(), saved.getStatus());

        if (saved.getStatus() == News.NewsStatus.SENT) {
            try {
                sendNewsPushNotification(saved);
            } catch (Exception e) {
                log.warn("Failed to send FCM for news {}", saved.getId(), e);
            }
        }

        return toResponse(saved);
    }

    @Transactional
    public NewsResponse updateNews(Long id, NewsRequest request) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin tức với ID: " + id));

        if (newsRepository.existsByTitleIgnoreCaseAndIdNot(request.getTitle(), id)) {
            throw new BadRequestException("Tiêu đề đã tồn tại, vui lòng dùng tiêu đề khác");
        }

        // Cho phép chỉnh sửa ở mọi trạng thái

        news.setTitle(request.getTitle());
        news.setContent(request.getContent());
        news.setTargetType(request.getTargetType());
        if (request.getType() != null) news.setType(request.getType());
        if (request.getStatus() != null) news.setStatus(request.getStatus());
        news.setScheduledAt(request.getScheduledAt());
        news.setThumbnailImage(request.getThumbnailImage());
        news.setAttachmentUrls(request.getAttachmentUrls() != null ? new ArrayList<>(request.getAttachmentUrls()) : new ArrayList<>());

        return toResponse(newsRepository.save(news));
    }

    @Transactional
    public NewsResponse publishNews(Long id) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin tức với ID: " + id));

        log.info("Publishing news ID {}", id);

        news.setStatus(News.NewsStatus.SENT);
        news.setSentAt(LocalDateTime.now());

        News saved = newsRepository.save(news);
        try {
            sendNewsPushNotification(saved);
        } catch (Exception e) {
            log.warn("Failed to send FCM for news {}", id, e);
        }

        return toResponse(saved);
    }

    @Transactional
    public void publishScheduledNews() {
        List<News> upcomingNews = newsRepository.findByStatusAndScheduledAtLessThanEqual(News.NewsStatus.SCHEDULED, LocalDateTime.now());
        if (upcomingNews.isEmpty()) return;

        log.info("Publishing {} scheduled news item(s)", upcomingNews.size());

        for (News news : upcomingNews) {
            news.setStatus(News.NewsStatus.SENT);
            news.setSentAt(LocalDateTime.now());
            try {
                sendNewsPushNotification(news);
            } catch (Exception e) {
                log.warn("Failed to send FCM for scheduled news {}", news.getId(), e);
            }
        }
        newsRepository.saveAll(upcomingNews);
    }

    private void sendNewsPushNotification(News news) {
        List<User> recipients = switch (news.getTargetType()) {
            case ALL -> userRepository.findAll().stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            case STUDENT -> userRepository.findByRole(User.UserRole.STUDENT)
                    .orElse(List.of()).stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            case LECTURER -> userRepository.findByRole(User.UserRole.LECTURER)
                    .orElse(List.of()).stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            case ACADEMIC_STAFF -> userRepository.findByRole(User.UserRole.ACADEMIC_STAFF)
                    .orElse(List.of()).stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            case ADMIN -> userRepository.findByRole(User.UserRole.ADMIN)
                    .orElse(List.of()).stream()
                    .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                    .toList();
            default -> List.of();
        };

        if (recipients.isEmpty()) {
            log.info("No active recipients for news ID {} targetType {}", news.getId(), news.getTargetType());
            return;
        }

        String rawTitle = news.getTitle() == null ? "" : news.getTitle().trim();
        String pushTitle = rawTitle.length() > 100 ? rawTitle.substring(0, 100) + "..." : rawTitle;
        
        String rawContent = news.getContent() == null ? "" : news.getContent();
        String pushBody = fcmService.formatPushBody(rawContent, 150);
        if (pushBody.isEmpty()) {
            pushBody = "Nhấn để xem chi tiết.";
        }

        List<Long> recipientIds = recipients.stream().map(User::getId).toList();
        Map<String, String> fcmData = Map.of(
                "type", "NEWS",
                "newsId", String.valueOf(news.getId())
        );

        fcmService.sendPushNotificationsForUsers(recipientIds, pushTitle, pushBody, fcmData);
        log.info("Sent news FCM push to {} users for news ID {}", recipientIds.size(), news.getId());
    }

    @Transactional
    public void deleteNews(Long id) {
        if (!newsRepository.existsById(id)) {
            throw new NotFoundException("Không tìm thấy tin tức với ID: " + id);
        }
        newsRepository.deleteById(id);
    }

    @Transactional
    public void bulkDeleteNews(List<Long> ids) {
        newsRepository.deleteAllById(ids);
    }

    @Transactional(readOnly = true)
    public Page<NewsResponse> getPublishedNews(int page, int size) {
        return getPublishedNews(getCurrentUser(), page, size);
    }

    @Transactional(readOnly = true)
    public Page<NewsResponse> getPublishedNews(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sentAt"));
        List<News.TargetType> visibleTargets = getVisibleTargetTypes(currentUser);

        Specification<News> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), News.NewsStatus.SENT));
            predicates.add(root.get("targetType").in(visibleTargets));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return newsRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public NewsResponse getPublishedNewsById(Long id) {
        News news = newsRepository.findById(id)
                .filter(n -> n.getStatus() == News.NewsStatus.SENT)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin tức đã xuất bản với ID: " + id));

        User currentUser = getCurrentUser();
        List<News.TargetType> visibleTargets = getVisibleTargetTypes(currentUser);
        if (!visibleTargets.contains(news.getTargetType())) {
            throw new NotFoundException("Bạn không có quyền xem tin tức này");
        }

        return toResponse(news);
    }

    @Transactional
    public void markAsRead(Long newsId) {
        User currentUser = getCurrentUser();
        News news = newsRepository.findById(newsId)
                .filter(n -> n.getStatus() == News.NewsStatus.SENT)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tin tức đã xuất bản với ID: " + newsId));

        List<News.TargetType> visibleTargets = getVisibleTargetTypes(currentUser);
        if (!visibleTargets.contains(news.getTargetType())) {
            throw new NotFoundException("Bạn không có quyền xem tin tức này");
        }

        if (newsReadStatusMongoRepository.existsByUserIdAndNewsId(currentUser.getId(), news.getId())) {
            return;
        }

        NewsReadStatus readStatus = NewsReadStatus.builder()
                .userId(currentUser.getId())
                .newsId(news.getId())
                .readAt(LocalDateTime.now())
                .build();
        newsReadStatusMongoRepository.save(readStatus);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return getUnreadCount(getCurrentUser());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(User currentUser) {
        List<News.TargetType> visibleTargets = getVisibleTargetTypes(currentUser);

        List<Long> visibleSentNewsIds = newsRepository.findIdsByStatusAndTargetTypeIn(News.NewsStatus.SENT, visibleTargets);
        if (visibleSentNewsIds.isEmpty()) return 0;
        
        long readVisibleSent = newsReadStatusMongoRepository.countByUserIdAndNewsIdIn(currentUser.getId(), visibleSentNewsIds);
        long unreadCount = visibleSentNewsIds.size() - readVisibleSent;
        return Math.max(unreadCount, 0);
    }

    /**
     * Xác định các TargetType mà user hiện tại có quyền xem.
     */
    private List<News.TargetType> getVisibleTargetTypes(User user) {
        List<News.TargetType> targets = new ArrayList<>();
        targets.add(News.TargetType.ALL);

        switch (user.getRole()) {
            case STUDENT -> targets.add(News.TargetType.STUDENT);
            case LECTURER -> targets.add(News.TargetType.LECTURER);
            case ACADEMIC_STAFF -> targets.add(News.TargetType.ACADEMIC_STAFF);
            case ADMIN -> {
                targets.add(News.TargetType.STUDENT);
                targets.add(News.TargetType.LECTURER);
                targets.add(News.TargetType.ACADEMIC_STAFF);
                targets.add(News.TargetType.ADMIN);
            }
        }
        return targets;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }

    private NewsResponse toResponse(News news) {
        return NewsResponse.builder()
                .id(news.getId())
                .title(news.getTitle())
                .content(news.getContent())
                .targetType(news.getTargetType())
                .type(news.getType())
                .senderName(news.getSender() != null ? news.getSender().getFullName() : "Hệ thống")
                .senderAvatar(news.getSender() != null ? news.getSender().getAvatar() : null)
                .status(news.getStatus())
                .publishedAt(news.getSentAt())
                .createdAt(news.getCreatedAt())
                .scheduledAt(news.getScheduledAt())
                .thumbnailImage(news.getThumbnailImage())
                .attachmentUrls(news.getAttachmentUrls() != null ? new ArrayList<>(news.getAttachmentUrls()) : new ArrayList<>())
                .build();
    }
}
