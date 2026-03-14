package com.fams.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * ContentFilterService (Bộ lọc nội dung)
 * Chống nói những từ tục tiểu, toxic cho chat message
 */
@Service
@Slf4j
public class ContentFilterService {

    private final Set<String> blacklist = new HashSet<>(Arrays.asList(
            "ngu", "ngốc", "ngu ngốc", "đần", "đần độn", "khùng", "khùng điên", "điên", "điên khùng",
            "dở hơi", "thiểu năng", "vô dụng", "kém cỏi", "kém thông minh", "đồ tệ", "đồ tồi",
            "đồ ngốc", "đồ ngu", "đồ điên", "đồ khùng", "đồ dở", "đồ rác", "rác rưởi", "đồ vô dụng",
            "tồi tệ", "kém", "ngu dốt", "dốt", "dốt nát", "đầu đất", "não cá vàng",
            "óc chó", "đồ kém", "kém hiểu biết", "thiếu hiểu biết",

            // toxic chat
            "im đi", "câm đi", "biến đi", "cút đi", "đi chỗ khác", "tránh ra", "đừng nói nữa",
            "nói nhảm", "nhảm nhí", "vớ vẩn", "tào lao", "xàm", "xàm xí", "vô nghĩa",

            // toxic slang
            "trash", "noob", "loser", "stupid", "idiot", "dumb", "moron", "nonsense",
            "pathetic", "worthless", "useless", "garbage", "trash talk",

            // viết tắt toxic phổ biến
            "dm", "dmm", "dcm", "vl", "vcl", "vkl", "cc", "cl", "vlz",

            // toxic nhẹ
            "ngớ ngẩn", "ngu si", "đần thối", "đần thật", "khó chịu", "phiền phức",
            "phiền toái", "làm phiền", "gây khó chịu", "vô lý", "tệ hại", "không ra gì",

            // spam toxic
            "nói linh tinh", "nói bậy", "nói nhảm", "chém gió", "tào lao bí đao",
            "xàm xàm", "xàm lông", "xàm ghê",

            // xúc phạm nhẹ
            "đồ dở người", "đồ dở hơi", "đồ ngớ ngẩn", "đồ kém cỏi", "đồ thất bại",
            "đồ vô tích sự", "đồ phiền phức", "đồ vô nghĩa", "đồ rác rưởi",

            // toxic internet slang
            "gà", "gà mờ", "kém quá", "yếu quá", "tệ quá", "chán thật", "thảm hại",
            "tệ ghê", "kém ghê", "ngu thật"
    ));

    private final Pattern obfuscationPattern = Pattern.compile("[.\\-*_ ]");

    /**
     * Validate content against blacklist and other filters
     * @param content The text to check
     * @return true if safe, false if toxic
     */
    public boolean isSafe(String content) {
        if (content == null || content.trim().isEmpty()) {
            return true;
        }

        String normalized = normalize(content);

        // 1. Exact Blacklist Check (on words)
        String[] words = normalized.split("\\s+");
        for (String word : words) {
            if (blacklist.contains(word)) {
                log.warn("Toxic word detected (Exact): {}", word);
                return false;
            }
        }

        // 2. Full Sentence Blacklist Check (for phrases like "im đi")
        for (String toxicPhrase : blacklist) {
            if (normalized.contains(toxicPhrase)) {
                log.warn("Toxic phrase detected: {}", toxicPhrase);
                return false;
            }
        }

        // 3. Obfuscation check (e.g. "n.g.u")
        String stripped = obfuscationPattern.matcher(normalized).replaceAll("");
        for (String toxicWord : blacklist) {
            if (toxicWord.length() > 2 && stripped.contains(toxicWord.replace(" ", ""))) {
                log.warn("Toxic word detected (Obfuscated): {}", toxicWord);
                return false;
            }
        }

        // 4. Fuzzy Match (Levenshtein) - Optional/Light
        // Only for short toxic words where typos are common
        for (String toxicWord : blacklist) {
            if (toxicWord.length() > 3) {
                for (String word : words) {
                    if (word.length() >= toxicWord.length() - 1 && word.length() <= toxicWord.length() + 1) {
                        if (calculateLevenshteinDistance(word, toxicWord) <= 1) {
                            log.warn("Toxic word detected (Fuzzy): {} matches {}", word, toxicWord);
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    public void validate(String content) {
        if (!isSafe(content)) {
            throw new IllegalArgumentException("Tin nhắn chứa nội dung không phù hợp (Toxic content detected)");
        }
    }

    private String normalize(String text) {
        if (text == null) return "";
        // Unaccent
        String nfdNormalizedString = Normalizer.normalize(text, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String unaccented = pattern.matcher(nfdNormalizedString).replaceAll("")
                .replace('đ', 'd').replace('Đ', 'D');
        
        return unaccented.toLowerCase().trim();
    }

    private int calculateLevenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];

        for (int i = 0; i <= s1.length(); i++) {
            for (int j = 0; j <= s2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    dp[i][j] = Math.min(Math.min(
                                    dp[i - 1][j - 1] + (s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1),
                                    dp[i - 1][j] + 1),
                            dp[i][j - 1] + 1);
                }
            }
        }
        return dp[s1.length()][s2.length()];
    }
}
