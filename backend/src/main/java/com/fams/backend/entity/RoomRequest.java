package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "room_requests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User requester;

    @Column(nullable = false)
    private String room; // e.g., "P201"

    @Column(nullable = false)
    private String slot; // e.g., "Slot 2"

    @CreationTimestamp
    private LocalDateTime createdAt;
}
