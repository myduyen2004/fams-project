import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_student_ws", name="Student Learning Workspace")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="1400", math="0", shadow="0")
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
    c_dto_tt = add_class("TimetableDTO (inner classes)", "DTO", ["TimetableSlotDTO", "WeeklyTimetableDTO", "DayDTO"], [], x=50, y=50, width=280)
    c_dto_sub_req = add_class("SubmitAssignmentRequest", "DTO", ["- assignmentId : Long", "- fileUrls : List&lt;String&gt;", "- fileNames : List&lt;String&gt;", "- note : String"], [], x=400, y=50, width=300)
    c_dto_sub_res = add_class("AssignmentSubmissionResponse", "DTO", ["- id : Long", "- assignmentTitle : String", "- className : String", "- studentName : String", "- fileUrls : List&lt;String&gt;", "- lecturerComment : String", "- status : SubmissionStatus", "- submittedAt : LocalDateTime"], [], x=750, y=50, width=320)

    # ===== CONTROLLERS =====
    c_ctrl_tt = add_class("TimetableController", "RestController", ["- timetableSlotRepository : TimetableSlotRepository", "- excelExportService : ExcelExportService"], ["+ getStudentTimetable(studentId, date) : WeeklyTimetableDTO", "+ getSemesterSlotsForStudent(studentId, semesterCode) : List", "+ exportStudentTimetable(studentId, semesterCode) : void", "+ getTimetableByClass(className) : List&lt;TimetableSlotDTO&gt;"], x=50, y=300, width=420)
    c_ctrl_assign = add_class("StudentAssignmentController", "RestController", ["- assignmentSubmissionService : AssignmentSubmissionService", "- enrollmentRepository : EnrollmentRepository"], ["+ getMyAssignments() : List&lt;AssignmentSubmissionResponse&gt;", "+ getEnrolledClasses() : List&lt;String&gt;", "+ submitAssignment(SubmitAssignmentRequest) : AssignmentSubmissionResponse", "+ getMySubmission(assignmentId) : AssignmentSubmissionResponse"], x=700, y=300, width=450)

    # ===== SERVICES =====
    c_svc_assign = add_class("AssignmentSubmissionService", "interface", [], ["+ submitAssignment(SubmitAssignmentRequest, Long) : AssignmentSubmissionResponse", "+ getStudentAssignments(Long) : List&lt;AssignmentSubmissionResponse&gt;", "+ getMySubmission(Long, Long) : AssignmentSubmissionResponse", "+ getAssignmentsByClass(String) : List&lt;AssignmentResponse&gt;"], x=700, y=550, width=450)
    c_svc_excel = add_class("ExcelExportService", "Service", [], ["+ exportStudentScheduleToExcel(...) : void"], x=50, y=550, width=380)

    # ===== REPOSITORIES =====
    c_repo_tt = add_class("TimetableSlotRepository", "interface", [], ["+ findByStudentIdAndDateBetween(...) : List", "+ findBySemesterCode(String) : List", "+ findByClassName(String) : List"], x=50, y=750, width=380)
    c_repo_assign = add_class("AssignmentRepository", "interface", [], ["+ findByClassSection_ClassNameOrderByCreatedAtDesc(String) : List", "+ findByTimetableSlotIdIn(List) : List"], x=500, y=750, width=450)
    c_repo_sub = add_class("AssignmentSubmissionRepository", "interface", [], ["+ findByAssignment_IdAndStudent_Id(...) : Optional", "+ findByStudent_Id(Long) : List"], x=1000, y=750, width=380)

    # ===== ENTITIES =====
    c_ent_tt = add_class("TimetableSlot", "Entity", ["- id : Long", "- classSection : ClassSection", "- room : Room", "- date : LocalDate", "- slotNumber : Integer", "- status : TimetableSlotStatus"], [], x=50, y=1000, width=300)
    c_ent_assign = add_class("Assignment", "Entity", ["- id : Long", "- title : String", "- classSection : ClassSection", "- timetableSlot : TimetableSlot", "- dueDate : LocalDateTime", "- status : AssignmentStatus"], [], x=400, y=1000, width=300)
    c_ent_sub = add_class("AssignmentSubmission", "Entity", ["- id : Long", "- assignment : Assignment", "- student : User", "- fileUrl : String", "- note : String", "- lecturerComment : String", "- status : SubmissionStatus", "- submittedAt : LocalDateTime"], [], x=750, y=1000, width=320)

    # ===== ENUMS (horizontal row) =====
    c_enum_tt = add_class("TimetableSlotStatus", "enumeration", ["SCHEDULED", "CANCELLED", "RESCHEDULED", "COMPLETED"], [], x=50, y=1300, width=250)
    c_enum_assign = add_class("AssignmentStatus", "enumeration", ["OPEN", "CLOSED"], [], x=350, y=1300, width=200)
    c_enum_sub = add_class("SubmissionStatus", "enumeration", ["SUBMITTED", "NOT_SUBMITTED", "OVERDUE"], [], x=600, y=1300, width=230)

    # ===== RELATIONS =====
    # Ctrl -> DTOs
    add_edge(c_ctrl_tt, c_dto_tt, "returns")
    add_edge(c_ctrl_assign, c_dto_sub_req, "receives")
    add_edge(c_ctrl_assign, c_dto_sub_res, "returns")

    # Ctrl -> Services
    add_edge(c_ctrl_tt, c_svc_excel, "uses")
    add_edge(c_ctrl_tt, c_repo_tt, "uses")
    add_edge(c_ctrl_assign, c_svc_assign, "uses")

    # Services -> Repos
    add_edge(c_svc_assign, c_repo_assign, "uses")
    add_edge(c_svc_assign, c_repo_sub, "uses")

    # Repos -> Entities
    add_edge(c_repo_tt, c_ent_tt, "manages")
    add_edge(c_repo_assign, c_ent_assign, "manages")
    add_edge(c_repo_sub, c_ent_sub, "manages")

    # Entity relations
    add_edge(c_ent_assign, c_ent_tt, "*..1", "association")
    add_edge(c_ent_sub, c_ent_assign, "*..1", "association")

    # Entity -> Enum
    add_edge(c_ent_tt, c_enum_tt, "uses", "association")
    add_edge(c_ent_assign, c_enum_assign, "uses", "association")
    add_edge(c_ent_sub, c_enum_sub, "uses", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/student_learning_workspace_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Student Learning Workspace diagram generated successfully!")
