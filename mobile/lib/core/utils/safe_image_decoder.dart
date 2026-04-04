import 'dart:convert';
import 'dart:typed_data';

import '../constants/api_constants.dart';

/// Utility for safely decoding base64 image strings.
/// Returns null if the input is invalid or cannot be decoded,
/// instead of throwing an exception that could crash the app.
class SafeImageDecoder {
  /// Decodes a base64 data URI string into bytes.
  /// Input format: "data:image/png;base64,<base64data>"
  /// Returns null if decoding fails for any reason.
  static Uint8List? decodeBase64Image(String dataUri) {
    try {
      if (!dataUri.startsWith('data:image')) return null;
      final commaIndex = dataUri.indexOf(',');
      if (commaIndex == -1) return null;
      final base64String = dataUri.substring(commaIndex + 1).trim();
      if (base64String.isEmpty) return null;
      // Normalize padding
      final padded = base64String.padRight(
        base64String.length + (4 - base64String.length % 4) % 4,
        '=',
      );
      return base64Decode(padded);
    } catch (_) {
      return null;
    }
  }

  /// Returns true if the given string is a valid loadable image URL (http/https).
  static bool isValidImageUrl(String? url) {
    if (url == null || url.isEmpty) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /// Sanitizes an image URL:
  ///  - Returns null for base64 data URIs (prevents native decode crash)
  ///  - Returns null for non-http URLs
  ///  - Returns the URL as-is for valid http/https URLs
  static String? sanitizeImageUrl(String? url) {
    if (url == null) return null;

    final raw = url.trim();
    if (raw.isEmpty) return null;

    // Never load base64/blob/file sources via network image widgets.
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('file:')) {
      return null;
    }

    String resolved = raw;
    if (raw.startsWith('/')) {
      resolved = '${ApiConstants.baseUrl}$raw';
    }

    final uri = Uri.tryParse(resolved);
    if (uri == null || !(uri.scheme == 'http' || uri.scheme == 'https')) {
      return null;
    }

    final lowerPath = uri.path.toLowerCase();
    final lowerAll = resolved.toLowerCase();

    // Block formats known to cause decoder failures on many Android devices.
    if (lowerAll.contains('.heic') ||
        lowerAll.contains('.heif') ||
        lowerAll.contains('format=heic') ||
        lowerAll.contains('format=heif') ||
        lowerAll.contains('image/heic') ||
        lowerAll.contains('image/heif')) {
      return null;
    }

    // If URL explicitly has an extension, allow only common image formats.
    final dotIndex = lowerPath.lastIndexOf('.');
    if (dotIndex != -1 && dotIndex > lowerPath.lastIndexOf('/')) {
      final ext = lowerPath.substring(dotIndex + 1);
      const allowedExt = {
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'bmp',
        'svg',
      };
      if (!allowedExt.contains(ext)) {
        return null;
      }
    }

    return resolved;
  }
}
