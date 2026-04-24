import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_attendance_taking", name="Attendance Taking & Reporting")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1800", pageHeight="1600", math="0", shadow="0")
    root = ET.SubElement(mxGraphModel, "root")
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")

    cell_counter = 10
    def gen_id():
        nonlocal cell_counter; cell_counter += 1; return str(cell_counter)

    def add_class(name, stereotype, fields, methods, x, y, width=280):
        field_h = max(26, len(fields)*26) if fields else 0
        method_h = max(26, len(methods)*26) if methods else 0
        header_h = 40 if stereotype else 26
        total_h = header_h + field_h + method_h
        if fields and not methods: total_h += 8
        if methods and not fields: total_h += 8
        if fields and methods: total_h += 16
        if total_h <= 40: total_h += 26
        class_id = gen_id()
        style = f"swimlane;fontStyle=1;align=center;startSize={header_h};html=1;collapsible=0;strokeWidth=2;fillColor=#ffffff;strokeColor=#000000;rounded=0;"
        title = f"&lt;&lt;{stereotype}&gt;&gt;<br>{name}" if stereotype else name
        c = ET.SubElement(root, "mxCell", id=class_id, parent="1", style=style, value=title, vertex="1")
        ET.SubElement(c, "mxGeometry", x=str(x), y=str(y), width=str(width), height=str(total_h), **{'as': 'geometry'})
        current_y = header_h
        if fields:
            for f in fields:
                fid = gen_id()
                tf = ET.SubElement(root, "mxCell", id=fid, parent=class_id, style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=14;fontColor=#000000;", value=f, vertex="1")
                ET.SubElement(tf, "mxGeometry", y=str(current_y), width=str(width), height="26", **{'as': 'geometry'})
                current_y += 26
            if methods:
                lid = gen_id()
                l = ET.SubElement(root, "mxCell", id=lid, parent=class_id, style="line;strokeWidth=2;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=#000000;html=1;", value="", vertex="1")
                ET.SubElement(l, "mxGeometry", y=str(current_y), width=str(width), height="8", **{'as': 'geometry'})
                current_y += 8
        if methods:
            for m in methods:
                mid = gen_id()
                tm = ET.SubElement(root, "mxCell", id=mid, parent=class_id, style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=14;fontColor=#000000;", value=m, vertex="1")
                ET.SubElement(tm, "mxGeometry", y=str(current_y), width=str(width), height="26", **{'as': 'geometry'})
                current_y += 26
        return class_id

    def add_edge(src, tgt, label, edge_type="dashed"):
        eid = gen_id()
        base = "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;html=1;rounded=0;strokeWidth=2;strokeColor=#000000;fontSize=14;fontColor=#000000;startSize=16;endSize=16;"
        styles = {"dashed": base+"dashed=1;endArrow=open;endFill=0;", "implements": base+"dashed=1;endArrow=block;endFill=0;", "association": base+"dashed=0;endArrow=open;endFill=0;"}
        e = ET.SubElement(root, "mxCell", id=eid, edge="1", parent="1", source=src, target=tgt, style=styles.get(edge_type, styles["dashed"]), value=label)
        ET.SubElement(e, "mxGeometry", relative="1", **{'as': 'geometry'})
        return eid

    # ===== DTOs =====
    c_dto_att = add_class("AttendanceDTO (inner classes)", "DTO", ["StartSessionRequest", "ManualAttendanceRequest", "SessionDetailResponse", "ClassAttendanceReportResponse", "StudentAttendanceSummaryResponse", "IndividualAttendanceDetail"], [], x=50, y=50, width=320)
    c_dto_face = add_class("FaceDTO (inner classes)", "DTO", ["RegisterFaceRequest", "FaceCheckInRequest", "FacePreCheckRequest", "RegisterFaceResponse", "FaceCheckInResponse", "FaceStatusResponse", "PendingVerificationsResponse", "FaceQualityResponse"], [], x=420, y=50, width=320)

    # ===== CONTROLLERS =====
    c_ctrl_att = add_class("AttendanceController", "RestController", ["- attendanceService : AttendanceService"], ["+ startSession(StartSessionRequest) : SessionDetailResponse", "+ getSession(sessionId) : SessionDetailResponse", "+ updateManualAttendance(...) : SessionDetailResponse", "+ getClassAttendanceReport(className) : ClassAttendanceReportResponse", "+ getStudentAttendanceSummary(semesterCode) : Summary", "+ getStudentAttendanceDetail(className) : IndividualAttendanceDetail"], x=50, y=310, width=450)
    c_ctrl_face = add_class("FaceAttendanceController", "RestController", ["- faceAttendanceService : FaceAttendanceService"], ["+ registerFace(RegisterFaceRequest) : RegisterFaceResponse", "+ checkInWithFace(FaceCheckInRequest) : FaceCheckInResponse", "+ preCheckFace(FacePreCheckRequest) : FacePreCheckResponse", "+ getFaceStatus() : FaceStatusResponse", "+ getPendingVerifications() : PendingVerificationsResponse", "+ manualVerify(ManualVerifyRequest) : void", "+ checkQuality(FaceQualityRequest) : FaceQualityResponse"], x=800, y=310, width=450)

    # ===== SERVICE INTERFACES =====
    c_svc_att = add_class("AttendanceService", "interface", [], ["+ startSession(Long, StartSessionRequest) : SessionDetailResponse", "+ getSessionDetail(Long) : SessionDetailResponse", "+ updateManualAttendance(...) : SessionDetailResponse", "+ getClassAttendanceReport(String) : ClassAttendanceReportResponse", "+ getStudentAttendanceSummary(...) : StudentAttendanceSummaryResponse", "+ getStudentAttendanceDetail(...) : IndividualAttendanceDetail"], x=50, y=600, width=450)
    c_svc_face = add_class("FaceAttendanceService", "interface", [], ["+ registerFace(Long, RegisterFaceRequest) : RegisterFaceResponse", "+ checkInWithFace(Long, FaceCheckInRequest) : FaceCheckInResponse", "+ preCheckFace(...) : FacePreCheckResponse", "+ getFaceStatus(Long) : FaceStatusResponse", "+ isValidWiFiLocation(...) : boolean"], x=800, y=600, width=450)

    # ===== SERVICE IMPLS =====
    c_impl_att = add_class("AttendanceServiceImpl", "Service", ["- sessionRepository : AttendanceSessionRepository", "- studentAttendanceRepository : StudentAttendanceRepository", "- timetableSlotRepository : TimetableSlotRepository", "- enrollmentRepository : EnrollmentRepository", "- systemLogService : SystemLogService"], ["+ startSession(...) : SessionDetailResponse", "+ getSessionDetail(Long) : SessionDetailResponse", "+ updateManualAttendance(...) : SessionDetailResponse", "+ getClassAttendanceReport(...) : ClassAttendanceReportResponse", "+ getStudentAttendanceSummary(...) : Summary", "+ getStudentAttendanceDetail(...) : IndividualAttendanceDetail"], x=50, y=850, width=450)
    c_impl_face = add_class("FaceAttendanceServiceImpl", "Service", ["- faceClient : FaceRecognitionClient", "- faceEncodingRepository : FaceEncodingRepository", "- attendanceRepository : StudentAttendanceRepository", "- sessionRepository : AttendanceSessionRepository", "- uploadService : UploadService", "- configService : AttendanceConfigService"], ["+ registerFace(...) : RegisterFaceResponse", "+ checkInWithFace(...) : FaceCheckInResponse", "+ preCheckFace(...) : FacePreCheckResponse", "+ getFaceStatus(Long) : FaceStatusResponse", "+ isValidWiFiLocation(...) : boolean"], x=800, y=850, width=450)

    # ===== AI CLIENT =====
    c_client = add_class("FaceRecognitionClient", "Client", [], ["+ registerFace(FaceRegisterRequest) : FaceRegisterResponse", "+ verifyFace(FaceVerifyRequest) : FaceVerifyResponse", "+ detectFace(FaceDetectRequest) : FaceDetectResponse", "+ checkQuality(FaceQualityRequest) : FaceQualityResponse"], x=1300, y=900, width=400)

    # ===== REPOSITORIES =====
    c_repo_session = add_class("AttendanceSessionRepository", "interface", [], ["+ findByTimetableSlotId(Long) : Optional", "+ findByTimetableSlotIdIn(Collection) : List"], x=50, y=1200, width=400)
    c_repo_student = add_class("StudentAttendanceRepository", "interface", [], ["+ findBySessionId(Long) : List", "+ findBySessionIdIn(Collection) : List", "+ findByStudentIdAndClassName(...) : List"], x=500, y=1200, width=400)
    c_repo_face = add_class("FaceEncodingRepository", "interface", [], ["+ findAllByUserId(Long) : List", "+ findByUserId(Long) : Optional", "+ existsByUserId(Long) : boolean"], x=950, y=1200, width=350)

    # ===== ENTITIES =====
    c_ent_session = add_class("AttendanceSession", "Entity", ["- id : Long", "- timetableSlot : TimetableSlot", "- lecturer : User", "- openedAt : LocalDateTime", "- closedAt : LocalDateTime", "- status : SessionStatus"], [], x=50, y=1450, width=350)
    c_ent_student = add_class("StudentAttendance", "Entity", ["- id : Long", "- session : AttendanceSession", "- student : User", "- status : AttendanceStatus", "- method : CheckInMethod", "- checkInTime : LocalDateTime", "- faceConfidence : Double", "- wifiBssid : String", "- attemptCount : Integer"], [], x=450, y=1450, width=350)
    c_ent_face = add_class("FaceEncoding", "Entity", ["- id : Long", "- user : User", "- encodingData : byte[]", "- livenessVerified : Boolean", "- faceImage : String", "- createdAt : LocalDateTime"], [], x=850, y=1450, width=350)

    # ===== ENUMS (horizontal row) =====
    c_enum_sess = add_class("SessionStatus", "enumeration", ["OPEN", "CLOSED"], [], x=50, y=1750, width=220)
    c_enum_att = add_class("AttendanceStatus", "enumeration", ["PRESENT", "ABSENT", "EXCUSED"], [], x=320, y=1750, width=220)
    c_enum_method = add_class("CheckInMethod", "enumeration", ["QR_CODE", "FACE_RECOGNITION", "MANUAL"], [], x=590, y=1750, width=250)

    # ===== RELATIONS =====
    add_edge(c_ctrl_att, c_dto_att, "uses")
    add_edge(c_ctrl_face, c_dto_face, "uses")
    add_edge(c_ctrl_att, c_svc_att, "uses")
    add_edge(c_ctrl_face, c_svc_face, "uses")
    add_edge(c_impl_att, c_svc_att, "implements", "implements")
    add_edge(c_impl_face, c_svc_face, "implements", "implements")
    add_edge(c_impl_face, c_client, "uses")
    add_edge(c_impl_att, c_repo_session, "uses")
    add_edge(c_impl_att, c_repo_student, "uses")
    add_edge(c_impl_face, c_repo_face, "uses")
    add_edge(c_impl_face, c_repo_student, "uses")
    add_edge(c_repo_session, c_ent_session, "manages")
    add_edge(c_repo_student, c_ent_student, "manages")
    add_edge(c_repo_face, c_ent_face, "manages")
    add_edge(c_ent_student, c_ent_session, "*..1", "association")
    add_edge(c_ent_session, c_enum_sess, "uses", "association")
    add_edge(c_ent_student, c_enum_att, "uses", "association")
    add_edge(c_ent_student, c_enum_method, "uses", "association")

    tree = ET.ElementTree(mxfile)
    # Write to BOTH files
    tree.write("../docs/attendance_taking_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)
    tree.write("../docs/attendance_taking_reporting_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Attendance Taking & Reporting diagrams generated successfully!")
