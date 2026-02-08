import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

class ImageConverterUtils {
  /// Converts a [CameraImage] in YUV420 format to [img.Image] (RGB)
  static img.Image? convertYUV420ToImage(CameraImage cameraImage) {
    debugPrint('Image format: ${cameraImage.format.group}, planes: ${cameraImage.planes.length}');
    
    try {
      if (cameraImage.format.group == ImageFormatGroup.yuv420) {
        return _convertYUV420(cameraImage);
      } else if (cameraImage.format.group == ImageFormatGroup.bgra8888) {
        return _convertBGRA8888(cameraImage);
      } else if (cameraImage.format.group == ImageFormatGroup.nv21) {
        // NV21 is common on Android
        return _convertNV21(cameraImage);
      } else {
        // Fallback: try YUV420 conversion anyway
        debugPrint('Unknown format, attempting YUV420 conversion');
        return _convertYUV420(cameraImage);
      }
    } catch (e) {
      debugPrint('Image conversion exception: $e');
      return null;
    }
  }

  static img.Image _convertYUV420(CameraImage image) {
    final width = image.width;
    final height = image.height;
    
    final uvRowStride = image.planes[1].bytesPerRow;
    final uvPixelStride = image.planes[1].bytesPerPixel ?? 1;

    // img.Image from package:image uses format: Format.uint8
    final img.Image buffer = img.Image(width: width, height: height);

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final int uvIndex =
            uvPixelStride * (x / 2).floor() + uvRowStride * (y / 2).floor();
        final int index = y * width + x;

        final yp = image.planes[0].bytes[index];
        final up = image.planes[1].bytes[uvIndex];
        final vp = image.planes[2].bytes[uvIndex];

        // Convert YUV to RGB
        int r = (yp + vp * 1436 / 1024 - 179).round().clamp(0, 255);
        int g = (yp - up * 46549 / 131072 + 44 - vp * 93604 / 131072 + 91)
            .round()
            .clamp(0, 255);
        int b = (yp + up * 1814 / 1024 - 227).round().clamp(0, 255);

        // Set pixel (img.Image uses ABGR or ARGB depending on version, roughly)
        // Set pixel color
        buffer.setPixelRgb(x, y, r, g, b);
      }
    }
    return buffer;
  }

  static img.Image _convertBGRA8888(CameraImage image) {
    return img.Image.fromBytes(
      width: image.width,
      height: image.height,
      bytes: image.planes[0].bytes.buffer,
      order: img.ChannelOrder.bgra,
    );
  }

  /// NV21 format (common on Android) - handles both 1 and 2 plane formats
  static img.Image _convertNV21(CameraImage image) {
    final width = image.width;
    final height = image.height;
    final yPlane = image.planes[0].bytes;
    
    final img.Image buffer = img.Image(width: width, height: height);

    // NV21 single plane: Y data first, then interleaved VU data
    // Total size = width * height * 1.5 (Y: w*h, VU: w*h/2)
    final int uvOffset = width * height;

    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        final int yIndex = y * width + x;
        
        // UV data starts after all Y data
        // Each 2x2 block shares one V and one U value
        final int uvRow = y ~/ 2;
        final int uvCol = (x ~/ 2) * 2;
        final int uvIndex = uvOffset + uvRow * width + uvCol;
        
        final int yp = yPlane[yIndex];
        
        // NV21: V comes before U in the interleaved UV data
        int vp = 128;
        int up = 128;
        
        if (uvIndex < yPlane.length && uvIndex + 1 < yPlane.length) {
          vp = yPlane[uvIndex];
          up = yPlane[uvIndex + 1];
        }

        // Convert YUV to RGB
        int r = (yp + 1.370705 * (vp - 128)).round().clamp(0, 255);
        int g = (yp - 0.698001 * (vp - 128) - 0.337633 * (up - 128)).round().clamp(0, 255);
        int b = (yp + 1.732446 * (up - 128)).round().clamp(0, 255);

        buffer.setPixelRgb(x, y, r, g, b);
      }
    }
    return buffer;
  }
}
