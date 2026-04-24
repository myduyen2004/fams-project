import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_grading", name="Grading & Assessment")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="1800", math="0", shadow="0")
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
        
        if total_h <= 40:
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
        elif edge_type == "aggregation":
            style = base_style + "dashed=0;endArrow=diamondThin;endFill=0;"
        
        e = ET.SubElement(root, "mxCell", id=eid, edge="1", parent="1", source=src, target=tgt, style=style, value=label)
        ET.SubElement(e, "mxGeometry", relative="1", **{'as': 'geometry'})
        return eid

    # DTOs
    c_dto_over = add_class("GradeOverviewResponse", "DTO", ["- className : String", "- courseName : String", "- gradeComponents : List", "- studentGrades : List", "- averageGrade : Double", "- passRate : Double", "- gradesSubmitted : Boolean"], [], x=150, y=50, width=320)
    c_dto_row = add_class("StudentGradeRowDTO", "DTO", ["- studentCode : String", "- studentName : String", "- grades : Map&lt;Long, Double&gt;", "- finalGrade : Double", "- isPassing : Boolean"], [], x=550, y=50, width=280)

    # Controllers
    c_ctrl_std = add_class("StudentGradeController", "RestController", ["- studentGradeService : StudentGradeService", "- userRepository : UserRepository"], ["+ getGradeOverview(className) : GradeOverviewResponse", "+ exportGrades(className) : void", "+ importGrades(className, file) : Map", "+ submitGrades(className) : void", "+ getStudentGrades(studentId, className) : StudentMyGradeResponse", "+ getAllGradesSummary(studentId) : StudentAllGradesSummaryResponse"], x=100, y=300, width=420)
    c_ctrl_exam = add_class("ExamGradeController", "RestController", ["- examGradeService : ExamGradeService", "- userRepository : UserRepository"], ["+ getExamGradeOverview(courseCode, semesterCode, type) : Response", "+ importExamGrades(courseCode, semesterCode, type, file) : Map", "+ publishGrades(courseCode, semesterCode, type) : Map", "+ exportExamGrades(courseCode, semesterCode, type) : void"], x=550, y=300, width=420)

    # Services
    c_svc_std = add_class("StudentGradeService", "Service", [], ["+ getGradeOverview(className, callerRole) : GradeOverviewResponse", "+ importGradesFromExcel(className, file, gradedById) : Map", "+ submitGrades(className, submittedById) : void", "+ getStudentGrades(studentId, className) : StudentMyGradeResponse", "+ getAllGradesSummary(studentId) : StudentAllGradesSummaryResponse"], x=100, y=600, width=420)
    c_svc_exam = add_class("ExamGradeService", "Service", [], ["+ getExamGradeOverview(courseCode, semCode, type, role) : Response", "+ importExamGradesFromExcel(courseCode, semCode, type, file, userId) : Map", "+ publishGrades(courseCode, semCode, type, userId) : Map", "+ exportExamGradesToExcel(courseCode, semCode, type, role, response) : void"], x=550, y=600, width=420)

    # Repository
    c_repo_std = add_class("StudentGradeRepository", "interface", [], ["+ findByEnrollmentIdAndGradeComponentId(enrollId, compId) : Optional", "+ findByEnrollmentIdIn(enrollmentIds) : List", "+ findByGradedById(userId) : List"], x=100, y=900, width=420)
    c_repo_comp = add_class("GradeComponentRepository", "interface", [], ["+ findByCourseIdOrderById(courseId) : List", "+ findByCourseIdAndTypeIn(...) : List"], x=550, y=900, width=420)

    # Entities
    c_ent_grade = add_class("StudentGrade", "Entity", ["- id : Long", "- enrollment : Enrollment", "- gradeComponent : GradeComponent", "- score : Double", "- attempt : Integer", "- gradedAt : LocalDateTime"], [], x=100, y=1150, width=300)
    c_ent_comp = add_class("GradeComponent", "Entity", ["- id : Long", "- name : String", "- type : GradeType", "- weight : Double", "- isResit : Boolean", "- course : Course"], [], x=450, y=1150, width=300)
    c_ent_enroll = add_class("Enrollment", "Entity", ["- id : Long", "- classSection : ClassSection", "- student : User", "- studentCode : String", "- status : EnrollmentStatus"], [], x=100, y=1400, width=300)
    c_ent_class = add_class("ClassSection", "Entity", ["- id : Long", "- className : String", "- course : Course", "- gradesSubmitted : Boolean", "- gradesPublished : Boolean"], [], x=450, y=1400, width=300)

    # External Entities
    c_ent_user = add_class("User", "External Entity", [], [], x=800, y=1150, width=200)
    c_ent_course = add_class("Course", "External Entity", [], [], x=800, y=1400, width=200)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl_std, c_dto_over, "returns", "dashed")
    add_edge(c_dto_over, c_dto_row, "contains", "association")

    # Controllers -> Services
    add_edge(c_ctrl_std, c_svc_std, "uses", "dashed")
    add_edge(c_ctrl_exam, c_svc_exam, "uses", "dashed")

    # Services -> Repos
    add_edge(c_svc_std, c_repo_std, "uses", "dashed")
    add_edge(c_svc_std, c_repo_comp, "uses", "dashed")
    add_edge(c_svc_exam, c_repo_std, "uses", "dashed")
    add_edge(c_svc_exam, c_repo_comp, "uses", "dashed")

    # Repos -> Entities
    add_edge(c_repo_std, c_ent_grade, "manages", "dashed")
    add_edge(c_repo_comp, c_ent_comp, "manages", "dashed")

    # Entity Relations
    add_edge(c_ent_grade, c_ent_enroll, "n..1", "association")
    add_edge(c_ent_grade, c_ent_comp, "n..1", "association")
    add_edge(c_ent_enroll, c_ent_class, "n..1", "association")
    add_edge(c_ent_enroll, c_ent_user, "n..1", "association")
    add_edge(c_ent_class, c_ent_course, "n..1", "association")
    add_edge(c_ent_comp, c_ent_course, "n..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/grading_assessment_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Grading & Assessment diagram generated successfully!")
