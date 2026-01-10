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

    // @Column(length = 50)
    // private String studentClass;

    @Column(length = 20)
    private String course;

    private Double gpa;

    // Ngành học của sinh viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "major_id")
    private Major major;

    // Chuyên ngành của sinh viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialization_id")
    private Specialization specialization;

    // Combo/Chuyên ngành hẹp của sinh viên
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_specialization_id")
    private SubSpecialization subSpecialization;
}
