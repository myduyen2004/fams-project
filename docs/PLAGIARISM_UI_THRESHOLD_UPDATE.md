# Tinh Gọn Kết Quả Đạo Văn + Cấu Hình Ngưỡng Theo Bài Tập

## 1. Mục tiêu
- Bỏ phần `Đạo văn ở đâu (Top 3 minh chứng)`.
- Bỏ phần `Nguồn bài đối chiếu`.
- Phần `Nhận định AI` hiển thị danh sách loại nghi ngờ đạo văn + câu tóm tắt.
- `Những bài tương đồng` chỉ còn: tên, lớp, bài tập trùng, file đính kèm, % đạo văn, lý do.
- Có icon cài đặt cạnh nút `Check đạo văn bài tập` để chỉnh ngưỡng từng bài.

## 2. Cấu hình mặc định
- Text: `>= 70%`
- Image: `>= 95%`

## 3. Backend
- [x] Thêm cột ngưỡng trong bảng `assignments`:
  - `plagiarism_text_threshold`
  - `plagiarism_image_threshold`
- [x] Backfill dữ liệu cũ về giá trị mặc định.
- [x] Trả ngưỡng trong `AssignmentResponse`.
- [x] Thêm API cập nhật cấu hình ngưỡng theo bài tập.
- [x] Dùng ngưỡng theo assignment trong check plagiarism (không hard-code).
- [x] Điều kiện kết luận nghi ngờ dùng `>=`.
- [x] Trả thêm thông tin `className`, `assignmentTitle` cho từng match.

## 4. Frontend
- [x] Thêm icon cài đặt bên cạnh nút `Check đạo văn bài tập`.
- [x] Modal cấu hình ngưỡng (% text, % image), lưu theo assignment.
- [x] Ẩn toàn bộ block Top 3 minh chứng.
- [x] Ẩn toàn bộ block Nguồn bài đối chiếu.
- [x] `Nhận định AI` hiển thị danh sách reason tags + câu tổng kết.
- [x] Bảng `Những bài tương đồng` rút gọn đúng cột yêu cầu.

## 5. Acceptance Criteria
- Giảng viên đổi ngưỡng và lưu thành công.
- Check từng bài và check cả bài tập dùng ngưỡng mới.
- Modal kết quả không còn nội dung dài dòng về minh chứng/nguồn.
- Lý do hiển thị theo định dạng `Tag + câu tóm tắt`.

## 6. File chính đã chỉnh
- `backend/src/main/resources/db/migration/V20260415103000__add_plagiarism_thresholds_to_assignments.sql`
- `backend/src/main/java/com/fams/backend/entity/Assignment.java`
- `backend/src/main/java/com/fams/backend/controller/LecturerAssignmentController.java`
- `backend/src/main/java/com/fams/backend/service/AssignmentSubmissionService.java`
- `backend/src/main/java/com/fams/backend/service/impl/AssignmentSubmissionServiceImpl.java`
- `backend/src/main/java/com/fams/backend/service/plagiarism/AssignmentVectorPlagiarismService.java`
- `backend/src/main/java/com/fams/backend/dto/response/AssignmentResponse.java`
- `backend/src/main/java/com/fams/backend/dto/response/AssignmentPlagiarismMatchResponse.java`
- `frontend/src/services/api/assignmentService.ts`
- `frontend/src/pages/lecturer/LecturerAssignmentDetailPage.tsx`
