package com.fams.backend.controller;

import com.fams.backend.dto.request.NewsRequest;
import com.fams.backend.dto.response.NewsResponse;
import com.fams.backend.service.NewsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
@Tag(name = "News", description = "API quản lý tin tức")
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/admin")
    @Operation(summary = "Lấy danh sách tin tức cho admin")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<Page<NewsResponse>> getAdminNews(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "ALL") String targetType,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(newsService.getAdminNews(search, targetType, status, page, size));
    }

    @GetMapping("/admin/{id}")
    @Operation(summary = "Lấy chi tiết tin tức (admin)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> getAdminNewsById(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.getAdminNewsById(id));
    }

    @PostMapping("/admin")
    @Operation(summary = "Tạo tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> createNews(@Valid @RequestBody NewsRequest request) {
        return ResponseEntity.ok(newsService.createNews(request));
    }

    @PutMapping("/admin/{id}")
    @Operation(summary = "Cập nhật tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> updateNews(@PathVariable Long id, @Valid @RequestBody NewsRequest request) {
        return ResponseEntity.ok(newsService.updateNews(id, request));
    }

    @PostMapping("/admin/{id}/publish")
    @Operation(summary = "Xuất bản tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> publishNews(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.publishNews(id));
    }

    @DeleteMapping("/admin/{id}")
    @Operation(summary = "Xóa tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id) {
        newsService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/bulk-delete")
    @Operation(summary = "Xóa nhiều tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<Map<String, String>> bulkDeleteNews(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        newsService.bulkDeleteNews(ids);
        return ResponseEntity.ok(Map.of("message", "Đã xóa " + ids.size() + " tin tức"));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tin tức đã xuất bản")
    public ResponseEntity<Page<NewsResponse>> getPublishedNews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(newsService.getPublishedNews(page, size));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng tin tức chưa đọc")
    public ResponseEntity<Map<String, Long>> getUnreadNewsCount() {
        return ResponseEntity.ok(Map.of("count", newsService.getUnreadCount()));
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Đánh dấu tin tức đã đọc")
    public ResponseEntity<Void> markNewsAsRead(@PathVariable Long id) {
        newsService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết tin tức đã xuất bản")
    public ResponseEntity<NewsResponse> getPublishedNewsById(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.getPublishedNewsById(id));
    }
}
