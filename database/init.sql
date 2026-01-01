-- Database Initialization Script
-- Code này sẽ chạy khi container database khởi tạo lần đầu tiên (nếu thư mục data đang rỗng)

-- Tạo extension nếu cần (Ví dụ: uuid-ossp cho UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Các lệnh tạo bảng hoặc user khác có thể đặt ở đây
-- Tuy nhiên, dự án này dùng Hibernate ddl-auto=update nên bảng sẽ tự tạo bởi Backend

