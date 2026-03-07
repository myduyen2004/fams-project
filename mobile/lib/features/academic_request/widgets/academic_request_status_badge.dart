import 'package:flutter/material.dart';

/// Status badge widget for academic requests (Student)
class AcademicRequestStatusBadge extends StatelessWidget {
  final String status;
  final String label;

  const AcademicRequestStatusBadge({
    super.key,
    required this.status,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    final config = _getConfig();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: config.bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 12, color: config.fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: config.fg,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  _BadgeConfig _getConfig() {
    switch (status) {
      case 'PENDING':
        return _BadgeConfig(
          bg: Colors.amber[100]!,
          fg: Colors.amber[800]!,
          icon: Icons.hourglass_top_rounded,
        );
      case 'APPROVED':
        return _BadgeConfig(
          bg: Colors.green[100]!,
          fg: Colors.green[800]!,
          icon: Icons.check_circle_outline_rounded,
        );
      case 'REJECTED':
        return _BadgeConfig(
          bg: Colors.red[100]!,
          fg: Colors.red[800]!,
          icon: Icons.cancel_outlined,
        );
      case 'CANCELLED':
        return _BadgeConfig(
          bg: Colors.grey[200]!,
          fg: Colors.grey[700]!,
          icon: Icons.remove_circle_outline_rounded,
        );
      default:
        return _BadgeConfig(
          bg: Colors.grey[200]!,
          fg: Colors.grey[700]!,
          icon: Icons.help_outline_rounded,
        );
    }
  }
}

class _BadgeConfig {
  final Color bg;
  final Color fg;
  final IconData icon;
  _BadgeConfig({required this.bg, required this.fg, required this.icon});
}
