import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_lecturer_ws", name="Lecturer Teaching Workspace")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1600", pageHeight="1400", math="0", shadow="0")
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
    c_dto_create = add_class("CreateAssignmentRequest", "DTO", ["- className : String", "- title : String", "- description : String", "- dueDate : LocalDateTime", "- timetableSlotId : Long"], [], x=100, y=50, width=300)
    c_dto_res = add_class("AssignmentResponse", "DTO", ["- id : Long", "- title : String", "- className : String", "- dueDate : LocalDateTime", "- status : String"], [], x=450, y=50, width=280)
    c_dto_sub = add_class("AssignmentSubmissionResponse", "DTO", ["- id : Long", "- studentName : String", "- fileUrls : List&lt;String&gt;", "- note : String", "- lecturerComment : String", "- status : String", "- submittedAt : LocalDateTime"], [], x=780, y=50, width=320)

    # ===== CONTROLLERS =====
    c_ctrl_lec = add_class("LecturerController", "RestController", ["- classSectionRepository : ClassSectionRepository", "- timetableSlotRepository : TimetableSlotRepository"], ["+ getClasses() : List&lt;String&gt;", "+ getSlotsForClass(className) : List&lt;ClassSlotResponse&gt;", "+ checkConflicts(...) : Map"], x=100, y=310, width=400)
    c_ctrl_tt = add_class("TimetableController", "RestController", ["- timetableSlotRepository : TimetableSlotRepository", "- excelExportService : ExcelExportService"], ["+ getLecturerTimetable(lecturerId, date) : WeeklyTimetableDTO", "+ exportLecturerTimetable(lecturerId, semesterCode) : void"], x=550, y=310, width=420)
    c_ctrl_assign = add_class("LecturerAssignmentController", "RestController", ["- assignmentSubmissionService : AssignmentSubmissionService"], ["+ createAssignment(CreateAssignmentRequest) : AssignmentResponse", "+ updateAssignment(id, ...) : AssignmentResponse", "+ deleteAssignment(id) : void", "+ closeAssignment(id) : void", "+ getAssignments(className) : List&lt;AssignmentResponse&gt;", "+ getSubmissions(assignmentId) : List&lt;AssignmentSubmissionResponse&gt;", "+ updateLecturerComment(submissionId, Map) : AssignmentSubmissionResponse", "+ downloadAllSubmissions(assignmentId) : byte[]"], x=1050, y=310, width=480)

    # ===== SERVICE =====
    c_svc = add_class("AssignmentSubmissionService", "interface", [], ["+ createAssignment(CreateAssignmentRequest, Long) : AssignmentResponse", "+ updateAssignment(...) : AssignmentResponse", "+ deleteAssignment(Long, Long) : void", "+ closeAssignment(Long, Long) : void", "+ getAssignmentsByClass(String) : List&lt;AssignmentResponse&gt;", "+ getAssignmentSubmissions(Long) : List&lt;AssignmentSubmissionResponse&gt;", "+ updateLecturerComment(Long, Long, String) : AssignmentSubmissionResponse", "+ downloadAllSubmissionsAsZip(Long, Long) : byte[]"], x=1050, y=650, width=480)

    # ===== REPOSITORIES =====
    c_repo_cs = add_class("ClassSectionRepository", "interface", [], ["+ findByLecturerIdAndSemesterCode(...) : List", "+ findDistinctClassNamesByLecturerId(Long) : List&lt;String&gt;"], x=100, y=650, width=400)
    c_repo_tt = add_class("TimetableSlotRepository", "interface", [], ["+ findByLecturerIdAndDateBetween(...) : List", "+ existsByLecturerIdAndDateAndSlotNumber(...) : boolean"], x=550, y=650, width=400)
    c_repo_assign = add_class("AssignmentRepository", "interface", [], ["+ findByClassSection_ClassNameOrderByCreatedAtDesc(String) : List"], x=1050, y=950, width=480)
    c_repo_sub = add_class("AssignmentSubmissionRepository", "interface", [], ["+ findByAssignment_Id(Long) : List", "+ findByAssignment_IdAndStudent_Id(...) : Optional"], x=1050, y=1100, width=480)

    # ===== ENTITIES =====
    c_ent_cs = add_class("ClassSection", "Entity", ["- className : String", "- lecturer : User", "- semester : Semester", "- course : Course"], [], x=100, y=900, width=300)
    c_ent_tt = add_class("TimetableSlot", "Entity", ["- id : Long", "- classSection : ClassSection", "- room : Room", "- date : LocalDate"], [], x=450, y=900, width=280)
    c_ent_assign = add_class("Assignment", "Entity", ["- id : Long", "- title : String", "- classSection : ClassSection", "- createdBy : User", "- status : AssignmentStatus"], [], x=1050, y=1250, width=300)
    c_ent_sub = add_class("AssignmentSubmission", "Entity", ["- id : Long", "- assignment : Assignment", "- student : User", "- lecturerComment : String", "- status : SubmissionStatus"], [], x=1400, y=1250, width=300)

    # ===== RELATIONS =====
    # Ctrl -> DTOs
    add_edge(c_ctrl_assign, c_dto_create, "receives")
    add_edge(c_ctrl_assign, c_dto_res, "returns")
    add_edge(c_ctrl_assign, c_dto_sub, "returns")

    # Ctrl -> Service / Repos
    add_edge(c_ctrl_lec, c_repo_cs, "uses")
    add_edge(c_ctrl_lec, c_repo_tt, "uses")
    add_edge(c_ctrl_tt, c_repo_tt, "uses")
    add_edge(c_ctrl_assign, c_svc, "uses")

    # Service -> Repos
    add_edge(c_svc, c_repo_assign, "uses")
    add_edge(c_svc, c_repo_sub, "uses")

    # Repos -> Entities
    add_edge(c_repo_cs, c_ent_cs, "manages")
    add_edge(c_repo_tt, c_ent_tt, "manages")
    add_edge(c_repo_assign, c_ent_assign, "manages")
    add_edge(c_repo_sub, c_ent_sub, "manages")

    # Entity relations
    add_edge(c_ent_tt, c_ent_cs, "*..1", "association")
    add_edge(c_ent_assign, c_ent_cs, "*..1", "association")
    add_edge(c_ent_sub, c_ent_assign, "*..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/lecturer_teaching_workspace_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Lecturer Teaching Workspace diagram generated successfully!")
