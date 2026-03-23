import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:solar_icons/solar_icons.dart';
import 'package:intl/intl.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/utils/safe_image_decoder.dart';
import '../models/news_model.dart';
import '../controllers/news_controller.dart';

class NewsDetailScreen extends StatelessWidget {
  final NewsModel news;

  const NewsDetailScreen({super.key, required this.news});

  /// Resolve image URL: if relative, prepend the backend base URL
  String _resolveImageUrl(String src) {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    return '${ApiConstants.baseUrl}$src';
  }

  /// Remove base64 img tags and invalid img tags from HTML before passing to flutter_html.
  /// flutter_html internally decodes images at the native level BEFORE our TagExtension,
  /// so we must strip them from the source string to prevent Android decoder crashes.
  String _sanitizeHtmlContent(String html) {
    // Remove base64 images to prevent flutter_html native decode issues.
    // Regular images will be left intact and processed by the TagExtension.
    final base64ImgRegex = RegExp(r'<img\b[^>]+src="data:image[^"]*"[^>]*>', caseSensitive: false);
    const placeholder = '<p><em>[Hình ảnh không thể hiển thị]</em></p>';

    return html.replaceAll(base64ImgRegex, placeholder);
  }

  Widget _buildSafeImage({required String url, double? width, double? height, BoxFit? fit, required Widget errorWidget}) {
    // Use SafeImageDecoder to sanitize URL first
    final safeUrl = SafeImageDecoder.sanitizeImageUrl(url);
    if (safeUrl == null) {
      return errorWidget;
    }
    return CachedNetworkImage(
      imageUrl: safeUrl,
      width: width,
      height: height,
      fit: fit,
      errorWidget: (context, url, error) => errorWidget,
      placeholder: (context, url) => Container(
        width: width, height: height, color: Colors.grey.shade100,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Only use thumbnailImage if it's a valid http/https URL
    final String? safeThumbnail = SafeImageDecoder.sanitizeImageUrl(news.thumbnailImage);
    bool hasImage = safeThumbnail != null;
    final String resolvedThumbnail = safeThumbnail ?? '';

    String formattedDate = '';
    try {
      final dateToParse = news.publishedAt ?? news.createdAt;
      formattedDate = DateFormat('dd/MM/yyyy').format(DateTime.parse(dateToParse));
    } catch (e) {
      formattedDate = 'Vừa xong';
    }

    String displayCategory = news.type ?? 'Tin tức';
    if (displayCategory == 'SYSTEM') displayCategory = 'Hệ thống';
    else if (displayCategory == 'ACADEMIC') displayCategory = 'Học tập';
    else if (displayCategory == 'EVENT') displayCategory = 'Sự kiện';
    else if (displayCategory == 'FEATURED') displayCategory = 'Sự kiện nổi bật';
    else if (displayCategory == 'IMPORTANT') displayCategory = 'Quan trọng';

    return Scaffold(
      backgroundColor: AppColors.backgroundColor,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // 1. Sliver AppBar
          SliverAppBar(
            pinned: true,
            backgroundColor: Colors.white.withOpacity(0.95),
            elevation: 0,
            leading: GestureDetector(
              onTap: () => Get.back(),
              child: Container(
                margin: EdgeInsets.all(8.r),
                decoration: BoxDecoration(
                  color: AppColors.brandOrangeSecondary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  SolarIconsOutline.arrowLeft,
                  color: AppColors.brandOrangePrimary,
                  size: 24.sp,
                ),
              ),
            ),
            title: Text(
              "Chi tiết tin tức",
              style: GoogleFonts.plusJakartaSans(
                fontSize: 16.sp,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            centerTitle: true,
          ),

          // 2. Content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Banner with Title and Metadata overlaid on faded Thumbnail
                Stack(
                  children: [
                    Positioned.fill(
                      child: hasImage
                          ? Opacity(
                              opacity: 0.35,
                              child: _buildSafeImage(
                                url: resolvedThumbnail,
                                width: double.infinity,
                                height: double.infinity,
                                fit: BoxFit.cover,
                                errorWidget: const SizedBox.shrink(),
                              ),
                            )
                          : Opacity(
                              opacity: 0.15,
                              child: Image.asset(
                                'assets/images/logo.png',
                                width: double.infinity,
                                height: double.infinity,
                                fit: BoxFit.cover,
                              ),
                            ),
                    ),
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.backgroundColor.withOpacity(0.0),
                              AppColors.backgroundColor.withOpacity(0.8),
                              AppColors.backgroundColor,
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(20.w, 16.h, 20.w, 24.h),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: EdgeInsets.symmetric(horizontal: 12.w, vertical: 6.h),
                            decoration: BoxDecoration(
                              color: AppColors.brandOrangePrimary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20.r),
                            ),
                            child: Text(
                              displayCategory.toUpperCase(),
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10.sp,
                                fontWeight: FontWeight.w800,
                                color: AppColors.brandOrangePrimary,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          SizedBox(height: 20.h),
                          Text(
                            news.title,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 24.sp,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              height: 1.3,
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(height: 16.h),
                          Text(
                            'Người đăng: ${news.senderName}   $formattedDate',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13.sp,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Layout padding for the rest of the content
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 20.w),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Article HTML Content with custom image rendering
                  Html(
                    data: _sanitizeHtmlContent(news.content),
                    style: {
                      "body": Style(
                        fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
                        fontSize: FontSize(15.sp),
                        lineHeight: LineHeight(1.7),
                        color: AppColors.textPrimary,
                        margin: Margins.zero,
                        padding: HtmlPaddings.zero,
                      ),
                      "p": Style(
                        margin: Margins.only(bottom: 14.h),
                      ),
                      "h1": Style(fontSize: FontSize(22.sp), fontWeight: FontWeight.bold),
                      "h2": Style(fontSize: FontSize(20.sp), fontWeight: FontWeight.bold),
                      "h3": Style(fontSize: FontSize(18.sp), fontWeight: FontWeight.bold),
                      "strong": Style(fontWeight: FontWeight.w700),
                      "em": Style(fontStyle: FontStyle.italic),
                      "blockquote": Style(
                        margin: Margins.symmetric(vertical: 16.h, horizontal: 0),
                        padding: HtmlPaddings.only(left: 16.w),
                        border: Border(left: BorderSide(color: AppColors.brandOrangePrimary, width: 3.w)),
                        fontStyle: FontStyle.italic,
                        color: AppColors.brandOrangePrimary,
                        fontSize: FontSize(16.sp),
                        fontWeight: FontWeight.w600,
                      ),
                      "ul": Style(
                        margin: Margins.only(bottom: 14.h),
                        padding: HtmlPaddings.only(left: 16.w),
                      ),
                      "ol": Style(
                        margin: Margins.only(bottom: 14.h),
                        padding: HtmlPaddings.only(left: 16.w),
                      ),
                      "li": Style(
                        margin: Margins.only(bottom: 6.h),
                      ),
                      "img": Style(
                        width: Width(100, Unit.percent),
                        height: Height.auto(),
                        margin: Margins.symmetric(vertical: 12.h, horizontal: 0),
                        display: Display.block,
                      ),
                      "figure": Style(
                        margin: Margins.symmetric(vertical: 12.h, horizontal: 0),
                        padding: HtmlPaddings.zero,
                        width: Width(100, Unit.percent),
                      ),
                      "figcaption": Style(
                        textAlign: TextAlign.center,
                        fontStyle: FontStyle.italic,
                        color: AppColors.textSecondary,
                        fontSize: FontSize(12.sp),
                        margin: Margins.only(top: 8.h),
                      ),
                    },
                    extensions: [
                      TagExtension(
                        tagsToExtend: {"img"},
                        builder: (extensionContext) {
                          final src = extensionContext.attributes['src'] ?? '';
                          if (src.isEmpty) return const SizedBox.shrink();

                          final resolvedSrc = _resolveImageUrl(src);

                          // Handle base64 images
                          if (resolvedSrc.startsWith('data:image')) {
                            return _buildImagePlaceholder();
                          }

                          // Handle network images
                          return Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.h),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12.r),
                              child: _buildSafeImage(
                                url: resolvedSrc,
                                width: double.infinity,
                                fit: BoxFit.contain,
                                errorWidget: _buildImagePlaceholder(),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  
                  // Divider before related articles
                  SizedBox(height: 24.h),
                  Divider(color: Colors.grey.shade200, thickness: 1),
                  SizedBox(height: 24.h),

                  // Related Articles Section
                  _buildRelatedArticles(),

                  // Bottom spacing
                  SizedBox(height: 60.h),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Container(
      width: double.infinity,
      height: 150.h,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12.r),
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset('assets/images/logo.png', height: 40.h, fit: BoxFit.contain),
          SizedBox(height: 8.h),
          Text(
            'Không thể tải ảnh',
            style: GoogleFonts.plusJakartaSans(fontSize: 11.sp, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  /// Build the "Bài viết mới nhất" section with 3 cards from the NewsController
  Widget _buildRelatedArticles() {
    final NewsController newsController = Get.find<NewsController>();

    return Obx(() {
      // Get up to 3 articles that are not the current article
      final relatedList = newsController.newsList
          .where((n) => n.id != news.id)
          .take(3)
          .toList();

      if (relatedList.isEmpty) return const SizedBox.shrink();

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Bài viết liên quan',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 20.sp,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              SizedBox(width: 12.w),
              Expanded(
                child: Container(
                  height: 2.h,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(1.r),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 16.h),
          ...relatedList.map((relatedNews) => _buildRelatedCard(relatedNews)),
        ],
      );
    });
  }

  Widget _buildRelatedCard(NewsModel relatedNews) {
    bool hasImg = relatedNews.thumbnailImage != null && relatedNews.thumbnailImage!.isNotEmpty;
    final resolvedImg = hasImg ? _resolveImageUrl(relatedNews.thumbnailImage!) : '';

    String date = '';
    try {
      final d = relatedNews.publishedAt ?? relatedNews.createdAt;
      date = DateFormat('dd/MM/yyyy').format(DateTime.parse(d));
    } catch (e) {
      date = '';
    }

    return GestureDetector(
      onTap: () => Get.to(() => NewsDetailScreen(news: relatedNews), preventDuplicates: false),
      child: Container(
        margin: EdgeInsets.only(bottom: 20.h),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16.r),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image (Top)
            ClipRRect(
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16.r),
                topRight: Radius.circular(16.r),
              ),
              child: hasImg
                ? _buildSafeImage(
                    url: resolvedImg,
                    width: double.infinity,
                    height: 180.h,
                    fit: BoxFit.cover,
                    errorWidget: Container(
                      width: double.infinity,
                      height: 180.h,
                      color: Colors.grey.shade100,
                      alignment: Alignment.center,
                      child: Image.asset('assets/images/logo.png', height: 40.h, fit: BoxFit.contain),
                    ),
                  )
                : Container(
                    width: double.infinity,
                    height: 180.h,
                    color: Colors.grey.shade100,
                    alignment: Alignment.center,
                    child: Image.asset('assets/images/logo.png', height: 40.h, fit: BoxFit.contain),
                  ),
            ),
            // Content (Bottom)
            Padding(
              padding: EdgeInsets.fromLTRB(16.w, 16.h, 16.w, 20.h),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    relatedNews.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16.sp,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                  SizedBox(height: 10.h),
                  Text(
                    date,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 13.sp,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
