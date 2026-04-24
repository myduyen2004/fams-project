import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_account", name="System Account Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="1000", math="0", shadow="0")
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
        
        total_h = header_h
        if fields: total_h += len(fields) * 26
        if methods: total_h += len(methods) * 26
        if fields and not methods: total_h += 8
        if methods and not fields: total_h += 8
        if fields and methods: total_h += 8 + 8

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
    cid_req_create = add_class("UserCreateRequest", "DTO", ["- username : String", "- email : String", "- roleId : Long"], [], x=150, y=-150, width=220)
    cid_req_update = add_class("UserUpdateRequest", "DTO", ["- email : String", "- address : String", "- phone : String", "- roleId : Long"], [], x=420, y=-150, width=250)
    cid_req_assign = add_class("AssignPermissionRequest", "DTO", ["- permissionIds : List&lt;Long&gt;"], [], x=720, y=-150, width=260)
    cid_res_user = add_class("UserResponse", "DTO", ["- id : Long", "- username : String", "- email : String", "- status : String", "- role : String"], [], x=1030, y=-150, width=260)

    # Core Components
    cid_ctrl = add_class(
        "UserController", "RestController",
        ["- userService : UserService"],
        [
            "+ importInactiveUsers(MultipartFile) : ResponseEntity",
            "+ activateUserAccount(Long) : ResponseEntity",
            "+ createUser(UserCreateRequest) : ResponseEntity",
            "+ getUser(Long) : ResponseEntity",
            "+ updateUser(Long, UserUpdateRequest) : ResponseEntity",
            "+ deleteUser(Long) : ResponseEntity",
            "+ getInactiveUsers() : ResponseEntity",
            "+ getActiveUsers() : ResponseEntity",
            "+ blockUser(Long) : ResponseEntity",
            "+ unblockUser(Long) : ResponseEntity",
            "+ assignPermissions(Long, AssignPermissionRequest) : ResponseEntity"
        ],
        x=500, y=100, width=420
    )

    cid_svc = add_class(
        "UserService", "Service",
        [
            "- userRepository : UserRepository",
            "- roleRepository : RoleRepository",
            "- userPermissionRepository : UserPermissionRepository",
            "- excelHelper : ExcelHelper"
        ],
        [
            "+ importInactiveUsers(MultipartFile) : List&lt;UserResponse&gt;",
            "+ activateUser(Long) : void",
            "+ createUser(UserCreateRequest) : UserResponse",
            "+ getUser(Long) : UserResponse",
            "+ updateUser(Long, UserUpdateRequest) : UserResponse",
            "+ deleteUser(Long) : void",
            "+ getInactiveUsers() : List&lt;UserResponse&gt;",
            "+ getActiveUsers() : List&lt;UserResponse&gt;",
            "+ blockUser(Long) : void",
            "+ unblockUser(Long) : void",
            "+ assignPermissions(Long, AssignPermissionRequest) : void"
        ],
        x=500, y=450, width=420
    )
    
    cid_excel = add_class("ExcelHelper", "Component", [], ["+ parseUserExcel(InputStream) : List&lt;User&gt;", "+ generateTemplate() : ByteArrayInputStream"], x=50, y=550, width=350)

    # Entities
    cid_user = add_class(
        "User", "Entity",
        [
            "- id : Long", "- username : String", "- email : String", 
            "- status : UserStatus", "- role : Role", "- permissions : List&lt;UserPermission&gt;"
        ],
        [],
        x=200, y=750, width=300
    )

    cid_role = add_class(
        "Role", "Entity",
        ["- id : Long", "- roleName : String"],
        [],
        x=550, y=750, width=200
    )
    
    cid_permission = add_class(
        "UserPermission", "Entity",
        ["- id : Long", "- permissionName : String", "- user : User"],
        [],
        x=800, y=750, width=250
    )

    # Repositories
    cid_userRepo = add_class(
        "UserRepository", "interface",
        [],
        ["+ findByStatus(UserStatus) : List&lt;User&gt;", "+ saveAll(List&lt;User&gt;) : List&lt;User&gt;"],
        x=200, y=950, width=300
    )

    cid_roleRepo = add_class(
        "RoleRepository", "interface",
        [],
        ["+ findByName(String) : Optional&lt;Role&gt;"],
        x=550, y=950, width=200
    )
    
    cid_permRepo = add_class(
        "UserPermissionRepository", "interface",
        [],
        ["+ findAllByUserId(Long) : List&lt;UserPermission&gt;", "+ deleteAllByUserId(Long) : void"],
        x=800, y=950, width=320
    )

    # Add Relationships DTOs -> Ctrl
    add_edge(cid_ctrl, cid_req_create, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_update, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_assign, "receives", "dashed")
    add_edge(cid_ctrl, cid_res_user, "returns", "dashed")

    # Core Relationships
    add_edge(cid_ctrl, cid_svc, "uses", "dashed")
    
    add_edge(cid_svc, cid_excel, "uses", "dashed")
    
    add_edge(cid_svc, cid_userRepo, "uses", "dashed")
    add_edge(cid_svc, cid_roleRepo, "uses", "dashed")
    add_edge(cid_svc, cid_permRepo, "uses", "dashed")
    
    add_edge(cid_userRepo, cid_user, "manages", "dashed")
    add_edge(cid_roleRepo, cid_role, "manages", "dashed")
    add_edge(cid_permRepo, cid_permission, "manages", "dashed")
    
    add_edge(cid_user, cid_role, "1..1", "association")
    add_edge(cid_user, cid_permission, "1..*", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/account_management_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean System Account Management diagram generated successfully!")
