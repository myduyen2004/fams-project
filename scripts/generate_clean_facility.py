import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_facility", name="Facility Management")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1400", pageHeight="1400", math="0", shadow="0")
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
    c_dto_req = add_class("RoomRequest", "DTO", ["- code : String", "- name : String", "- capacity : Integer", "- building : String", "- floor : Integer", "- type : RoomType", "- status : RoomStatus"], [], x=100, y=50, width=280)
    c_dto_res = add_class("RoomResponse", "DTO", ["- id : Long", "- code : String", "- name : String", "- capacity : Integer", "- type : RoomType", "- status : RoomStatus"], [], x=420, y=50, width=280)
    c_dto_wifi = add_class("WiFiApDTO", "DTO", ["- id : Long", "- ssid : String", "- bssid : String", "- status : String"], [], x=740, y=50, width=280)
    c_dto_assign = add_class("AssignApToRoomRequest", "DTO", ["- accessPointId : Long", "- signalStrength : Integer", "- isPrimary : Boolean", "- positionNote : String"], [], x=1060, y=50, width=280)

    # Controllers
    c_ctrl_room = add_class("RoomController", "RestController", ["- roomService : RoomService"], ["+ getAllRooms() : List&lt;RoomResponse&gt;", "+ getRoomAvailability(date, slot) : List", "+ getCurrentlyInUseRooms(date, time) : Set", "+ getRoom(id) : RoomResponse", "+ createRoom(RoomRequest) : RoomResponse", "+ updateRoom(id, RoomRequest) : RoomResponse", "+ deleteRoom(id) : void"], x=180, y=300, width=400)
    c_ctrl_wifi = add_class("WiFiAccessPointController", "RestController", ["- wifiApRepository : WiFiAccessPointRepository", "- roomWifiRepository : RoomWiFiAccessPointRepository", "- roomRepository : RoomRepository"], ["+ getAllAccessPoints() : List&lt;WiFiApDTO&gt;", "+ createAccessPoint(CreateWiFiApRequest) : WiFiApDTO", "+ assignToRoom(roomId, AssignApToRoomRequest) : RoomWiFiApDTO", "+ getRoomAccessPoints(roomId) : List&lt;RoomWiFiApDTO&gt;", "+ setPrimaryAp(roomId, assignmentId) : void", "+ updateAccessPoint(id, UpdateWiFiApRequest) : WiFiApDTO", "+ deleteAccessPoint(id) : void"], x=850, y=300, width=500)

    # Services
    c_svc = add_class("RoomService", "interface", [], ["+ getAllRooms() : List&lt;RoomResponse&gt;", "+ getRoom(Long) : RoomResponse", "+ createRoom(RoomRequest) : RoomResponse", "+ updateRoom(Long, RoomRequest) : RoomResponse", "+ deleteRoom(Long) : void", "+ getRoomAvailability(LocalDate, Integer) : List", "+ getInUseRoomIds(LocalDate, LocalTime) : Set"], x=180, y=600, width=400)
    c_svc_impl = add_class("RoomServiceImpl", "Service", ["- roomRepository : RoomRepository"], ["+ getAllRooms() : List&lt;RoomResponse&gt;", "+ getRoom(Long) : RoomResponse", "+ createRoom(RoomRequest) : RoomResponse", "+ updateRoom(Long, RoomRequest) : RoomResponse", "+ deleteRoom(Long) : void", "+ getRoomAvailability(...) : List", "+ getInUseRoomIds(...) : Set"], x=180, y=850, width=400)

    # Repositories
    c_repo_room = add_class("RoomRepository", "interface", [], ["+ findByCode(String) : Optional&lt;Room&gt;", "+ findByBuilding(String) : List&lt;Room&gt;", "+ existsByCode(String) : boolean"], x=150, y=1100, width=350)
    c_repo_wifi = add_class("WiFiAccessPointRepository", "interface", [], ["+ findByBssid(String) : Optional&lt;WiFiAccessPoint&gt;", "+ existsByBssid(String) : boolean"], x=900, y=850, width=400)
    c_repo_roomwifi = add_class("RoomWiFiAccessPointRepository", "interface", [], ["+ findByRoomId(Long) : List&lt;RoomWiFiAccessPoint&gt;", "+ findByRoomIdAndIsPrimaryTrue(Long) : RoomWiFiAccessPoint", "+ findBssidsByRoomId(Long) : List&lt;String&gt;"], x=550, y=1100, width=450)

    # Entities
    c_ent_room = add_class("Room", "Entity", ["- id : Long", "- code : String", "- name : String", "- capacity : Integer", "- building : String", "- type : RoomType", "- status : RoomStatus", "- roomWiFiAccessPoints : List"], [], x=150, y=1350, width=350)
    c_ent_wifi = add_class("WiFiAccessPoint", "Entity", ["- id : Long", "- ssid : String", "- bssid : String", "- name : String", "- location : String", "- status : WiFiStatus"], [], x=950, y=1350, width=400)
    c_ent_roomwifi = add_class("RoomWiFiAccessPoint", "Entity", ["- id : Long", "- room : Room", "- wifiAccessPoint : WiFiAccessPoint", "- signalStrength : Integer", "- isPrimary : Boolean", "- positionNote : String"], [], x=550, y=1350, width=350)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl_room, c_dto_req, "receives", "dashed")
    add_edge(c_ctrl_room, c_dto_res, "returns", "dashed")
    add_edge(c_ctrl_wifi, c_dto_wifi, "returns", "dashed")
    add_edge(c_ctrl_wifi, c_dto_assign, "receives", "dashed")

    # Controllers -> Services / Repos
    add_edge(c_ctrl_room, c_svc, "uses", "dashed")
    add_edge(c_ctrl_wifi, c_repo_wifi, "uses", "dashed")
    add_edge(c_ctrl_wifi, c_repo_roomwifi, "uses", "dashed")
    add_edge(c_ctrl_wifi, c_repo_room, "uses", "dashed")
    
    # Service inter
    add_edge(c_svc_impl, c_svc, "implements", "implements")
    add_edge(c_svc_impl, c_repo_room, "uses", "dashed")
    
    # Repos -> Entities
    add_edge(c_repo_room, c_ent_room, "manages", "dashed")
    add_edge(c_repo_roomwifi, c_ent_roomwifi, "manages", "dashed")
    add_edge(c_repo_wifi, c_ent_wifi, "manages", "dashed")

    # Entity Relations
    add_edge(c_ent_roomwifi, c_ent_room, "*..1", "association")
    add_edge(c_ent_roomwifi, c_ent_wifi, "*..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/facility_management_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Facility Management diagram generated successfully!")
