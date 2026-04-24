import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_curriculum", name="Curriculum Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1800", pageHeight="1400", math="0", shadow="0")
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
        elif edge_type == "aggregation":
            style = base_style + "dashed=0;endArrow=diamondThin;endFill=0;"
        
        e = ET.SubElement(root, "mxCell", id=eid, edge="1", parent="1", source=src, target=tgt, style=style, value=label)
        ET.SubElement(e, "mxGeometry", relative="1", **{'as': 'geometry'})
        return eid

    # DTOs
    c_dto_major = add_class("MajorRequest", "DTO", ["- name : String", "- code : String", "- description : String"], [], x=100, y=50, width=280)
    c_dto_spec = add_class("SpecializationRequest", "DTO", ["- name : String", "- code : String", "- majorId : Long"], [], x=500, y=50, width=300)
    c_dto_subspec = add_class("SubSpecializationRequest", "DTO", ["- name : String", "- specializationId : Long"], [], x=950, y=50, width=300)
    c_dto_course = add_class("CourseRequest", "DTO", ["- code : String", "- name : String", "- credits : Integer", "- numberOfSlots : Integer"], [], x=1400, y=50, width=300)

    # Controllers
    c_ctrl_major = add_class("MajorController", "RestController", ["- majorService : MajorService"], ["+ getMajors(...) : Page", "+ createMajor(MajorRequest) : Major", "+ updateMajor(id, MajorRequest) : Major", "+ deleteMajor(id) : void", "+ previewImportMajors(MultipartFile) : List", "+ saveImportedMajors(List) : Map"], x=50, y=250, width=380)
    c_ctrl_spec = add_class("SpecializationController", "RestController", ["- specializationService : SpecializationService"], ["+ getSpecializationsByMajor(...) : Page", "+ createSpecialization(...) : SpecializationResponse", "+ updateSpecialization(id, ...) : SpecializationResponse", "+ deleteSpecialization(id) : void", "+ addCourse(id, courseId, semester) : CourseResponse", "+ previewImportSpecializations(...) : List", "+ saveImportedSpecializations(...) : Map"], x=480, y=250, width=420)
    c_ctrl_subspec = add_class("SubSpecializationController", "RestController", ["- subSpecService : SubSpecializationService"], ["+ getBySpecialization(...) : Page", "+ create(SubSpecializationRequest) : SubSpecializationResponse", "+ update(id, ...) : SubSpecializationResponse", "+ delete(id) : void", "+ addCourse(id, courseId, semester) : CourseResponse"], x=950, y=250, width=420)
    c_ctrl_course = add_class("CourseController", "RestController", ["- courseService : CourseService"], ["+ getCourses(...) : Page", "+ createCourse(CourseRequest) : CourseResponse", "+ updateCourse(id, CourseRequest) : CourseResponse", "+ deleteCourse(id) : void"], x=1420, y=250, width=380)

    # Services
    c_svc_major = add_class("MajorService", "Service", ["- majorRepository : MajorRepository"], ["+ getMajors(...) : Page", "+ createMajor(...) : Major", "+ updateMajor(...) : Major", "+ deleteMajor(id) : void", "+ previewImportMajors(...) : List", "+ saveImportedMajors(...) : Map"], x=50, y=600, width=380)
    c_svc_spec = add_class("SpecializationService", "Service", ["- specRepo : SpecializationRepository", "- specCourseRepo : SpecializationCourseRepository", "- courseRepo : CourseRepository"], ["+ getSpecializationsByMajor(...) : Page", "+ createSpecialization(...) : SpecializationResponse", "+ updateSpecialization(...) : SpecializationResponse", "+ deleteSpecialization(id) : void", "+ addCourse(specId, courseId, semester) : CourseResponse", "+ previewImportSpecializations(...) : List", "+ saveImportedSpecializations(...) : Map"], x=480, y=600, width=420)
    c_svc_subspec_int = add_class("SubSpecializationService", "interface", [], ["+ getSubSpecializationsBySpecialization(...) : Page", "+ createSubSpecialization(...) : SubSpecializationResponse", "+ updateSubSpecialization(...) : SubSpecializationResponse", "+ deleteSubSpecialization(id) : void", "+ addCourse(subSpecId, courseId, semester) : CourseResponse"], x=950, y=600, width=420)
    c_svc_subspec = add_class("SubSpecializationServiceImpl", "Service", ["- subSpecializationRepository : SubSpecializationRepository", "- subSpecializationCourseRepository : SubSpecializationCourseRepo...", "- courseRepository : CourseRepository"], ["+ getSubSpecializationsBySpecialization(...) : Page", "+ createSubSpecialization(...) : SubSpecializationResponse", "+ updateSubSpecialization(...) : SubSpecializationResponse", "+ deleteSubSpecialization(id) : void", "+ addCourse(subSpecId, courseId, semester) : CourseResponse"], x=950, y=850, width=420)

    # Repositories
    c_repo_major = add_class("MajorRepository", "interface", [], [], x=100, y=1100, width=280)
    c_repo_spec = add_class("SpecializationRepository", "interface", [], [], x=550, y=1100, width=280)
    c_repo_subspec = add_class("SubSpecializationRepository", "interface", [], [], x=1000, y=1100, width=320)
    c_repo_course = add_class("CourseRepository", "interface", [], [], x=1450, y=1100, width=280)

    # Entities
    c_ent_major = add_class("Major", "Entity", ["- id : Long", "- code : String", "- name : String", "- description : String", "- status : MajorStatus"], [], x=100, y=1250, width=280)
    c_ent_spec = add_class("Specialization", "Entity", ["- id : Long", "- code : String", "- name : String", "- major : Major", "- status : SpecializationStatus"], [], x=550, y=1250, width=280)
    c_ent_subspec = add_class("SubSpecialization", "Entity", ["- id : Long", "- name : String", "- specialization : Specialization", "- status : SubSpecializationStatus"], [], x=1000, y=1250, width=320)
    c_ent_course = add_class("Course", "Entity", ["- id : Long", "- code : String", "- name : String", "- credits : Integer", "- numberOfSlots : Integer", "- status : CourseStatus"], [], x=1450, y=1250, width=280)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl_major, c_dto_major, "receives", "dashed")
    add_edge(c_ctrl_spec, c_dto_spec, "receives", "dashed")
    add_edge(c_ctrl_subspec, c_dto_subspec, "receives", "dashed")
    add_edge(c_ctrl_course, c_dto_course, "receives", "dashed")

    # Controllers -> Services
    add_edge(c_ctrl_major, c_svc_major, "uses", "dashed")
    add_edge(c_ctrl_spec, c_svc_spec, "uses", "dashed")
    add_edge(c_ctrl_subspec, c_svc_subspec_int, "uses", "dashed")
    
    add_edge(c_svc_subspec, c_svc_subspec_int, "implements", "implements")

    # Services -> Repos
    add_edge(c_svc_major, c_repo_major, "uses", "dashed")
    add_edge(c_svc_spec, c_repo_spec, "uses", "dashed")
    add_edge(c_svc_spec, c_repo_course, "uses", "dashed")
    add_edge(c_svc_subspec, c_repo_subspec, "uses", "dashed")
    add_edge(c_svc_subspec, c_repo_course, "uses", "dashed")
    
    # Repos -> Entities
    add_edge(c_repo_major, c_ent_major, "manages", "dashed")
    add_edge(c_repo_spec, c_ent_spec, "manages", "dashed")
    add_edge(c_repo_subspec, c_ent_subspec, "manages", "dashed")
    add_edge(c_repo_course, c_ent_course, "manages", "dashed")

    # Intra Entity mapping
    add_edge(c_ent_spec, c_ent_major, "*..1", "association")
    add_edge(c_ent_subspec, c_ent_spec, "*..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/curriculum_management_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Curriculum Management diagram generated successfully!")
