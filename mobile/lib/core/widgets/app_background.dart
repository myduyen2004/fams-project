import 'package:flutter/material.dart';

class AppBackground extends StatelessWidget {
  final Widget child;

  const AppBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFFFE0B2), // Orange 100 - Warmer orange tone
            Color(0xFFF7EDE4), // Cream Base
          ],
          stops: [0.0, 0.4],
        ),
      ),
      child: child,
    );
  }
}
