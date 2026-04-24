import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_communication", name="Class Communication")
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
    c_dto_group = add_class("ChatGroupResponse", "DTO", ["- id : Long", "- name : String", "- type : String"], [], x=150, y=50, width=280)
    c_dto_msg = add_class("ChatMessageResponse", "DTO", ["- id : Long", "- senderName : String", "- content : String", "- type : String", "- sentAt : LocalDateTime"], [], x=550, y=50, width=320)

    # Controllers
    c_ctrl_group = add_class("ChatGroupController", "RestController", ["- chatGroupService : ChatGroupService"], ["+ createGroupForClass(className) : ChatGroupResponse", "+ getMyGroups() : List", "+ getGroupById(groupId) : ChatGroupResponse", "+ getMessages(groupId, pageable) : Page"], x=100, y=250, width=420)
    c_ctrl_msg = add_class("ChatMessageController", "RestController", ["- chatGroupService : ChatGroupService", "- uploadService : UploadService", "- messagingTemplate : SimpMessagingTemplate"], ["+ sendMessage(id, SendMessageRequest) : ChatMessageResponse", "+ uploadAndSendFile(...) : ChatMessageResponse", "+ handleSendMessage(id, ...) : void (WebSocket)", "+ handleTyping(id, Map) : void (WebSocket)"], x=550, y=250, width=420)

    # Service
    c_svc = add_class("ChatGroupService", "interface", [], ["+ createGroupForClass(String) : ChatGroupResponse", "+ getMyGroups() : List", "+ getMessages(Long, Pageable) : Page", "+ sendMessage(...) : ChatMessageResponse", "+ deleteMessage(Long, Long) : ChatMessageResponse", "+ toggleReaction(Long, String) : ChatMessageResponse", "+ markAsRead(Long, String) : List"], x=250, y=600, width=480)

    # Repositories
    c_repo_group = add_class("ChatGroupRepository", "interface", [], ["+ existsByClassSectionClassName(className) : boolean", "+ findByMemberId(userId) : List", "+ findByIdWithClassSection(groupId) : Optional"], x=100, y=900, width=420)
    c_repo_msg = add_class("ChatMessageRepository", "interface", [], ["+ findByChatGroupIdOrderBySentAtDesc(...) : Page", "+ findTopByChatGroupId...() : Optional"], x=550, y=900, width=420)
    c_repo_member = add_class("ChatGroupMemberRepository", "interface", [], ["+ findActiveMembersWithUser(groupId) : List", "+ existsByChatGroupIdAndUserId(...) : boolean"], x=100, y=1050, width=420)
    c_repo_read = add_class("ChatMessageReadRepository", "interface", [], ["+ countUnreadMessages(groupId, userId) : long", "+ findFirstUnreadMessageId(...) : Optional"], x=550, y=1050, width=420)
    c_repo_react = add_class("ChatMessageReactionRepository", "interface", [], ["+ findByMessageAndUserAndEmoji(...) : Optional"], x=325, y=1200, width=420)

    # Entities
    c_ent_group = add_class("ChatGroup", "Entity", ["- id : Long", "- name : String", "- classSection : ClassSection", "- createdBy : User", "- type : ChatGroupType"], [], x=100, y=1400, width=300)
    c_ent_msg = add_class("ChatMessage", "Entity", ["- id : Long", "- chatGroup : ChatGroup", "- sender : User", "- content : String", "- type : MessageType", "- sentAt : LocalDateTime"], [], x=450, y=1400, width=300)
    c_ent_member = add_class("ChatGroupMember", "Entity", ["- id : Long", "- chatGroup : ChatGroup", "- user : User", "- role : MemberRole", "- joinedAt : LocalDateTime"], [], x=100, y=1650, width=300)
    c_ent_read = add_class("ChatMessageRead", "Entity", ["- id : Long", "- message : ChatMessage", "- user : User", "- readAt : LocalDateTime"], [], x=450, y=1650, width=300)
    c_ent_react = add_class("ChatMessageReaction", "Entity", ["- id : Long", "- message : ChatMessage", "- user : User", "- emoji : String"], [], x=800, y=1650, width=300)

    # External Entities
    c_ent_class = add_class("ClassSection", "External Entity", [], [], x=800, y=1400, width=200)
    c_ent_user = add_class("User", "External Entity", [], [], x=1150, y=1400, width=200)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl_group, c_dto_group, "returns", "dashed")
    add_edge(c_ctrl_msg, c_dto_msg, "returns", "dashed")

    # Controllers -> Service
    add_edge(c_ctrl_group, c_svc, "uses", "dashed")
    add_edge(c_ctrl_msg, c_svc, "uses", "dashed")

    # Service -> Repos
    add_edge(c_svc, c_repo_group, "uses", "dashed")
    add_edge(c_svc, c_repo_msg, "uses", "dashed")
    add_edge(c_svc, c_repo_member, "uses", "dashed")
    add_edge(c_svc, c_repo_read, "uses", "dashed")
    add_edge(c_svc, c_repo_react, "uses", "dashed")

    # Repos -> Entities
    add_edge(c_repo_group, c_ent_group, "manages", "dashed")
    add_edge(c_repo_msg, c_ent_msg, "manages", "dashed")
    add_edge(c_repo_member, c_ent_member, "manages", "dashed")
    add_edge(c_repo_read, c_ent_read, "manages", "dashed")
    add_edge(c_repo_react, c_ent_react, "manages", "dashed")

    # Entity Relations
    add_edge(c_ent_group, c_ent_class, "1..1", "association")
    add_edge(c_ent_group, c_ent_user, "createdBy", "association")
    add_edge(c_ent_member, c_ent_group, "n..1", "association")
    add_edge(c_ent_member, c_ent_user, "n..1", "association")
    add_edge(c_ent_msg, c_ent_group, "n..1", "association")
    add_edge(c_ent_msg, c_ent_user, "sender", "association")
    add_edge(c_ent_read, c_ent_msg, "n..1", "association")
    add_edge(c_ent_read, c_ent_user, "n..1", "association")
    add_edge(c_ent_react, c_ent_msg, "n..1", "association")
    add_edge(c_ent_react, c_ent_user, "n..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/class_communication_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Class Communication diagram generated successfully!")
