-- ===========================================================
-- GLOBAL SCHEMA-ENTITY SYNC (FINAL - ROBUST)
-- Created: 2026-01-26 21:05:00
-- ===========================================================

DO $$ 
BEGIN
    -- 1. Table: attendance
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'ispresent') THEN
        ALTER TABLE attendance RENAME COLUMN ispresent TO is_present;
    END IF;

    -- 2. Table: attendance_configs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'configkey') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "configkey" TO config_key;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'qrenabled') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "qrenabled" TO qr_enabled;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'qrexpireseconds') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "qrexpireseconds" TO qr_expire_seconds;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'facerecognitionenabled') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "facerecognitionenabled" TO face_recognition_enabled;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'facematchthreshold') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "facematchthreshold" TO face_match_threshold;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'wifilocationenabled') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "wifilocationenabled" TO wifi_location_enabled;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'wifirssithreshold') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "wifirssithreshold" TO wifi_rssi_threshold;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'latethresholdminutes') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "latethresholdminutes" TO late_threshold_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'absentthresholdminutes') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "absentthresholdminutes" TO absent_threshold_minutes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_configs' AND column_name = 'minattendancepercentage') THEN
        ALTER TABLE attendance_configs RENAME COLUMN "minattendancepercentage" TO min_attendance_percentage;
    END IF;

    -- 3. Table: room_wifi_access_points
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_wifi_access_points' AND column_name = 'signalstrength') THEN
        ALTER TABLE room_wifi_access_points RENAME COLUMN "signalstrength" TO signal_strength;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'room_wifi_access_points' AND column_name = 'isprimary') THEN
        ALTER TABLE room_wifi_access_points RENAME COLUMN "isprimary" TO is_primary;
    END IF;

    -- 4. Table: grade_components
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_components' AND column_name = 'isrequired') THEN
        ALTER TABLE grade_components RENAME COLUMN "isrequired" TO is_required;
    END IF;

    -- 5. Table: teaching_assignments
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teaching_assignments' AND column_name = 'maxclasses') THEN
        ALTER TABLE teaching_assignments RENAME COLUMN "maxclasses" TO max_classes;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teaching_assignments' AND column_name = 'assignedclasses') THEN
        ALTER TABLE teaching_assignments RENAME COLUMN "assignedclasses" TO assigned_classes;
    END IF;

    -- 6. Table: schedule_requests
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_requests' AND column_name = 'approvernote') THEN
        ALTER TABLE schedule_requests RENAME COLUMN "approvernote" TO approver_note;
    END IF;

    -- 7. Table: import_jobs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'jobid') THEN
        ALTER TABLE import_jobs RENAME COLUMN "jobid" TO job_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'totalrecords') THEN
        ALTER TABLE import_jobs RENAME COLUMN "totalrecords" TO total_records;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'processedrecords') THEN
        ALTER TABLE import_jobs RENAME COLUMN "processedrecords" TO processed_records;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'successcount') THEN
        ALTER TABLE import_jobs RENAME COLUMN "successcount" TO success_count;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'failedcount') THEN
        ALTER TABLE import_jobs RENAME COLUMN "failedcount" TO failed_count;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'statusmessage') THEN
        ALTER TABLE import_jobs RENAME COLUMN "statusmessage" TO status_message;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'errormessage') THEN
        ALTER TABLE import_jobs RENAME COLUMN "errormessage" TO error_message;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'createdby') THEN
        ALTER TABLE import_jobs RENAME COLUMN "createdby" TO created_by;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'createdat') THEN
        ALTER TABLE import_jobs RENAME COLUMN "createdat" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'startedat') THEN
        ALTER TABLE import_jobs RENAME COLUMN "startedat" TO started_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_jobs' AND column_name = 'completedat') THEN
        ALTER TABLE import_jobs RENAME COLUMN "completedat" TO completed_at;
    END IF;

    -- 8. Table: notification_recipients (DASHBOARD FIX)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_recipients' AND column_name = 'user_id') THEN
        ALTER TABLE notification_recipients RENAME COLUMN user_id TO recipient_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_recipients' AND column_name = 'is_deleted') THEN
        ALTER TABLE notification_recipients ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_recipients' AND column_name = 'created_at') THEN
        ALTER TABLE notification_recipients ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- 9. Cleanup redundant columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_roles') THEN
        ALTER TABLE notifications DROP COLUMN target_roles;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_class_name') THEN
        ALTER TABLE notifications DROP COLUMN target_class_name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'target_course_id') THEN
        ALTER TABLE notifications DROP COLUMN target_course_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'start_time') THEN
        ALTER TABLE timetable_slots DROP COLUMN start_time;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timetable_slots' AND column_name = 'end_time') THEN
        ALTER TABLE timetable_slots DROP COLUMN end_time;
    END IF;

END $$;