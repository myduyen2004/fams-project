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
import org.springframework.web.bind.annotation.CrossOrigin;
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
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
@Tag(name = "News", description = "API quản lý tin tức")
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/api/admin/news")
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

    @GetMapping("/api/admin/news/{id}")
    @Operation(summary = "Lấy chi tiết tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> getAdminNewsById(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.getAdminNewsById(id));
    }

    @PostMapping("/api/admin/news")
    @Operation(summary = "Tạo tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> createNews(@Valid @RequestBody NewsRequest request) {
        return ResponseEntity.ok(newsService.createNews(request));
    }

    @PutMapping("/api/admin/news/{id}")
    @Operation(summary = "Cập nhật tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> updateNews(@PathVariable Long id, @Valid @RequestBody NewsRequest request) {
        return ResponseEntity.ok(newsService.updateNews(id, request));
    }

    @PostMapping("/api/admin/news/{id}/publish")
    @Operation(summary = "Xuất bản tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<NewsResponse> publishNews(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.publishNews(id));
    }

    @DeleteMapping("/api/admin/news/{id}")
    @Operation(summary = "Xóa tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id) {
        newsService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/admin/news/bulk-delete")
    @Operation(summary = "Xóa nhiều tin tức")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ACADEMIC_STAFF')")
    public ResponseEntity<Map<String, String>> bulkDeleteNews(@RequestBody Map<String, List<Long>> body) {
        List<Long> ids = body.get("ids");
        newsService.bulkDeleteNews(ids);
        return ResponseEntity.ok(Map.of("message", "Đã xóa " + ids.size() + " tin tức"));
    }

    @GetMapping("/api/news")
    @Operation(summary = "Lấy danh sách tin tức đã xuất bản")
    public ResponseEntity<Page<NewsResponse>> getPublishedNews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(newsService.getPublishedNews(page, size));
    }

    @GetMapping("/api/news/{id}")
    @Operation(summary = "Lấy chi tiết tin tức đã xuất bản")
    public ResponseEntity<NewsResponse> getPublishedNewsById(@PathVariable Long id) {
        return ResponseEntity.ok(newsService.getPublishedNewsById(id));
    }
}
