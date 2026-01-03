package com.fams.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfile {

    @Id
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 50)
    private String studentClass;

    @Column(length = 20)
    private String course;

    private Double avgMark;

    private Double gpa;

    @Column(length = 100)
    private String major;
}
