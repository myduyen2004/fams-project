import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_notification", name="Notification Management")
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
        
        # fix zero height
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
    c_dash_res = add_class("DashboardNotificationResponse", "DTO", ["- id : Long", "- title : String", "- content : String", "- type : String", "- isRead : Boolean", "- timestamp : LocalDateTime", "- link : String"], [], x=100, y=50, width=320)
    c_notif_res = add_class("NotificationResponse", "DTO", ["- id : Long", "- title : String", "- content : String", "- type : String", "- isRead : Boolean", "- sentAt : LocalDateTime", "- sender : UserBasic"], [], x=450, y=50, width=320)
    c_news_req = add_class("NewsRequest", "DTO", ["- title : String", "- content : String", "- targetType : String", "- thumbnailUrl : String"], [], x=800, y=50, width=280)
    c_news_res = add_class("NewsResponse", "DTO", ["- id : Long", "- title : String", "- content : String", "- status : String", "- targetType : String", "- publishedAt : LocalDateTime", "- authorName : String"], [], x=1100, y=50, width=320)

    # Controllers
    c_dash_ctrl = add_class("DashboardController", "RestController", ["- dashboardService : DashboardService", "- notificationService : UserNotificationService"], ["+ getNotifications() : List", "+ getUnreadCount() : Map", "+ getNotificationById(id) : DashboardNotificationResponse", "+ markAsRead(id) : void", "+ markAllAsRead() : void"], x=100, y=300, width=420)
    c_news_ctrl = add_class("NewsController", "RestController", ["- newsService : NewsService"], ["+ createNews(NewsRequest) : NewsResponse", "+ publishNews(id) : NewsResponse", "+ getPublishedNews(page,size) : Page", "+ markNewsAsRead(id) : void", "+ getUnreadNewsCount() : Map", "+ getAllNews(Pageable) : Page", "+ getNewsById(Long) : NewsResponse", "+ updateNews(Long, NewsRequest) : NewsResponse", "+ deleteNews(Long) : void"], x=1000, y=300, width=420)

    # Interfaces
    c_usr_notif_svc = add_class("UserNotificationService", "interface", [], ["+ createNotification(...) : void", "+ createBatchNotification(...) : void", "+ getMyNotifications() : List", "+ markAsRead(Long) : void", "+ markAllAsRead() : void", "+ getUnreadNotificationCount() : int"], x=550, y=300, width=380)

    # Services
    c_notif_impl = add_class("NotificationServiceImpl", "Service", ["- notificationRepo : NotificationRepository", "- readStatusRepo : ReadStatusRepository", "- fcmService : FcmService", "- userRepo : UserRepository", "- messagingTemplate : SimpMessagingTemplate"], ["+ getMyNotifications() : List", "+ markAsRead(Long) : void", "+ getUnreadNotificationCount() : int", "+ createNotification(...) : void"], x=550, y=550, width=420)
    c_notif_svc = add_class("NotificationService", "Service", ["- notificationRepo : NotificationRepository", "- readStatusRepo : ReadStatusRepository", "- fcmService : FcmService", "- userRepo : UserRepository"], ["+ createNotification(...) : void", "+ notifyNewsPublished(News) : void", "+ notifyStudentsGradesPublished(...) : void", "+ notifyAcademicStaffNewRequest(...) : void", "+ notifyStudentRequestStatusChange(...) : void"], x=100, y=550, width=420)
    
    c_news_svc = add_class("NewsService", "Service", ["- newsRepo : NewsRepository", "- notificationService : NotificationService", "- readStatusRepo : NewsReadStatusMongoRepo"], ["+ createNews(NewsRequest) : NewsResponse", "+ publishNews(id) : NewsResponse", "+ getPublishedNews(page, size) : Page", "+ markAsRead(id) : void", "+ getAllNews(Pageable) : Page", "+ getNewsById(Long) : NewsResponse", "+ updateNews(Long, NewsRequest) : NewsResponse", "+ deleteNews(Long) : void"], x=1000, y=650, width=420)
    
    c_fcm = add_class("FcmService", "Service", ["- firebaseMessaging : FirebaseMessaging"], ["+ sendPushNotification(userId, title, body) : void", "+ sendPushNotificationsForUsers(userIds, title, body) : void"], x=550, y=850, width=420)
    c_sched = add_class("NotificationSchedulerService", "Service", ["- notificationService : NotificationService"], ["+ @Scheduled cleanupOldNotifications() : void"], x=100, y=850, width=400)

    # Entities and UserBasic
    c_userbasic = add_class("UserBasic", "static inner", ["- id : Long", "- fullName : String", "- role : String", "- avatarUrl : String"], [], x=1450, y=50, width=220)
    c_notif = add_class("Notification", "Entity", ["- id : Long", "- title : String", "- content : String", "- type : NotificationType", "- targetType : TargetType", "- sentAt : LocalDateTime", "- createdAt : LocalDateTime"], [], x=100, y=1050, width=320)
    c_news = add_class("News", "Entity", ["- id : Long", "- title : String", "- content : String", "- status : NewsStatus", "- targetType : TargetType", "- author : User", "- publishedAt : LocalDateTime"], [], x=1000, y=1050, width=320)

    # Repos
    c_notif_repo = add_class("NotificationRepository", "interface", [], ["+ findByTargetTypeInOrderBySentAtDesc(...) : List", "+ findTop5ByOrderByCreatedAtDesc() : List"], x=100, y=1300, width=450)
    c_news_repo = add_class("NewsRepository", "interface", [], ["+ findByStatus(NewsStatus, Pageable) : Page", "+ findByIdAndStatus(Long, NewsStatus) : Optional"], x=1000, y=1300, width=450)
    c_mongo = add_class("ReadStatusRepository (Mongo)", "interface", [], ["+ findByNotificationId(Long) : Optional", "+ findByRecipientId(Long) : List"], x=580, y=1300, width=380)

    # Relations
    add_edge(c_dash_ctrl, c_usr_notif_svc, "uses")
    add_edge(c_dash_ctrl, c_dash_res, "returns")
    
    add_edge(c_news_ctrl, c_news_svc, "uses")
    add_edge(c_news_ctrl, c_news_req, "receives")
    add_edge(c_news_ctrl, c_news_res, "returns")
    
    add_edge(c_notif_impl, c_usr_notif_svc, "implements", "implements")
    add_edge(c_notif_impl, c_notif_res, "returns")
    add_edge(c_notif_impl, c_fcm, "uses")
    
    add_edge(c_notif_svc, c_fcm, "uses")
    
    add_edge(c_news_svc, c_notif_svc, "uses")
    
    add_edge(c_sched, c_notif_svc, "uses")
    
    add_edge(c_notif_impl, c_notif_repo, "uses")
    add_edge(c_notif_impl, c_mongo, "uses")
    
    add_edge(c_notif_svc, c_notif_repo, "uses")
    add_edge(c_notif_svc, c_mongo, "uses")
    
    add_edge(c_news_svc, c_news_repo, "uses")
    add_edge(c_news_svc, c_mongo, "uses")
    
    add_edge(c_notif_repo, c_notif, "manages")
    add_edge(c_news_repo, c_news, "manages")
    
    add_edge(c_notif_res, c_userbasic, "contains", "association")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/notification_management_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Notification Management diagram generated successfully!")
