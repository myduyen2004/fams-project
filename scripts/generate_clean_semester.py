import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_semester", name="Semester Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1000", pageHeight="1400", math="0", shadow="0")
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
    c_dto_req = add_class("SemesterRequest", "DTO", ["- code : String", "- name : String", "- startDate : LocalDate", "- endDate : LocalDate"], [], x=50, y=50, width=280)
    c_dto_conf = add_class("SemesterConfigRequest", "DTO", ["- slotDuration : Integer", "- breakDuration : Integer", "- startTime : LocalTime"], [], x=380, y=50, width=280)
    c_dto_res = add_class("SemesterResponse", "DTO", ["- id : Long", "- code : String", "- name : String", "- status : String"], [], x=710, y=50, width=250)

    # Controllers
    c_ctrl = add_class("SemesterController", "RestController", ["- semesterService : SemesterService"], ["+ getAllSemesters() : List&lt;SemesterResponse&gt;", "+ getUpcomingSemesters() : List&lt;SemesterResponse&gt;", "+ getSemesterById(id) : SemesterResponse", "+ getSemesterByCode(code) : SemesterResponse", "+ createSemester(...) : SemesterResponse", "+ updateSemester(...) : SemesterResponse", "+ deleteSemester(code) : void", "+ saveSemesterConfig(...) : void", "+ togglePublished(...) : Map", "+ getPublishStatus(code) : Map"], x=300, y=300, width=420)

    # Services
    c_svc = add_class("SemesterService", "interface", [], ["+ getAllSemesters() : List&lt;SemesterResponse&gt;", "+ getUpcomingSemesters() : List&lt;SemesterResponse&gt;", "+ getSemesterById(id) : SemesterResponse", "+ getSemesterByCode(code) : SemesterResponse", "+ createSemester(...) : SemesterResponse", "+ updateSemester(...) : SemesterResponse", "+ deleteSemester(code) : void", "+ saveSemesterConfig(...) : void", "+ setPublished(code, isPublished) : void"], x=300, y=600, width=420)
    c_svc_impl = add_class("SemesterServiceImpl", "Service", ["- semesterRepo : SemesterRepository", "- configRepo : SemesterConfigRepository"], ["+ getAllSemesters() : List&lt;SemesterResponse&gt;", "+ getUpcomingSemesters() : List&lt;SemesterResponse&gt;", "+ getSemesterById(id) : SemesterResponse", "+ getSemesterByCode(code) : SemesterResponse", "+ createSemester(...) : SemesterResponse", "+ updateSemester(...) : SemesterResponse", "+ deleteSemester(code) : void", "+ saveSemesterConfig(...) : void", "+ setPublished(code, isPublished) : void"], x=300, y=900, width=420)

    # Repositories
    c_repo_sem = add_class("SemesterRepository", "interface", [], ["+ findByCode(String) : Optional", "+ findByStatus(SemesterStatus) : List"], x=150, y=1200, width=320)
    c_repo_conf = add_class("SemesterConfigRepository", "interface", [], [], x=550, y=1200, width=300)

    # Entities
    c_ent_sem = add_class("Semester", "Entity", ["- id : Long", "- code : String", "- name : String", "- startDate : LocalDate", "- endDate : LocalDate", "- status : SemesterStatus"], [], x=150, y=1400, width=280)
    c_ent_conf = add_class("SemesterConfig", "Entity", ["- id : Long", "- semester : Semester", "- slotDuration : Integer", "- breakDuration : Integer", "- startTime : LocalTime"], [], x=500, y=1400, width=250)
    c_ent_wd = add_class("SemesterWeekday", "Entity", ["- id : Long", "- semester : Semester", "- dayOfWeek : DayOfWeek", "- isActive : Boolean"], [], x=800, y=1400, width=250)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl, c_dto_req, "receives", "dashed")
    add_edge(c_ctrl, c_dto_conf, "receives", "dashed")
    add_edge(c_ctrl, c_dto_res, "returns", "dashed")

    # Controllers -> Services
    add_edge(c_ctrl, c_svc, "uses", "dashed")
    
    # Service Inter
    add_edge(c_svc_impl, c_svc, "implements", "implements")

    # Services -> Repos
    add_edge(c_svc_impl, c_repo_sem, "uses", "dashed")
    add_edge(c_svc_impl, c_repo_conf, "uses", "dashed")
    
    # Repos -> Entities
    add_edge(c_repo_sem, c_ent_sem, "manages", "dashed")
    add_edge(c_repo_conf, c_ent_conf, "manages", "dashed")

    # Entity Relations
    add_edge(c_ent_conf, c_ent_sem, "1..1", "association")
    add_edge(c_ent_wd, c_ent_sem, "*..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/semester_management_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Semester diagram generated successfully!")
