import 'package:flutter/material.dart';

import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';

/// Full-screen image preview with pinch-to-zoom
class ImagePreviewScreen extends StatelessWidget {
  final String imageUrl;
  final String senderName;

  const ImagePreviewScreen({
    super.key,
    required this.imageUrl,
    required this.senderName,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          senderName,
          style: TextStyle(fontSize: 16, color: Colors.white),
        ),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: CachedNetworkImage(
            imageUrl: imageUrl,
            fit: BoxFit.contain,
            placeholder: (_, __) => const Center(
              child: CircularProgressIndicator(color: AppColors.primaryOrange),
            ),
            errorWidget: (_, __, ___) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.broken_image, color: Colors.grey, size: 64),
                const SizedBox(height: 12),
                Text(
                  'Không thể tải hình ảnh',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
