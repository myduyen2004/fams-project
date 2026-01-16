# GIẢI THÍCH: Dockerfile dùng để tạo Docker image cho Backend
# Multi-stage build giúp giảm kích thước image cuối cùng

# ========================================
# STAGE 1: Build Stage
# ========================================
# GIẢI THÍCH: Stage này compile code Java thành file .jar
FROM maven:3.9-eclipse-temurin-23-alpine AS build

# Set working directory trong container
WORKDIR /app

# GIẢI THÍCH: Copy pom.xml trước để tận dụng Docker layer caching
# Nếu pom.xml không thay đổi, Maven không cần download lại dependencies
COPY pom.xml .

# Download dependencies (cached nếu pom.xml không đổi)
RUN mvn dependency:go-offline -B

# Copy toàn bộ source code
COPY src ./src

# Build application (skip tests để build nhanh hơn)
# GIẢI THÍCH: 
# - clean: Xóa thư mục target cũ
# - package: Build và tạo file .jar (dependencies sẽ tự động download)
# - -DskipTests: Bỏ qua tests khi build
RUN mvn clean package -DskipTests

# ========================================
# STAGE 2: Runtime Stage
# ========================================
# GIẢI THÍCH: Stage này chỉ chứa JRE và file .jar, không có Maven
# Alpine Linux rất nhẹ (~5MB), giúp image nhỏ gọn
FROM eclipse-temurin:23-jre-alpine

# Install curl để health check
RUN apk add --no-cache curl

# Create non-root user for security
# GIẢI THÍCH: Không nên chạy app với root user vì lý do bảo mật
RUN addgroup -g 1001 -S appuser && \
  adduser -u 1001 -S appuser -G appuser

WORKDIR /app

# Copy file .jar từ build stage
# GIẢI THÍCH: --from=build lấy file từ stage build ở trên
COPY --from=build /app/target/*.jar app.jar

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 8080
# GIẢI THÍCH: Khai báo port mà container sẽ lắng nghe
# (thực tế port sẽ được map khi chạy docker run)
EXPOSE 8080

# Health check
# GIẢI THÍCH: Docker sẽ định kỳ check xem container có healthy không
# Nếu fail nhiều lần, Docker sẽ restart container
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run application
# GIẢI THÍCH:
# - java -jar: Chạy file jar
# - -Xms512m -Xmx1024m: Set min/max heap memory
# - -Djava.security.egd: Tăng tốc random number generation
ENTRYPOINT ["java", \
  "-Xms512m", \
  "-Xmx1024m", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", \
  "app.jar"]