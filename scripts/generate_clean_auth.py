import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="balanced_auth", name="Authentication Component")
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
    cid_req_login = add_class("LoginRequest", "DTO", ["- username : String", "- password : String"], [], x=100, y=-150, width=200)
    cid_req_change = add_class("ChangePasswordRequest", "DTO", ["- oldPassword : String", "- newPassword : String"], [], x=330, y=-150, width=240)
    cid_req_update = add_class("UpdateProfileRequest", "DTO", ["- email : String", "- phone : String", "- address : String"], [], x=600, y=-150, width=240)
    cid_req_forgot = add_class("ForgotPasswordRequest", "DTO", ["- email : String"], [], x=870, y=-150, width=200)
    cid_req_reset = add_class("ResetPasswordRequest", "DTO", ["- email : String", "- otp : String", "- newPassword : String"], [], x=1100, y=-150, width=220)
    cid_res_login = add_class("LoginResponse", "DTO", ["- token : String", "- role : String", "- username : String"], [], x=50, y=50, width=240)

    # Core Components
    cid_ctrl = add_class(
        "AuthController", "RestController",
        ["- authService : AuthService"],
        [
            "+ login(LoginRequest) : ResponseEntity",
            "+ logout(HttpServletRequest) : ResponseEntity",
            "+ viewProfile() : ResponseEntity",
            "+ updateProfile(UpdateProfileRequest) : ResponseEntity",
            "+ changePassword(ChangePasswordRequest) : ResponseEntity",
            "+ forgotPassword(ForgotPasswordRequest) : ResponseEntity",
            "+ resetPassword(ResetPasswordRequest) : ResponseEntity"
        ],
        x=450, y=50, width=420
    )

    cid_svc = add_class(
        "AuthService", "Service",
        [
            "- userRepository : UserRepository",
            "- userSessionRepository : UserSessionRepository",
            "- jwtUtil : JwtUtil",
            "- passwordEncoder : PasswordEncoder",
            "- emailService : EmailService"
        ],
        [
            "+ login(LoginRequest) : LoginResponse",
            "+ logout(String) : void",
            "+ getCurrentUser() : User",
            "+ updateProfile(UpdateProfileRequest) : User",
            "+ changePassword(ChangePasswordRequest) : void",
            "+ processForgotPassword(String) : void",
            "+ resetPassword(ResetPasswordRequest) : void"
        ],
        x=450, y=320, width=420
    )
    
    cid_email = add_class("EmailService", "interface", [], ["+ sendOtpEmail(String, String) : void"], x=100, y=350, width=300)

    cid_uds = add_class(
        "UserDetailsService", "interface",
        [],
        ["+ loadUserByUsername(String) : UserDetails"],
        x=100, y=500, width=300
    )

    cid_jwt = add_class(
        "JwtUtil", "Component",
        ["- secret : String", "- expiration : Long"],
        ["+ generateToken(User) : String", "+ validateToken(String) : boolean", "+ extractUsername(String) : String"],
        x=1000, y=320, width=320
    )

    cid_filter = add_class(
        "JwtAuthenticationFilter", "Component",
        ["- jwtUtil : JwtUtil", "- userDetailsService : UserDetailsService"],
        ["+ doFilterInternal(...) : void"],
        x=1000, y=520, width=320
    )

    cid_sec = add_class(
        "SecurityConfig", "Configuration",
        [],
        ["+ securityFilterChain(HttpSecurity) : SecurityFilterChain", "+ passwordEncoder() : PasswordEncoder"],
        x=1000, y=690, width=400
    )

    # Entities
    cid_user = add_class(
        "User", "Entity",
        [
            "- id : Long", "- username : String", "- password : String",
            "- email : String", "- role : Role", "- status : UserStatus"
        ],
        [],
        x=200, y=650, width=220
    )

    cid_session = add_class(
        "UserSession", "Entity",
        [
            "- id : Long", "- token : String", "- user : User",
            "- loginTime : LocalDateTime", "- isActive : boolean"
        ],
        [],
        x=550, y=650, width=240
    )

    # Repositories
    cid_userRepo = add_class(
        "UserRepository", "interface",
        [],
        ["+ findByUsername(String) : Optional&lt;User&gt;", "+ findByEmail(String) : Optional&lt;User&gt;"],
        x=150, y=900, width=320
    )

    cid_sessionRepo = add_class(
        "UserSessionRepository", "interface",
        [],
        ["+ findByToken(String) : Optional&lt;UserSession&gt;", "+ invalidateUserSessions(Long) : void"],
        x=550, y=900, width=320
    )

    # Add Relationships DTOs -> Ctrl
    add_edge(cid_ctrl, cid_req_login, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_change, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_update, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_forgot, "receives", "dashed")
    add_edge(cid_ctrl, cid_req_reset, "receives", "dashed")
    add_edge(cid_ctrl, cid_res_login, "returns", "dashed")

    # Core Relationships
    add_edge(cid_ctrl, cid_svc, "uses", "dashed")
    
    add_edge(cid_svc, cid_uds, "implements", "implements")
    add_edge(cid_svc, cid_jwt, "uses", "dashed")
    add_edge(cid_svc, cid_email, "uses", "dashed")
    
    add_edge(cid_svc, cid_userRepo, "uses", "dashed")
    add_edge(cid_svc, cid_sessionRepo, "uses", "dashed")
    
    add_edge(cid_filter, cid_jwt, "uses", "dashed")
    add_edge(cid_filter, cid_uds, "uses", "dashed")
    
    add_edge(cid_sec, cid_filter, "configures", "dashed")
    
    add_edge(cid_userRepo, cid_user, "manages", "dashed")
    add_edge(cid_sessionRepo, cid_session, "manages", "dashed")
    
    add_edge(cid_session, cid_user, "*..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/authentication_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Balanced class diagram generated successfully!")
