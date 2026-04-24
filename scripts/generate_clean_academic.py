import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_academic_request", name="Academic Request Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1800", pageHeight="1600", math="0", shadow="0")
    root = ET.SubElement(mxGraphModel, "root")
    
    ET.SubElement(root, "mxCell", id="0")
    ET.SubElement(root, "mxCell", id="1", parent="0")

    cell_counter = 10
    def gen_id():
        nonlocal cell_counter
        cell_counter += 1
        return str(cell_counter)

    def add_class(name, stereotype, fields, methods, x, y, width=280):
        field_h = max(26, len(fields) * 26) if fields else 0
        method_h = max(26, len(methods) * 26) if methods else 0
        header_h = 40 if stereotype else 26
        
        total_h = header_h + field_h + method_h
        if fields and not methods: total_h += 8
        if methods and not fields: total_h += 8
        if fields and methods: total_h += 16
        
        if total_h == 40 or total_h == 26:
            total_h += 26

        class_id = gen_id()
        
        style = f"swimlane;fontStyle=1;align=center;startSize={header_h};html=1;collapsible=0;strokeWidth=2;fillColor=#ffffff;strokeColor=#000000;rounded=0;"
        title = f"&lt;&lt;{stereotype}&gt;&gt;<br>{name}" if stereotype else name
        
        c = ET.SubElement(root, "mxCell", id=class_id, parent="1", style=style, value=title, vertex="1")
        ET.SubElement(c, "mxGeometry", x=str(x), y=str(y), width=str(width), height=str(total_h), **{'as': 'geometry'})
        
        current_y = header_h
        if fields:
            for f in fields:
                fid = gen_id()
                style_t = "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=14;fontColor=#000000;"
                tf = ET.SubElement(root, "mxCell", id=fid, parent=class_id, style=style_t, value=f, vertex="1")
                ET.SubElement(tf, "mxGeometry", y=str(current_y), width=str(width), height="26", **{'as': 'geometry'})
                current_y += 26
            if methods:
                lid = gen_id()
                style_l = "line;strokeWidth=2;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=#000000;html=1;"
                l = ET.SubElement(root, "mxCell", id=lid, parent=class_id, style=style_l, value="", vertex="1")
                ET.SubElement(l, "mxGeometry", y=str(current_y), width=str(width), height="8", **{'as': 'geometry'})
                current_y += 8
        if methods:
            for m in methods:
                mid = gen_id()
                style_m = "text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=14;fontColor=#000000;"
                tm = ET.SubElement(root, "mxCell", id=mid, parent=class_id, style=style_m, value=m, vertex="1")
                ET.SubElement(tm, "mxGeometry", y=str(current_y), width=str(width), height="26", **{'as': 'geometry'})
                current_y += 26
        return class_id

    def add_edge(src, tgt, label, edge_type="dashed"):
        eid = gen_id()
        base_style = "edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;html=1;rounded=0;strokeWidth=2;strokeColor=#000000;fontSize=14;fontColor=#000000;startSize=16;endSize=16;"
        if edge_type == "dashed":
            style = base_style + "dashed=1;endArrow=open;endFill=0;"
        elif edge_type == "implements":
            style = base_style + "dashed=1;endArrow=block;endFill=0;"
        elif edge_type == "extends":
            style = base_style + "dashed=0;endArrow=block;endFill=0;"
        elif edge_type == "association":
            style = base_style + "dashed=0;endArrow=open;endFill=0;"
        
        e = ET.SubElement(root, "mxCell", id=eid, edge="1", parent="1", source=src, target=tgt, style=style, value=label)
        ET.SubElement(e, "mxGeometry", relative="1", **{'as': 'geometry'})
        return eid

    # ===================== SCHEDULE REQUEST BRANCH (Left) =====================

    # Schedule DTOs
    c_dto_sched_req = add_class("CreateScheduleRequest", "DTO", ["- timetableSlotId : Long", "- reason : String", "- requestedDate : LocalDate"], [], x=50, y=50, width=280)
    c_dto_sched_res = add_class("ScheduleRequestResponse", "DTO", ["- id : Long", "- requesterName : String", "- className : String", "- type : String", "- reason : String", "- status : String", "- originalSlotInfo : String", "- requestedSlotInfo : String", "- requestedRoomName : String", "- requestedDate : LocalDate"], [], x=370, y=50, width=300)

    # Schedule Controller
    c_ctrl_sched = add_class("ScheduleRequestController", "RestController", ["- scheduleRequestService : ScheduleRequestService"], ["+ getRequests(...) : Page&lt;ScheduleRequestResponse&gt;", "+ getRequest(id) : ScheduleRequestResponse", "+ getStats() : Map&lt;String, Long&gt;", "+ updateStatus(id, body) : ScheduleRequestResponse", "+ exportRequests(...) : byte[]"], x=100, y=350, width=420)

    # Schedule Service
    c_svc_sched = add_class("ScheduleRequestServiceImpl", "Service", ["- scheduleReqRepo : ScheduleRequestRepository", "- userRepo : UserRepository", "- notificationService : UserNotificationService", "- timetableSlotRepo : TimetableSlotRepository", "- roomRepo : RoomRepository"], ["+ createRequest(...) : ScheduleRequestResponse", "+ getRequests(...) : Page&lt;ScheduleRequestResponse&gt;", "+ getRequestById(id) : ScheduleRequestResponse", "+ updateRequestStatus(...) : ScheduleRequestResponse", "+ revokeRequest(id, lecturerId) : void", "+ getRequestStats() : Map&lt;String, Long&gt;", "+ exportRequests(...) : byte[]"], x=50, y=650, width=470)

    # Schedule Repo
    c_repo_sched = add_class("ScheduleRequestRepository", "interface", [], ["+ countByStatus(RequestStatus) : long", "+ findByRequesterId(...) : Page", "+ existsByRequestedRoomIdAndDateAndSlotAndStatus(...) : boolean", "+ findByIdWithSlots(Long) : Optional"], x=50, y=1000, width=470)

    # Schedule Entity
    c_ent_sched = add_class("ScheduleRequest", "Entity", ["- id : Long", "- requester : User", "- classSection : ClassSection", "- originalSlot : TimetableSlot", "- requestedSlot : TimetableSlot", "- requestedRoom : Room", "- type : RequestType", "- requestedDate : LocalDate", "- reason : String", "- status : RequestStatus", "- approver : User", "- approvedAt : LocalDateTime", "- createdAt : LocalDateTime"], [], x=50, y=1250, width=470)

    # ===================== ACADEMIC REQUEST BRANCH (Right) =====================

    # Academic DTOs
    c_dto_acad_req = add_class("CreateAcademicRequestDTO", "DTO", ["- requestType : AcademicRequestType", "- requestTitle : String", "- semesterId : Long", "- courseId : Long", "- classSectionId : String", "- toClassName : String", "- toMajor : String", "- reason : String", "- note : String"], [], x=750, y=50, width=300)
    c_dto_acad_res = add_class("AcademicRequestResponse", "DTO", ["- id : Long", "- studentCode : String", "- studentName : String", "- requestType : String", "- requestTitle : String", "- semesterCode : String", "- courseName : String", "- className : String", "- reason : String", "- status : String", "- createdAt : LocalDateTime"], [], x=1100, y=50, width=300)

    # Academic Controller
    c_ctrl_acad = add_class("AcademicRequestController", "RestController", ["- academicReqService : AcademicRequestService"], ["+ createRequest(CreateAcademicRequestDTO, file) : AcademicRequestResponse", "+ getRequestTypes() : List", "+ getMyRequests(...) : Page&lt;AcademicRequestResponse&gt;", "+ cancelMyRequest(id) : AcademicRequestResponse", "+ getRequests(...) : Page&lt;AcademicRequestResponse&gt;", "+ getRequest(id) : AcademicRequestResponse", "+ updateStatus(id, body) : AcademicRequestResponse", "+ getStats() : Map&lt;String, Long&gt;"], x=850, y=350, width=450)

    # Academic Service
    c_svc_acad = add_class("AcademicRequestServiceImpl", "Service", ["- academicReqRepo : AcademicRequestRepository", "- userRepo : UserRepository", "- semesterRepo : SemesterRepository", "- enrollmentRepo : EnrollmentRepository", "- notificationService : NotificationService", "- uploadService : UploadService"], ["+ createRequest(...) : AcademicRequestResponse", "+ getRequestsByStudent(...) : Page", "+ getRequests(...) : Page", "+ getRequestById(id) : AcademicRequestResponse", "+ updateRequestStatus(...) : AcademicRequestResponse", "+ cancelRequest(id, studentId) : AcademicRequestResponse", "+ getRequestStats() : Map&lt;String, Long&gt;"], x=850, y=650, width=450)

    # Academic Repo
    c_repo_acad = add_class("AcademicRequestRepository", "interface", [], ["+ findByStudentId(Long) : List", "+ findByStudentWithFilters(...) : Page", "+ findWithFilters(...) : Page", "+ countByStatus(RequestStatus) : long", "+ existsPendingRequest(...) : boolean"], x=850, y=1000, width=450)

    # Academic Entity
    c_ent_acad = add_class("AcademicRequest", "Entity", ["- id : Long", "- student : User", "- requestType : AcademicRequestType", "- requestTitle : String", "- semester : Semester", "- course : Course", "- classSection : ClassSection", "- toClassName : String", "- reason : String", "- note : String", "- fileUrl : String", "- status : RequestStatus", "- approver : User", "- approvedAt : LocalDateTime", "- createdAt : LocalDateTime"], [], x=850, y=1250, width=450)

    # ===================== ENUMERATIONS (Bottom Center) =====================

    c_enum_acad_type = add_class("AcademicRequestType", "enumeration", ["PAUSE_SEMESTER", "RETAKE_COURSE", "CHANGE_CLASS", "OVERLOAD_STUDY", "ABSENT_REQUEST", "GRADE_APPEAL", "CHANGE_MAJOR", "CHANGE_SPECIALIZATION", "OTHERS"], [], x=250, y=1600, width=280)
    c_enum_status = add_class("RequestStatus", "enumeration", ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], [], x=600, y=1600, width=250)
    c_enum_sched_type = add_class("ScheduleRequestType", "enumeration", ["RESCHEDULE", "CANCEL", "SWAP", "ROOM_CHANGE"], [], x=920, y=1600, width=250)

    # ===================== RELATIONS =====================

    # Schedule branch
    add_edge(c_ctrl_sched, c_dto_sched_req, "receives", "dashed")
    add_edge(c_ctrl_sched, c_dto_sched_res, "returns", "dashed")
    add_edge(c_ctrl_sched, c_svc_sched, "uses", "dashed")
    add_edge(c_svc_sched, c_repo_sched, "uses", "dashed")
    add_edge(c_repo_sched, c_ent_sched, "manages", "dashed")

    # Academic branch
    add_edge(c_ctrl_acad, c_dto_acad_req, "receives", "dashed")
    add_edge(c_ctrl_acad, c_dto_acad_res, "returns", "dashed")
    add_edge(c_ctrl_acad, c_svc_acad, "uses", "dashed")
    add_edge(c_svc_acad, c_repo_acad, "uses", "dashed")
    add_edge(c_repo_acad, c_ent_acad, "manages", "dashed")

    # Entity -> Enum associations
    add_edge(c_ent_acad, c_enum_acad_type, "uses", "association")
    add_edge(c_ent_acad, c_enum_status, "uses", "association")
    add_edge(c_ent_sched, c_enum_sched_type, "uses", "association")
    add_edge(c_ent_sched, c_enum_status, "uses", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/academic_request_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Academic Request Management diagram generated successfully!")
