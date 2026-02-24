# ========================================
# Video Replay Detection Service
# ========================================
# Detects if a face image is captured from a screen/monitor
# by analyzing:
# - Moiré patterns (interference patterns from screen pixels)
# - Pixel grid artifacts
# - Unnatural light distribution
# - Screen refresh artifacts

import numpy as np
from typing import Dict, Any, Tuple, Optional
import logging
import cv2
from PIL import Image
from io import BytesIO
import base64
import sys

logger = logging.getLogger(__name__)


class ReplayDetectionService:
    """
    Service for detecting video replay attacks.
    Analyzes images for signs of being captured from a screen/monitor.
    """
    
    # Detection thresholds (Balanced for security/usability)
    # Detection thresholds (Balanced for security/usability)
    # TWEAKED: Much more lenient to avoid false positives on real faces
    MOIRE_THRESHOLD = 0.90  # Increased from 0.70 (very conservative)
    LIGHT_VARIANCE_MIN = 3.0 # Relaxed from 5.0
    SCREEN_SCORE_THRESHOLD = 0.98 # Closer to 1.0 (Almost disabled)
    # Relaxed from 0.35 to reduce FP on real faces with skin texture
    
    def __init__(self):
        """Initialize the replay detection service."""
        logger.info("ReplayDetectionService initialized")
    
    def decode_base64_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Decode a base64-encoded image to numpy array (BGR for OpenCV)."""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_bytes = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to decode image: {e}")
            return None

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess the image before analysis:
        - Apply Gaussian Blur to triệt tiêu nhiễu ISO (fixes G=1.0 on real faces)
        """
        if image is None: return None
        # [STABILIZATION]: 3x3 Gaussian Blur to filter ISO noise/skin texture
        # This preserves screen patterns but kills single-pixel electronic noise.
        return cv2.GaussianBlur(image, (3, 3), 0)

    def detect_moire_pattern(self, image: np.ndarray) -> Tuple[bool, float, float]:
        """
        Detect Moiré patterns using FFT analysis.
        Moiré patterns appear as periodic interference patterns when
        a screen's pixel grid interacts with the camera sensor.
        
        Returns:
            Tuple of (is_moire_detected, score, laplacian_variance)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # [ANTI-PARANOID]: Adaptive Blur to filter ISO noise
            # Camera noise (ISO) can mimic pixel grids. Light blur preserves patterns but kills noise.
            gray_blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            # Apply FFT
            f_transform = np.fft.fft2(gray_blurred)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = 20 * np.log(np.abs(f_shift) + 1)
            
            # Normalize
            magnitude_spectrum = (magnitude_spectrum - magnitude_spectrum.min()) / \
                                (magnitude_spectrum.max() - magnitude_spectrum.min() + 1e-8)
            
            # Look for periodic peaks (Moiré signature)
            # Moiré patterns typically create 4+ symmetric peaks
            h, w = magnitude_spectrum.shape
            center_y, center_x = h // 2, w // 2
            
            # Exclude center (DC component) and analyze mid-high frequencies
            # FIX: Ensure standard memory layout (C-contiguous) for OpenCV functions
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(mask, (center_x, center_y), min(h, w) // 16, 0, -1)  
            cv2.circle(mask, (center_x, center_y), min(h, w) // 2, 255, -1)  
            cv2.circle(mask, (center_x, center_y), min(h, w) // 16, 0, -1)  
            
            masked_spectrum = magnitude_spectrum * (mask / 255.0)
            
            # [ADDITION]: Spectral Sharpness (Laplacian Variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            lap_score = min(laplacian_var / 500.0, 1.0)
            
            # [STABILIZATION]: Gaussian Blur to filter ISO noise/skin texture
            gray = cv2.GaussianBlur(gray, (3, 3), 0)
            
            # Find peaks
            peak_threshold = 0.5 # Lowered to compensate for blur
            peaks = masked_spectrum > peak_threshold
            peak_count = np.sum(peaks)
            
            # Return moire_detected + lap_score for fusion
            moire_detected = peak_count >= 4
            return moire_detected, float(lap_score), float(laplacian_var)
            
            # Moiré patterns typically create 4+ symmetric peaks
            # Normalize by image size
            peak_density = peak_count / (h * w)
            
            # Score: higher peak density in mid-freq = more likely Moiré
            moire_score = min(peak_density * 1000, 1.0)
            is_moire = moire_score > self.MOIRE_THRESHOLD
            
            logger.debug(f"Moiré detection: score={moire_score:.4f}, detected={is_moire}")
            
            return is_moire, moire_score
            
        except Exception as e:
            logger.error(f"Moiré detection failed: {e}")
            # Return 3 values as per signature. 100.0 variance is safe default.
            return False, 0.0, 100.0
    
    def detect_pixel_grid(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Detect screen pixel grid patterns.
        Screens have regular pixel arrangements that can be detected
        through edge analysis at high zoom levels.
        
        Returns:
            Tuple of (is_grid_detected, score)
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Sobel filters to detect edges
            # [STABILIZATION]: Gaussian Blur to filter ISO noise/skin texture
            gray = cv2.GaussianBlur(gray, (3, 3), 0)
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            
            # Calculate gradient magnitude
            gradient_mag = np.sqrt(sobelx**2 + sobely**2)
            
            # Analyze periodicity using autocorrelation
            # [RE-TUNING]: Higher threshold (0.88) and limited size to avoid skin noise
            autocorr = cv2.matchTemplate(
                gray.astype(np.float32), 
                gray[20:50, 20:50].astype(np.float32), 
                cv2.TM_CCOEFF_NORMED
            )
            
            # Find secondary peaks 
            threshold = 0.88
            peaks = autocorr > threshold
            peak_count = np.sum(peaks)
            
            # More peaks = more regular pattern = more likely screen
            # [RE-TUNING]: Increased divisor to 25,000 to avoid FP on high-res skin texture
            grid_score = min(peak_count / 25000.0, 1.0)
            is_grid = grid_score > 0.60 # Raised bar for Veto
            
            logger.debug(f"Pixel grid detection: score={grid_score:.4f}, detected={is_grid}")
            
            return is_grid, grid_score
            
        except Exception as e:
            logger.error(f"Pixel grid detection failed: {e}")
            return False, 0.0
    
    def analyze_light_distribution(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Analyze light distribution for screen-like flat lighting.
        Real faces have natural 3D lighting with shadows and highlights.
        Screens produce flat, uniform lighting.
        
        Returns:
            Tuple of (is_flat_lighting, score)
        """
        try:
            # Convert to LAB color space for better luminance analysis
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel = lab[:, :, 0]
            
            # Calculate local variance using sliding window
            kernel_size = 15
            local_mean = cv2.blur(l_channel.astype(np.float32), (kernel_size, kernel_size))
            local_sq_mean = cv2.blur((l_channel.astype(np.float32))**2, (kernel_size, kernel_size))
            local_variance = local_sq_mean - local_mean**2
            
            # Average local variance
            avg_variance = np.mean(local_variance)
            
            # Also check global histogram distribution
            hist = cv2.calcHist([l_channel], [0], None, [256], [0, 256])
            hist = hist.flatten() / hist.sum()
            
            # Calculate histogram entropy (flat lighting = lower entropy)
            entropy = -np.sum(hist * np.log2(hist + 1e-10))
            
            # Combine metrics
            # Low variance + low entropy = flat screen lighting
            # [MITIGATION]: Lower divisor (50.0) to make it harder to be called "flat"
            variance_score = 1.0 - min(avg_variance / 50.0, 1.0)
            entropy_score = 1.0 - min(entropy / 6.0, 1.0)  
            
            flat_score = (variance_score + entropy_score) / 2
            is_flat = avg_variance < self.LIGHT_VARIANCE_MIN
            
            logger.debug(f"Light analysis: variance={avg_variance:.2f}, entropy={entropy:.2f}, flat_score={flat_score:.4f}")
            
            return is_flat, flat_score
            
        except Exception as e:
            logger.error(f"Light analysis failed: {e}")
            return False, 0.0
    
    def detect_eye_reflection(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Analyze eye reflections for screen artifacts.
        Screen reflections in eyes often show rectangular patterns
        unlike natural light sources.
        
        Returns:
            Tuple of (is_screen_reflection, score)
        """
        try:
            # This is a simplified version
            # Full implementation would use eye detection + reflection analysis
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect very bright spots (catchlights)
            _, bright_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
            
            # Find contours of bright spots
            contours, _ = cv2.findContours(bright_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            rectangular_score = 0.0
            for contour in contours:
                if cv2.contourArea(contour) < 10:
                    continue
                    
                # Check if contour is rectangular (screen reflection)
                rect = cv2.minAreaRect(contour)
                box = cv2.boxPoints(rect)
                box = np.int0(box)
                
                rect_area = rect[1][0] * rect[1][1]
                contour_area = cv2.contourArea(contour)
                
                if rect_area > 0:
                    rectangularity = contour_area / rect_area
                    if rectangularity > 0.8:  # Very rectangular
                        rectangular_score += 0.2
            
            rectangular_score = min(rectangular_score, 1.0)
            is_screen_reflection = rectangular_score > 0.4
            
            logger.debug(f"Eye reflection: rectangular_score={rectangular_score:.4f}")
            
            return is_screen_reflection, rectangular_score
            
        except Exception as e:
            logger.error(f"Eye reflection analysis failed: {e}")
            return False, 0.0

    def detect_screen_artifacts(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Detect subpixel RGB artifacts and screen noise.
        Screens emit light in RGB subpixels, creating high-frequency 
        color noise not present in natural reflections.
        
        Returns:
            Tuple of (is_screen_artifact, score)
        """
        try:
            # Split channels
            b, g, r = cv2.split(image)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # 1. Analyze high-freq color noise (Subpixel RGB)
            # Screens often have misalignment or specific patterns between R/B
            diff_rb = cv2.absdiff(r, b)
            
            # High-pass filter to isolate noise
            kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]])
            high_freq_noise = cv2.filter2D(diff_rb, -1, kernel)
            
            # Calculate noise density
            noise_score = np.mean(high_freq_noise) / 255.0
            
            # Normalize score (real faces < 0.02, screens > 0.05)
            # [MITIGATION]: Lower multiplier (10.0) to avoid over-reporting on skin pores
            artifact_score = min(noise_score * 10.0, 1.0)
            
            # 2. Check for Horizontal/Vertical banding (PWM/Refresh rate)
            # Collapse to 1D projections
            proj_x = np.mean(gray, axis=0)
            proj_y = np.mean(gray, axis=1)
            
            # Calculate variance of projections (banding = high variance)
            var_x = np.var(proj_x)
            var_y = np.var(proj_y)
            
            banding_score = min((var_x + var_y) / 1000.0, 1.0)
            
            # Combined score
            final_score = (artifact_score * 0.7) + (banding_score * 0.3)
            is_artifact = final_score > 0.3
            
            logger.debug(f"Screen artifacts: noise={noise_score:.4f}, banding={banding_score:.4f}, total={final_score:.4f}")
            
            return is_artifact, final_score
        except Exception as e:
            logger.error(f"Screen artifact detection failed: {e}")
            return False, 0.0

    def analyze_chromatic_aberration(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        [LEVEL 5] Detect chromatic aberration (rainbow fringing).
        Digital screens have R-G-B subpixels. Edges of objects on a screen
        often show sub-pixel color misalignment that human skin lacks.
        """
        try:
            b, g, r = cv2.split(image.astype(np.float32))
            
            # Calculate gradients for each channel
            grad_r_x = cv2.Sobel(r, cv2.CV_32F, 1, 0, ksize=3)
            grad_r_y = cv2.Sobel(r, cv2.CV_32F, 0, 1, ksize=3)
            grad_b_x = cv2.Sobel(b, cv2.CV_32F, 1, 0, ksize=3)
            grad_b_y = cv2.Sobel(b, cv2.CV_32F, 0, 1, ksize=3)
            
            # Calculate gradient magnitudes
            mag_r = np.sqrt(grad_r_x**2 + grad_r_y**2)
            mag_b = np.sqrt(grad_b_x**2 + grad_b_y**2)
            
            # Look for displacement between R and B channel edges (fringing)
            # On a screen, the R and B subpixels are physically separated.
            # We measure the Correlation Coefficient between channel gradients.
            # Real skin has high correlation; screens have lower correlation due to subpixels.
            mask = mag_r > np.percentile(mag_r, 95) # Focus on sharp edges
            if np.sum(mask) < 100: return False, 0.0
            
            corr = np.corrcoef(mag_r[mask], mag_b[mask])[0, 1]
            
            # Lower correlation = more chromatic aberration = more likely a screen
            score = 1.0 - max(0.0, corr)
            is_aberrant = score > 0.30 # Increased from 0.15
            
            logger.debug(f"Chromatic Aberration: score={score:.4f}, corr={corr:.4f}")
            return is_aberrant, score
        except Exception as e:
            logger.error(f"Chromatic aberration check failed: {e}")
            return False, 0.0

    def analyze_specular_reflectance(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        [LEVEL 5] Detect glass-like specular highlights.
        Phone screens are glass; they reflect light with a "hard" profile.
        Real skin reflections are "soft" (Lambertian + wide specular).
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect highlights (intensity > 235)
            _, mask = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY)
            
            # Analyze high-intensity pixel distribution
            high_intensity_pixels = gray[mask > 0]
            if len(high_intensity_pixels) < 50: return False, 0.0
            
            # Calculate "Steepness" of highlights (Hardness)
            # Screen highlights often have sharp transitions to saturated white
            kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]])
            laplacian = cv2.filter2D(gray.astype(np.float32), -1, kernel)
            edge_sharpness = np.mean(np.abs(laplacian[mask > 0]))
            
            # [FORCE CAP]: Ensure it never exceeds 1.0 to avoid false veto
            # [RE-TUNING]: Raised divisor (180 -> 350) to allow more skin gloss (sweat)
            highlight_area = np.sum(mask > 0)
            
            # [SMART AREA FACTOR]:
            # Very small (<100px) = Likely sweat spots (Ignore penalty)
            # Mid-sized (300-1500px) = Likely screen glass reflection (Apply penalty)
            # Very large (>3000px) = Likely large face highlight (Ignore penalty)
            if highlight_area < 100 or highlight_area > 3000:
                area_factor = 0.6  # Low penalty/Confidence
            else:
                area_factor = np.clip(1.3 - (highlight_area / 2000.0), 0.7, 1.3)
                
            score = min(min(edge_sharpness / 350.0, 1.0) * area_factor, 1.0)
            is_glassy = score > 0.85 # High reliability bar
            
            logger.debug(f"Specular analysis: score={score:.4f}, area={highlight_area}, area_factor={area_factor:.2f}")
            return is_glassy, score
        except Exception as e:
            logger.error(f"Specular analysis failed: {e}")
            return False, 0.0

    def check_oled_perfect_blacks(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        [LEVEL 5] Detect perfect black levels (OLED Signature).
        OLED screens have "Absolute Zero" black pixels in shadow regions.
        Ambient light on real skin almost always fills shadows to at least level 1-5.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            # Count pixels that are EXACTLY zero (or 1)
            zeros = np.sum(gray <= 1)
            total = gray.size
            ratio = zeros / total
            
            # High ratio of perfect black in a captured face is suspicious
            score = min(ratio * 100.0, 1.0)
            is_oled = score > 0.25 # Over 0.25% absolute black is rare for real skin
            
            logger.debug(f"OLED Black check: ratio={ratio:.4%}, score={score:.4f}")
            return is_oled, score
        except:
            return False, 0.0

    def detect_lcd_texture(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        [LEVEL 6] Detect LCD "Screen Door" texture.
        Matte screens have a very specific high-frequency grain due to the LCD panel layers.
        Uses homogeneity analysis to distinguish uniform digital grain from random skin noise.
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            # High-pass filter to isolate panel grain
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            high_freq = cv2.filter2D(gray.astype(np.float32), -1, kernel)
            
            # Divide into small tiles and calculate local variances
            h, w = high_freq.shape
            tile_h, tile_w = h // 8, w // 8
            local_vars = []
            for i in range(8):
                for j in range(8):
                    tile = high_freq[i*tile_h:(i+1)*tile_h, j*tile_w:(j+1)*tile_w]
                    local_vars.append(np.var(tile))
            
            avg_var = np.mean(local_vars)
            
            # LCD Texture is UNIFORM (low coefficient of variation)
            # [RE-TUNING]: Conservative uniformity requirements.
            # Real skin/pores have high CV (> 0.8). Matte screens have low CV (< 0.5).
            cv_var = np.std(local_vars) / (avg_var + 1e-6)
            
            if cv_var < 0.4:
                uniformity_boost = 1.4 # Definitive Screen
            elif cv_var < 0.6:
                uniformity_boost = 1.0 # Probable Screen
            elif cv_var < 0.8:
                uniformity_boost = 0.5 # Ambiguous / Skin with pores
            else:
                uniformity_boost = 0.2 # Likely Real Skin / Noise
            
            # [RE-TUNING]: Increased divisor (100 -> 300) to make it harder to trigger by accident
            score = min(min(avg_var / 300.0, 1.0) * uniformity_boost, 1.0)
            is_lcd = score > 0.85 # Raised bar for solo sensor confidence
            
            logger.info(f"LCD_TUNING: avg_var={avg_var:.2f}, cv={cv_var:.4f}, score={score:.4f} boost={uniformity_boost}")
            
            logger.debug(f"LCD Texture check: score={score:.4f}, avg_var={avg_var:.2f}, cv={cv_var:.4f}")
            return is_lcd, score
        except:
            return False, 0.0

    def detect_bezel_edges(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        [LEVEL 6] Detect straight lines at periphery (Screen Bezels).
        The 2.7x crop often contains the frame of the laptop.
        """
        try:
            h, w = image.shape[:2]
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Focus on the periphery (outer 15% of the image)
            mask = np.zeros_like(edges)
            margin_h = int(h * 0.15)
            margin_w = int(w * 0.15)
            mask[0:margin_h, :] = 255
            mask[h-margin_h:h, :] = 255
            mask[:, 0:margin_w] = 255
            mask[:, w-margin_w:w] = 255
            
            peripheral_edges = cv2.bitwise_and(edges, mask)
            
            # Detect lines
            lines = cv2.HoughLinesP(peripheral_edges, 1, np.pi/180, threshold=40, 
                                    minLineLength=int(w * 0.15), maxLineGap=10)
            
            if lines is not None and len(lines) > 0:
                # [SMART BEZEL]: Filter for Axis-Aligned lines and track sides
                axis_aligned_count = 0
                sides_found = set()
                
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    dx = abs(x2 - x1)
                    dy = abs(y2 - y1)
                    # Vertical or Horizontal within 3 degrees
                    angle = np.degrees(np.arctan2(dy, dx))
                    if angle < 3 or angle > 87:
                        axis_aligned_count += 1
                        # Identify which side this line belongs to
                        if y1 < margin_h or y2 < margin_h: sides_found.add("top")
                        if y1 > h - margin_h or y2 > h - margin_h: sides_found.add("bottom")
                        if x1 < margin_w or x2 < margin_w: sides_found.add("left")
                        if x1 > w - margin_w or x2 > w - margin_w: sides_found.add("right")
                
                # A real screen frame must appear on at least 3 sides (Top/Bottom/Left/Right).
                # Background clutter (door frames) usually only appears on 1 or 2 sides.
                multi_side_factor = 1.0 if len(sides_found) >= 3 else (0.25 if len(sides_found) > 0 else 0.0)
                
                # [MITIGATION]: Increase divisor to 50 for high-res stability
                score = min(axis_aligned_count / 50.0, 1.0) * multi_side_factor
                is_bezel = score > 0.6
                
                logger.debug(f"Bezel detection: axis_aligned={axis_aligned_count}, sides={len(sides_found)}, score={score:.4f}")
                return is_bezel, score
                
            return False, 0.0
        except:
            return False, 0.0

    def detect(self, image_base64: str) -> Dict[str, Any]:
        """
        Perform comprehensive replay detection.
        
        Args:
            image_base64: Base64-encoded image
            
        Returns:
            Dict with detection results and scores
        """
        # 1. Decode
        raw_image = self.decode_base64_image(image_base64)
        if raw_image is None:
            return {
                "is_replay": True,
                "score": 0.0,
                "message": "Dữ liệu ảnh không hợp lệ",
                "details": {}
            }
        
        # 2. [NEW]: Preprocess to filter noise (Fix G=1.0)
        image = self._preprocess(raw_image)
        
        # Run all detection methods
        moire_results = self.detect_moire_pattern(image)
        moire_detected = moire_results[0]
        moire_score = moire_results[1]
        laplacian_var = moire_results[2] if len(moire_results) > 2 else 100.0
        grid_detected, grid_score = self.detect_pixel_grid(image)
        flat_light, light_score = self.analyze_light_distribution(image)
        screen_reflection, reflection_score = self.detect_eye_reflection(image)
        artifacts_detected, artifacts_score = self.detect_screen_artifacts(image)
        
        # [LEVEL 5 & 6 ENTRIES]
        chromatic_detected, chromatic_score = self.analyze_chromatic_aberration(image)
        glassy_detected, glassy_score = self.analyze_specular_reflectance(image)
        oled_detected, oled_score = self.check_oled_perfect_blacks(image)
        lcd_detected, lcd_score = self.detect_lcd_texture(image)
        bezel_detected, bezel_score = self.detect_bezel_edges(image)
        
        # [PHYSICAL PRIORITY]: High-weight on Grid and Moire
        weights = {
            'moire': 0.40,
            'grid': 0.40,
            'light': 0.02,
            'reflection': 0.02,
            'chromatic': 0.04,
            'specular': 0.04,
            'oled': 0.02,
            'lcd': 0.03,
            'bezel': 0.03
        }
        
        weighted_sum = (
            moire_score * weights['moire'] +
            grid_score * weights['grid'] +
            light_score * weights['light'] +
            reflection_score * weights['reflection'] +
            chromatic_score * weights['chromatic'] +
            glassy_score * weights['specular'] +
            oled_score * weights['oled'] +
            lcd_score * weights['lcd'] +
            bezel_score * weights['bezel']
        )
        
        # [FUSION]: Favor the strongest physical sensor to avoid weighted dilution
        # If any major physical sensor sees a screen, the score should stay high.
        overall_score = max(weighted_sum, moire_score * 0.8, grid_score * 0.8, lcd_score * 0.8)
        
        # [LEVEL 6 BALANCE]: Only flag DEFINITIVE screen artifacts
        # Single-sensor thresholds raised to avoid camera noise false positives
        is_definitive = (
            chromatic_score > 0.60 or   # Keep at 0.60
            moire_score > 0.95 or       # Raised from 0.92
            grid_score > 0.90 or        # Raised from 0.85
            lcd_score > 0.92 or         # Raised from 0.90
            bezel_score > 0.90          # Raised from 0.85
        )
        
        # [MULTI-SIGNAL VETO]: Raised from 0.15 to 0.30
        # Camera sensor noise typically produces G<0.1, M<0.2, L<0.3
        # Only flag when multiple sensors show STRONG evidence
        if not is_definitive:
            signs = 0
            if grid_score > 0.45: signs += 1 # Relaxed from 0.30
            if moire_score > 0.45: signs += 1 # Relaxed from 0.30
            if lcd_score > 0.65: signs += 1  # Relaxed from 0.50
            if bezel_score > 0.55: signs += 1 # Relaxed from 0.30
            if signs >= 2:
                is_definitive = True
                logger.warning(f"MULTI-SIGNAL-VETO: grid={grid_score:.2f}, moire={moire_score:.2f}, lcd={lcd_score:.2f}")
        
        is_replay = overall_score > self.SCREEN_SCORE_THRESHOLD or is_definitive
        
        # [ROUND 2]: Soft-Video Heuristic (Relaxed)
        if laplacian_var < 80 and (bezel_score > 0.50 or grid_score > 0.70):
            is_replay = True
            is_definitive = True
            logger.info(f"SOFT-VIDEO-VETO: lap={laplacian_var:.1f}, bezel={bezel_score:.2f}, grid={grid_score:.2f}")
        
        # [FORCE SCORE]: If definitive, ensure the score is high enough for Veto
        if is_definitive:
            overall_score = max(overall_score, 0.90)
            
        # [DEBUG PRINTING] - Force to stdout for docker logs visibility
        print(f"DEBUG_BREAKDOWN: Score={overall_score:.4f} Def={is_definitive} M={moire_score:.4f} G={grid_score:.4f} C={chromatic_score:.4f} S={glassy_score:.4f} O={oled_score:.4f} L={lcd_score:.4f} B={bezel_score:.4f} F={light_score:.4f}")
        sys.stdout.flush()
        
        if is_replay:
            message = f"Phát hiện màn hình điện tử (Physical Artifacts {overall_score:.0%})"
        else:
            message = f"Ảnh hợp lệ (Physical Score: {overall_score:.0%})"
        
        logger.info(f"Replay detection result: is_replay={is_replay}, score={overall_score:.4f}")
        
        return {
            "is_replay": bool(is_replay),
            "score": float(overall_score),
            "message": message,
            "details": {
                "laplacian": float(laplacian_var),
                "moire": {"score": float(moire_score), "detected": bool(moire_detected)},
                "pixel_grid": {"score": float(grid_score)},
                "flat_lighting": {"detected": bool(flat_light), "score": float(light_score)},
                "screen_reflection": {"detected": bool(screen_reflection), "score": float(reflection_score)},
                "screen_artifacts": {"detected": bool(artifacts_detected), "score": float(artifacts_score)},
                "chromatic_aberration": {"detected": bool(chromatic_detected), "score": float(chromatic_score)},
                "glassy_specular": {"detected": bool(glassy_detected), "score": float(glassy_score)},
                "oled_blacks": {"detected": bool(oled_detected), "score": float(oled_score)},
                "lcd_texture": {"detected": bool(lcd_detected), "score": float(lcd_score)},
                "bezel_edges": {"detected": bool(bezel_detected), "score": float(bezel_score)}
            }
        }


# Singleton instance
_replay_detection_service: Optional[ReplayDetectionService] = None


def get_replay_detection_service() -> ReplayDetectionService:
    """Get the singleton ReplayDetectionService instance."""
    global _replay_detection_service
    if _replay_detection_service is None:
        _replay_detection_service = ReplayDetectionService()
    return _replay_detection_service
