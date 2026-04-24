import xml.etree.ElementTree as ET

def create_diagram():
    mxfile = ET.Element("mxfile", host="Electron", modified="2024-05-18T10:00:00.000Z", agent="Mozilla/5.0", version="21.2.8", type="device")
    diagram = ET.SubElement(mxfile, "diagram", id="clean_timetable", name="Timetable Operations")
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
        elif edge_type == "aggregation":
            style = base_style + "dashed=0;endArrow=diamondThin;endFill=0;"
        
        e = ET.SubElement(root, "mxCell", id=eid, edge="1", parent="1", source=src, target=tgt, style=style, value=label)
        ET.SubElement(e, "mxGeometry", relative="1", **{'as': 'geometry'})
        return eid

    # DTOs - Row 1 (Generation related)
    c_dto_gen_req = add_class("GenerateRequest", "DTO", ["- semesterCode : String", "- config : GAConfigDTO"], [], x=100, y=50, width=280)
    c_dto_ga = add_class("GAConfigDTO", "DTO", ["- populationSize : Integer", "- maxGenerations : Integer", "- minMutationRate : Double", "- maxMutationRate : Double"], [], x=420, y=50, width=280)
    c_dto_gen_res = add_class("GenerateResponse", "DTO", ["- success : boolean", "- jobId : String", "- message : String"], [], x=740, y=50, width=280)
    c_dto_job = add_class("JobStatusResponse", "DTO", ["- jobId : String", "- semesterCode : String", "- status : String", "- percentComplete : double"], [], x=1060, y=50, width=280)

    # DTOs - Row 2 (Slot / View related)
    c_dto_update = add_class("UpdateSlotRequest", "DTO", ["- date : LocalDate", "- slotNumber : Integer", "- roomId : Long"], [], x=100, y=220, width=280)
    c_dto_slot = add_class("TimetableSlotDTO", "DTO", ["- id : Long", "- className : String", "- courseCode : String", "- lecturerName : String", "- date : LocalDate", "- slotNumber : int"], [], x=420, y=220, width=280)
    c_dto_avail = add_class("AvailabilityResponse", "DTO", ["- availableSlots : List&lt;Integer&gt;", "- allRooms : List&lt;RoomDTO&gt;", "- occupiedRoomIdsBySlot : Map"], [], x=740, y=220, width=320)
    c_dto_weekly = add_class("WeeklyTimetableDTO", "DTO", ["- weekStart : LocalDate", "- weekEnd : LocalDate", "- days : List&lt;DailyTimetableDTO&gt;"], [], x=1100, y=220, width=280)

    # Controller
    c_ctrl = add_class("TimetableController", "RestController", ["- generationService : TimetableGenerationService", "- slotService : TimetableSlotService", "- excelExportService : ExcelExportService"], ["+ generateTimetable(GenerateRequest) : GenerateResponse", "+ startAsyncGeneration(GenerateRequest) : Map", "+ getJobStatus(jobId) : JobStatusResponse", "+ cancelJob(jobId) : Map", "+ getTimetableBySemester(semesterCode) : List", "+ getTimetableByClass(className) : List", "+ updateSlot(id, UpdateSlotRequest) : TimetableSlotDTO", "+ getAvailability(date, semesterCode) : AvailabilityResponse", "+ getStudentTimetable(studentId, date) : WeeklyTimetableDTO", "+ getLecturerTimetable(lecturerId, date) : WeeklyTimetableDTO", "+ exportStudentTimetable(studentId, semesterCode) : void", "+ checkTimetableExists(semesterCode) : Map"], x=450, y=430, width=500)

    # Services
    c_svc_gen = add_class("TimetableGenerationService", "Service", ["- timetableSlotRepo : TimetableSlotRepository", "- classSectionRepo : ClassSectionRepository"], ["+ generateTimetable(jobId, semesterCode, GAConfig) : CompletableFuture", "+ getJobStatus(jobId) : GenerationJob", "+ cancelJob(jobId) : boolean"], x=100, y=750, width=450)
    c_svc_slot = add_class("TimetableSlotServiceImpl", "Service", ["- timetableSlotRepo : TimetableSlotRepository", "- roomRepo : RoomRepository"], ["+ updateSlot(id, UpdateSlotRequest) : TimetableSlotDTO", "+ getAvailability(date, semesterCode) : AvailabilityResponse", "+ searchAssignments(...) : Page"], x=600, y=750, width=400)
    c_svc_excel = add_class("ExcelExportService", "Service", [], ["+ exportStudentScheduleToExcel(response, slots, ...) : void", "+ exportLecturerScheduleToExcel(response, slots, ...) : void"], x=1050, y=750, width=420)

    # Repository
    c_repo = add_class("TimetableSlotRepository", "interface", [], ["+ findBySemesterCode(String) : List", "+ findByStudentIdAndDateBetween(...) : List", "+ findBySemesterCodeAndDate(String, LocalDate) : List", "+ findByClassName(String) : List", "+ findByLecturerIdAndDateBetween(...) : List"], x=350, y=1050, width=450)

    # Entity
    c_ent = add_class("TimetableSlot", "Entity", ["- id : Long", "- classSection : ClassSection", "- room : Room", "- dayOfWeek : DayOfWeek", "- slotNumber : Integer", "- startTime : LocalTime", "- date : LocalDate"], [], x=400, y=1300, width=350)

    # Relations
    # Controller -> DTOs
    add_edge(c_ctrl, c_dto_gen_req, "receives", "dashed")
    add_edge(c_ctrl, c_dto_gen_res, "returns", "dashed")
    add_edge(c_ctrl, c_dto_job, "returns", "dashed")
    add_edge(c_ctrl, c_dto_update, "receives", "dashed")
    add_edge(c_ctrl, c_dto_slot, "returns", "dashed")
    add_edge(c_ctrl, c_dto_avail, "returns", "dashed")
    add_edge(c_ctrl, c_dto_weekly, "returns", "dashed")

    # DTO composition
    add_edge(c_dto_gen_req, c_dto_ga, "contains", "association")

    # Controller -> Services
    add_edge(c_ctrl, c_svc_gen, "uses", "dashed")
    add_edge(c_ctrl, c_svc_slot, "uses", "dashed")
    add_edge(c_ctrl, c_svc_excel, "uses", "dashed")

    # Services -> Repo
    add_edge(c_svc_gen, c_repo, "uses", "dashed")
    add_edge(c_svc_slot, c_repo, "uses", "dashed")

    # Repo -> Entity
    add_edge(c_repo, c_ent, "manages", "dashed")

    tree = ET.ElementTree(mxfile)
    tree.write("../docs/timetable_operations_class_diagram.drawio", encoding="UTF-8", xml_declaration=False)

if __name__ == "__main__":
    create_diagram()
    print("Clean Timetable Operations diagram generated successfully!")
