package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lecturer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LecturerProfile {

    @Id
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String expertise;

    @Column(columnDefinition = "TEXT")
    private String bio;
}
