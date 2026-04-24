import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_ai_complete", name="AI Support Service")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1600", pageHeight="2000", math="0", shadow="0")
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

    # Controllers
    c_ctrl_chat = add_class("AIChatController", "RestController", ["- aiChatService : AIChatService"], ["+ createSession() : Session", "+ getUserSessions() : List", "+ getSessionMessages(sessionId) : List", "+ sendMessage(sessionId, Map) : Map", "+ streamMessage(sessionId, ...) : Flux", "+ uploadFile(sessionId, file, ...) : Map"], x=100, y=100, width=420)
    c_ctrl_tool = add_class("AIToolController", "RestController", ["- aiToolService : AIToolService", "- similarityService : SimilarityService"], ["+ getTools() : List&lt;AITool&gt;", "+ getToolDetail(id) : AITool", "+ toggleToolStatus(id, status) : void", "+ testModel(id, request) : Map", "+ checkAssignmentSimilarity(id) : Map"], x=600, y=100, width=450)

    # Services
    c_svc_chat = add_class("AIChatService", "interface", [], ["+ createSession(User) : Session", "+ getUserSessions(User) : List", "+ sendMessage(...) : Map", "+ streamMessage(...) : Flux", "+ uploadFile(...) : Map", "+ deleteSession(id) : void"], x=100, y=400, width=420)
    c_impl_chat = add_class("AIChatServiceImpl", "Service", ["- chatSessionRepo : AIChatSessionRepository", "- chatMessageRepo : AIChatMessageRepository", "- modelClient : AIModelClient"], [], x=100, y=600, width=420)
    
    c_svc_tool = add_class("AIToolService", "interface", [], ["+ getListAITools() : List", "+ setToolActive(id, bool) : void", "+ testToolConnection(id, Map) : Map"], x=600, y=400, width=450)
    c_impl_tool = add_class("AIToolServiceImpl", "Service", ["- aiToolRepo : AIToolRepository"], [], x=600, y=600, width=450)
    
    c_svc_sim = add_class("SimilarityService", "interface", [], ["+ checkSimilarity(assignmentId) : Map"], x=1100, y=400, width=320)
    c_impl_sim = add_class("SimilarityServiceImpl", "Service", ["- submissionRepo : AssignmentSubmissionRepository", "- vectorDbClient : VectorDatabaseClient"], [], x=1100, y=600, width=350)

    # Clients / external
    c_client_ai = add_class("AIModelClient", "Component", ["- apiKey : String", "- baseUrl : String"], ["+ prompt(model, input) : Map", "+ stream(model, input) : Flux"], x=100, y=850, width=300)
    c_client_vector = add_class("VectorDatabaseClient", "Component", [], ["+ searchSimilar(vector) : List", "+ indexSubmission(id, vector) : void"], x=1100, y=850, width=350)

    # Repositories
    c_repo_sess = add_class("AIChatSessionRepository", "interface", [], ["+ findByUserId(id) : List"], x=100, y=1100, width=350)
    c_repo_msg = add_class("AIChatMessageRepository", "interface", [], ["+ findBySessionId(id) : List"], x=100, y=1250, width=350)
    c_repo_tool = add_class("AIToolRepository", "interface", [], ["+ findAll() : List", "+ findByIsActive(bool) : List"], x=600, y=1100, width=400)

    # Entities
    c_ent_sess = add_class("AIChatSession", "Entity", ["- id : Long", "- user : User", "- title : String", "- startedAt : LocalDateTime"], [], x=100, y=1500, width=300)
    c_ent_msg = add_class("AIChatMessage", "Entity", ["- id : Long", "- session : AIChatSession", "- sender : Role", "- content : String", "- sentAt : LocalDateTime"], [], x=450, y=1500, width=300)
    c_ent_tool = add_class("AITool", "Entity", ["- id : Long", "- name : String", "- description : String", "- isActive : Boolean", "- config : Map", "- lastTestedAt : LocalDateTime"], [], x=800, y=1500, width=350)

    # External Entities
    c_ent_user = add_class("User", "External Entity", [], [], x=1200, y=1500, width=200)

    # Relations
    # Controllers -> Services
    add_edge(c_ctrl_chat, c_svc_chat, "uses", "dashed")
    add_edge(c_ctrl_tool, c_svc_tool, "uses", "dashed")
    add_edge(c_ctrl_tool, c_svc_sim, "uses", "dashed")

    # Impls
    add_edge(c_impl_chat, c_svc_chat, "implements", "implements")
    add_edge(c_impl_tool, c_svc_tool, "implements", "implements")
    add_edge(c_impl_sim, c_svc_sim, "implements", "implements")

    # Impls -> Repos / Clients / Other Services
    add_edge(c_impl_chat, c_repo_sess, "uses", "dashed")
    add_edge(c_impl_chat, c_repo_msg, "uses", "dashed")
    add_edge(c_impl_chat, c_client_ai, "uses", "dashed")
    add_edge(c_impl_chat, c_svc_tool, "uses", "dashed")
    add_edge(c_impl_tool, c_repo_tool, "uses", "dashed")
    add_edge(c_impl_sim, c_client_vector, "uses", "dashed")
    add_edge(c_impl_sim, c_svc_tool, "uses", "dashed")

    # Repos -> Entities
    add_edge(c_repo_sess, c_ent_sess, "manages", "dashed")
    add_edge(c_repo_msg, c_ent_msg, "manages", "dashed")
    add_edge(c_repo_tool, c_ent_tool, "manages", "dashed")

    # Entity relations
    add_edge(c_ent_sess, c_ent_user, "n..1", "association")
    add_edge(c_ent_msg, c_ent_sess, "n..1", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/ai_support_service_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean AI Support Service diagram (Complete) generated successfully!")
