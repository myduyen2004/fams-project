import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_student_records", name="Student Records Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="1200", math="0", shadow="0")
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

    # DTOs
    c_dto_res = add_class("StudentResponse", "DTO", ["- id : Long", "- studentCode : String", "- fullName : String", "- email : String", "- phone : String", "- majorName : String", "- specializationName : String", "- gpa : Double", "- status : String"], [], x=100, y=50, width=300)
    c_dto_req = add_class("StudentUpdateRequest", "DTO", ["- fullName : String", "- phone : String", "- dob : LocalDate", "- status : UserStatus", "- major : String", "- specialization : String", "- gpa : Double"], [], x=500, y=50, width=300)
    c_dto_import = add_class("StudentImportDTO", "DTO", ["- rowNumber : Integer", "- code : String", "- fullName : String", "- email : String", "- major : String", "- specialization : String", "- gpa : Double", "- status : String", "- errorMessage : String"], [], x=900, y=50, width=300)

    # Controller
    c_ctrl = add_class("AcademicStaffDashboardController<br>(Student Controller)", "RestController", ["- studentService : StudentService"], ["+ getStudents(search, status, ...) : Page", "+ getStudentById(id) : StudentResponse", "+ updateStudent(id, StudentUpdateRequest) : StudentResponse", "+ deleteStudent(id) : void", "+ importStudents(file) : Map", "+ exportStudents(...) : byte[]"], x=450, y=320, width=420)

    # Services
    c_svc = add_class("StudentService", "interface", [], ["+ getAllStudents(...) : Page", "+ getStudentById(id) : StudentResponse", "+ updateStudent(...) : StudentResponse", "+ deleteStudent(id) : void", "+ importStudents(file) : Map", "+ previewImportStudents(file) : List&lt;StudentImportDTO&gt;", "+ saveImportedStudents(List) : Map", "+ exportStudents(...) : byte[]"], x=100, y=550, width=380)
    c_svc_impl = add_class("StudentServiceImpl", "Service", ["- userRepository : UserRepository", "- studentProfileRepo : StudentProfileRepository", "- majorRepo : MajorRepository", "- specRepo : SpecializationRepository", "- subSpecRepo : SubSpecializationRepository", "- systemLogService : SystemLogService"], ["+ getAllStudents(...) : Page", "+ getStudentById(id) : StudentResponse", "+ updateStudent(...) : StudentResponse", "+ importStudents(...) : Map", "+ deleteStudent(id) : void", "+ previewImportStudents(file) : List&lt;StudentImportDTO&gt;", "+ saveImportedStudents(List) : Map", "+ exportStudents(...) : byte[]"], x=600, y=550, width=450)

    # Repositories
    c_repo_prof = add_class("StudentProfileRepository", "interface", [], ["+ findByUserId(Long) : Optional", "+ findByUserCode(String) : Optional"], x=800, y=850, width=350)
    c_repo_user = add_class("UserRepository", "interface", [], ["+ findByCode(String) : Optional", "+ findByRole(UserRole) : List"], x=100, y=850, width=300)
    c_repo_major = add_class("MajorRepository", "interface", [], [], x=450, y=850, width=300)

    # Entities
    c_ent_prof = add_class("StudentProfile", "Entity", ["- id : Long", "- user : User", "- major : Major", "- specialization : Specialization", "- subSpecialization : SubSpecialization", "- course : String", "- gpa : Double"], [], x=800, y=1050, width=350)
    c_ent_user = add_class("User", "Entity", ["- id : Long", "- code : String", "- fullName : String", "- email : String", "- role : UserStatus"], [], x=100, y=1050, width=300)
    c_ent_major = add_class("Major", "Entity", ["- id : Long", "- code : String", "- name : String"], [], x=450, y=1050, width=300)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl, c_dto_res, "returns")
    add_edge(c_ctrl, c_dto_req, "receives")
    add_edge(c_ctrl, c_dto_import, "receives")

    # Controllers -> Services
    add_edge(c_ctrl, c_svc, "uses")
    add_edge(c_svc_impl, c_svc, "implements", "implements")

    # Services -> Repos
    add_edge(c_svc_impl, c_repo_user, "uses")
    add_edge(c_svc_impl, c_repo_prof, "uses")
    add_edge(c_svc_impl, c_repo_major, "uses")
    
    # Repos -> Entities
    add_edge(c_repo_user, c_ent_user, "manages")
    add_edge(c_repo_prof, c_ent_prof, "manages")
    add_edge(c_repo_major, c_ent_major, "manages")

    # Intra Entity mapping
    add_edge(c_ent_prof, c_ent_user, "1..1", "association")
    add_edge(c_ent_prof, c_ent_major, "1..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/student_records_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Student Records diagram generated successfully!")
