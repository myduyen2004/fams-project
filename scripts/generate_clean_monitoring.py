import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_monitoring", name="System Monitoring & Audit")
    mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1442", dy="562", grid="1", gridSize="10", guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="1", pageScale="1", pageWidth="1600", pageHeight="1400", math="0", shadow="0")
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
    c_dto_dashboard = add_class("DashboardStatsResponse", "DTO", ["- totalStudents : Integer", "- totalUsers : Integer", "- totalAccounts : Integer", "- totalApplications : Integer", "- totalBehaviors : Integer"], [], x=50, y=50, width=280)
    c_dto_alert = add_class("AlertResponse", "DTO", ["- id : Long", "- title : String", "- message : String", "- severity : String", "- timestamp : LocalDateTime"], [], x=360, y=50, width=260)
    c_dto_syslog = add_class("SystemLogResponse", "DTO", ["- id : Long", "- title : String", "- description : String", "- type : String", "- source : String", "- performer : String", "- timestamp : LocalDateTime"], [], x=650, y=50, width=260)
    c_dto_recent = add_class("RecentAccessResponse", "DTO", ["- id : Long", "- ipAddress : String", "- userAgent : String", "- loginAt : LocalDateTime"], [], x=940, y=50, width=260)
    c_dto_acad = add_class("AcadStaffDashboardResponse", "DTO", ["- semesterSummary : Map", "- enrollmentTrends : List", "- attendanceOverview : Map"], [], x=1230, y=50, width=320)

    # Controllers
    c_ctrl_dash = add_class("DashboardController", "RestController", ["- dashboardService : DashboardService", "- notificationService : UserNotificationService"], ["+ getStats() : DashboardStatsResponse", "+ getRecentAccess() : List&lt;RecentAccessResponse&gt;", "+ getAlerts() : List&lt;AlertResponse&gt;", "+ getSystemLogs() : List&lt;SystemLogResponse&gt;"], x=300, y=300, width=450)
    c_ctrl_acad = add_class("AcadStaffDashboardController", "RestController", ["- dashboardService : AcademicStaffDashboardService"], ["+ getDashboardData() : AcadStaffDashboardResponse"], x=1000, y=300, width=450)

    # Services
    c_svc_dash_int = add_class("DashboardService", "interface", [], ["+ getStatistics() : DashboardStatsResponse", "+ getRecentAccess() : List&lt;RecentAccessResponse&gt;", "+ getAlerts() : List&lt;AlertResponse&gt;", "+ getSystemLogs() : List&lt;SystemLogResponse&gt;"], x=300, y=500, width=450)
    c_svc_dash_impl = add_class("DashboardServiceImpl", "Service", ["- userRepo : UserRepository", "- classSectionRepo : ClassSectionRepository", "- systemLogRepo : SystemLogRepository", "- alertRepo : AlertRepository", "- accessLogRepo : AccessLogRepository"], ["+ getStatistics() : DashboardStatsResponse", "+ getAlerts() : List", "+ getRecentAccess() : List", "+ getSystemLogs() : List"], x=100, y=700, width=400)
    c_svc_syslog = add_class("SystemLogService", "Service", ["- persistenceService : SystemLogPersistenceService"], ["+ logInfo(title, desc, source, ...) : void", "+ logSuccess(...) : void", "+ logWarning(...) : void", "+ logError(...) : void", "+ log(title, desc, type, ...) : void"], x=550, y=700, width=380)
    c_svc_syslog_pers = add_class("SystemLogPersistenceService", "Service", ["- systemLogRepo : SystemLogRepository"], ["+ saveLogEntry(...) : void"], x=550, y=950, width=350)
    c_svc_acad = add_class("AcademicStaffDashboardService", "Service", [], ["+ getDashboardData() : AcadStaffDashboardResponse"], x=1000, y=500, width=450)
    c_svc_broadcast = add_class("DashboardBroadcastService", "Service", ["- messagingTemplate : SimpMessagingTemplate"], ["+ broadcastStats(DashboardStatsResponse) : void"], x=1000, y=700, width=400)

    # Repos
    c_repo_syslog = add_class("SystemLogRepository", "interface", [], ["+ findByOrderByCreatedAtDesc() : List"], x=550, y=1150, width=350)
    c_repo_alert = add_class("AlertRepository", "interface", [], ["+ findByIsActiveTrueOrderByCreatedAtDesc() : List"], x=100, y=1150, width=400)
    c_repo_access = add_class("AccessLogRepository", "interface", [], ["+ findByUserId(Long) : List", "+ findByOrderByLoginAtDesc(Pageable) : Page"], x=1000, y=1150, width=380)

    # Entities
    c_ent_syslog = add_class("SystemLog", "Entity", ["- id : Long", "- title : String", "- description : String", "- type : LogType", "- source : String", "- ipAddress : String", "- userAgent : String", "- performerUsername : String", "- createdAt : LocalDateTime"], [], x=550, y=1350, width=350)
    c_ent_alert = add_class("Alert", "Entity", ["- id : Long", "- title : String", "- message : String", "- severity : AlertSeverity", "- isActive : Boolean", "- createdAt : LocalDateTime"], [], x=150, y=1350, width=300)
    c_ent_access = add_class("AccessLog", "Entity", ["- id : Long", "- userId : Long", "- ipAddress : String", "- userAgent : String", "- loginAt : LocalDateTime"], [], x=1000, y=1350, width=380)

    # Relations
    # Controllers -> DTOs
    add_edge(c_ctrl_dash, c_dto_dashboard, "returns")
    add_edge(c_ctrl_dash, c_dto_alert, "returns")
    add_edge(c_ctrl_dash, c_dto_syslog, "returns")
    add_edge(c_ctrl_dash, c_dto_recent, "returns")
    add_edge(c_ctrl_acad, c_dto_acad, "returns")

    # Controllers -> Services
    add_edge(c_ctrl_dash, c_svc_dash_int, "uses")
    add_edge(c_ctrl_acad, c_svc_acad, "uses")

    # Services internal
    add_edge(c_svc_dash_impl, c_svc_dash_int, "implements", "implements")
    add_edge(c_svc_syslog, c_svc_syslog_pers, "uses")
    add_edge(c_svc_dash_impl, c_svc_broadcast, "uses")
    
    # Services -> Repos
    add_edge(c_svc_dash_impl, c_repo_syslog, "uses")
    add_edge(c_svc_dash_impl, c_repo_alert, "uses")
    add_edge(c_svc_dash_impl, c_repo_access, "uses")
    add_edge(c_svc_syslog_pers, c_repo_syslog, "uses")

    # Repos -> Entities
    add_edge(c_repo_syslog, c_ent_syslog, "manages")
    add_edge(c_repo_alert, c_ent_alert, "manages")
    add_edge(c_repo_access, c_ent_access, "manages")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/system_monitoring_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean System Monitoring diagram generated successfully!")
