import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// Beautiful Wavy Background with Smooth Bezier Curves
class WavyBackground extends StatelessWidget {
  final Widget child;
  final List<Color>? gradientColors;

  const WavyBackground({
    super.key,
    required this.child,
    this.gradientColors,
  });

  @override
  Widget build(BuildContext context) {
    final colors = gradientColors ?? [
      AppColors.orange500,
      AppColors.orange400,
    ];

    return Stack(
      children: [
        // White Background
        Container(
          color: Colors.white,
        ),
        
        // Bottom Wave
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: ClipPath(
            clipper: WaveClipper(reverse: false),
            child: Container(
              height: 200,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    colors[1].withOpacity(0.4),
                    colors[0].withOpacity(0.8),
                  ],
                ),
              ),
            ),
          ),
        ),
        
        // Top Wave
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: ClipPath(
            clipper: WaveClipper(reverse: true),
            child: Container(
              height: 280, // Tăng chiều cao để phủ header
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: colors,
                ),
              ),
            ),
          ),
        ),
        
        // Content
        child,
      ],
    );
  }
}

/// Custom Wave Clipper with Smooth Bezier Curves
class WaveClipper extends CustomClipper<Path> {
  final bool reverse;

  WaveClipper({this.reverse = false});

  @override
  Path getClip(Size size) {
    final path = Path();

    if (reverse) {
      // Top wave - flows from top
      path.lineTo(0, size.height * 0.3);
      
      // First wave curve
      path.quadraticBezierTo(
        size.width * 0.25,
        size.height * 0.5,
        size.width * 0.5,
        size.height * 0.4,
      );
      
      // Second wave curve
      path.quadraticBezierTo(
        size.width * 0.75,
        size.height * 0.3,
        size.width,
        size.height * 0.5,
      );
      
      path.lineTo(size.width, 0);
      path.close();
    } else {
      // Bottom wave - flows from bottom
      path.moveTo(0, size.height);
      path.lineTo(0, size.height * 0.7);
      
      // First wave curve
      path.quadraticBezierTo(
        size.width * 0.25,
        size.height * 0.5,
        size.width * 0.5,
        size.height * 0.6,
      );
      
      // Second wave curve
      path.quadraticBezierTo(
        size.width * 0.75,
        size.height * 0.7,
        size.width,
        size.height * 0.5,
      );
      
      path.lineTo(size.width, size.height);
      path.close();
    }

    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
