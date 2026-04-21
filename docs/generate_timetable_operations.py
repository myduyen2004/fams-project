
xml_template = """<mxfile host="app.diagrams.net" agent="Mozilla/5.0" version="29.6.6">
  <diagram name="Timetable Operations" id="d1">
    <mxGraphModel dx="2535" dy="937" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="2400" pageHeight="2000" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        
        <!-- ==================== CONTROLLER ==================== -->
        <mxCell id="12" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;RestController&amp;gt;&amp;gt;&#xa;TimetableController" vertex="1">
          <mxGeometry height="586" width="500" x="430" y="40" as="geometry" />
        </mxCell>
        <mxCell id="13" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- generationService : TimetableGenerationService" vertex="1"><mxGeometry height="26" width="500" y="30" as="geometry" /></mxCell>
        <mxCell id="13_2" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- slotService : TimetableSlotService" vertex="1"><mxGeometry height="26" width="500" y="56" as="geometry" /></mxCell>
        <mxCell id="15" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- excelExportService : ExcelExportService" vertex="1"><mxGeometry height="26" width="500" y="82" as="geometry" /></mxCell>
        <mxCell id="16" parent="12" style="line;strokeWidth=1;fillColor=none;html=1;" value="" vertex="1"><mxGeometry height="8" width="500" y="108" as="geometry" /></mxCell>
        <mxCell id="17" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ generateTimetable(GenerateRequest) : GenerateResponse" vertex="1"><mxGeometry height="26" width="500" y="116" as="geometry" /></mxCell>
        <mxCell id="17_1" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ startAsyncGeneration(GenerateRequest) : Map" vertex="1"><mxGeometry height="26" width="500" y="142" as="geometry" /></mxCell>
        <mxCell id="17_2" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getJobStatus(jobId) : JobStatusResponse" vertex="1"><mxGeometry height="26" width="500" y="168" as="geometry" /></mxCell>
        <mxCell id="17_3" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ cancelJob(jobId) : Map" vertex="1"><mxGeometry height="26" width="500" y="194" as="geometry" /></mxCell>
        <mxCell id="18" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getTimetableBySemester(semesterCode) : List" vertex="1"><mxGeometry height="26" width="500" y="220" as="geometry" /></mxCell>
        <mxCell id="18_1" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getTimetableBySemesterAndDate(...) : List" vertex="1"><mxGeometry height="26" width="500" y="246" as="geometry" /></mxCell>
        <mxCell id="18_2" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getTimetableBySemesterAndDateRange(...) : List" vertex="1"><mxGeometry height="26" width="500" y="272" as="geometry" /></mxCell>
        <mxCell id="18_3" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ checkTimetableExists(semesterCode) : Map" vertex="1"><mxGeometry height="26" width="500" y="298" as="geometry" /></mxCell>
        <mxCell id="18_4" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ countUnscheduledClassSections(semesterCode) : Map" vertex="1"><mxGeometry height="26" width="500" y="324" as="geometry" /></mxCell>
        <mxCell id="18_5" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ checkConfigChangedAfterGeneration(...) : Map" vertex="1"><mxGeometry height="26" width="500" y="350" as="geometry" /></mxCell>
        <mxCell id="18_6" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getTimetableByClass(className) : List" vertex="1"><mxGeometry height="26" width="500" y="376" as="geometry" /></mxCell>
        <mxCell id="20" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ updateSlot(id, UpdateSlotRequest) : TimetableSlotDTO" vertex="1"><mxGeometry height="26" width="500" y="402" as="geometry" /></mxCell>
        <mxCell id="22_1" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getAvailability(date, semesterCode) : AvailabilityResponse" vertex="1"><mxGeometry height="26" width="500" y="428" as="geometry" /></mxCell>
        <mxCell id="19" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getStudentTimetable(studentId, date) : WeeklyTimetableDTO" vertex="1"><mxGeometry height="26" width="500" y="454" as="geometry" /></mxCell>
        <mxCell id="19_1" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getSemesterSlotsForStudent(...) : List" vertex="1"><mxGeometry height="26" width="500" y="480" as="geometry" /></mxCell>
        <mxCell id="19_2" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getLecturerTimetable(lecturerId, date) : WeeklyTimetableDTO" vertex="1"><mxGeometry height="26" width="500" y="506" as="geometry" /></mxCell>
        <mxCell id="19_4" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getLecturerTeachingDates(...) : List" vertex="1"><mxGeometry height="26" width="500" y="532" as="geometry" /></mxCell>
        <mxCell id="21" parent="12" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ exportStudentTimetable(studentId, semesterCode) : void" vertex="1"><mxGeometry height="26" width="500" y="558" as="geometry" /></mxCell>

        <!-- ==================== SERVICES ==================== -->
        <mxCell id="29" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;TimetableGenerationService" vertex="1">
          <mxGeometry height="168" width="550" x="405" y="700" as="geometry" />
        </mxCell>
        <mxCell id="30" parent="29" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- timetableSlotRepo : TimetableSlotRepository" vertex="1"><mxGeometry height="26" width="550" y="30" as="geometry" /></mxCell>
        <mxCell id="31" parent="29" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- classSectionRepo : ClassSectionRepository" vertex="1"><mxGeometry height="26" width="550" y="56" as="geometry" /></mxCell>
        <mxCell id="33" parent="29" style="line;strokeWidth=1;fillColor=none;html=1;" value="" vertex="1"><mxGeometry height="8" width="550" y="82" as="geometry" /></mxCell>
        <mxCell id="34" parent="29" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ generateTimetable(jobId, semesterCode, GAConfig) : CompletableFuture" vertex="1"><mxGeometry height="26" width="550" y="90" as="geometry" /></mxCell>
        <mxCell id="35" parent="29" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getJobStatus(jobId) : GenerationJob" vertex="1"><mxGeometry height="26" width="550" y="116" as="geometry" /></mxCell>
        <mxCell id="35_1" parent="29" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ cancelJob(jobId) : boolean" vertex="1"><mxGeometry height="26" width="550" y="142" as="geometry" /></mxCell>

        <mxCell id="S1" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;TimetableSlotServiceImpl" vertex="1">
          <mxGeometry height="168" width="420" x="1030" y="454" as="geometry" />
        </mxCell>
        <mxCell id="S1_1" parent="S1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- timetableSlotRepo : TimetableSlotRepository" vertex="1"><mxGeometry height="26" width="420" y="30" as="geometry" /></mxCell>
        <mxCell id="S1_2" parent="S1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- roomRepo : RoomRepository" vertex="1"><mxGeometry height="26" width="420" y="56" as="geometry" /></mxCell>
        <mxCell id="S1_3" parent="S1" style="line;strokeWidth=1;fillColor=none;html=1;" value="" vertex="1"><mxGeometry height="8" width="420" y="82" as="geometry" /></mxCell>
        <mxCell id="S1_4" parent="S1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ updateSlot(id, UpdateSlotRequest) : TimetableSlotDTO" vertex="1"><mxGeometry height="26" width="420" y="90" as="geometry" /></mxCell>
        <mxCell id="S1_5" parent="S1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ getAvailability(date, semesterCode) : AvailabilityResponse" vertex="1"><mxGeometry height="26" width="420" y="116" as="geometry" /></mxCell>
        <mxCell id="S1_6" parent="S1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ searchAssignments(...) : Page" vertex="1"><mxGeometry height="26" width="420" y="142" as="geometry" /></mxCell>

        <mxCell id="S2" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;ExcelExportService" vertex="1">
          <mxGeometry height="116" width="420" x="1060" y="280" as="geometry" />
        </mxCell>
        <mxCell id="S2_1" parent="S2" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ exportStudentScheduleToExcel(response, slots, ...) : void" vertex="1"><mxGeometry height="26" width="420" y="30" as="geometry" /></mxCell>
        <mxCell id="S2_2" parent="S2" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ exportLecturerScheduleToExcel(response, slots, ...) : void" vertex="1"><mxGeometry height="26" width="420" y="56" as="geometry" /></mxCell>

        <!-- ==================== REPOSITORY & ENTITY ==================== -->
        <mxCell id="67" parent="1" style="swimlane;fontStyle=3;align=center;startSize=30;html=1;collapsible=0;fillColor=#d0e8f2;strokeColor=#5b9bd5;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;TimetableSlotRepository" vertex="1">
          <mxGeometry height="220" width="500" x="1010" y="710" as="geometry" />
        </mxCell>
        <mxCell id="69_1" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findBySemesterCode(String) : List" vertex="1"><mxGeometry height="26" width="500" y="30" as="geometry" /></mxCell>
        <mxCell id="69" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findByStudentIdAndDateBetween(Long, LocalDate, LocalDate) : List" vertex="1"><mxGeometry height="26" width="500" y="56" as="geometry" /></mxCell>
        <mxCell id="70" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findBySemesterCodeAndDate(String, LocalDate) : List" vertex="1"><mxGeometry height="26" width="500" y="82" as="geometry" /></mxCell>
        <mxCell id="70_1" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findBySemesterCodeAndDateBetween(String, LocalDate, LocalDate) : List" vertex="1"><mxGeometry height="26" width="500" y="108" as="geometry" /></mxCell>
        <mxCell id="70_2" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findByClassName(String) : List" vertex="1"><mxGeometry height="26" width="500" y="134" as="geometry" /></mxCell>
        <mxCell id="70_3" parent="67" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="+ findByLecturerIdAndDateBetween(Long, LocalDate, LocalDate) : List" vertex="1"><mxGeometry height="26" width="500" y="160" as="geometry" /></mxCell>

        <mxCell id="50" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#f8cecc;strokeColor=#b85450;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;Entity&amp;gt;&amp;gt;&#xa;TimetableSlot" vertex="1">
          <mxGeometry height="194" width="300" x="1580" y="720" as="geometry" />
        </mxCell>
        <mxCell id="51" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- classSection : ClassSection" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="52" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- room : Room" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="53" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- dayOfWeek : DayOfWeek" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>
        <mxCell id="54" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- slotNumber : Integer" vertex="1"><mxGeometry height="26" width="300" y="108" as="geometry" /></mxCell>
        <mxCell id="55" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- startTime : LocalTime" vertex="1"><mxGeometry height="26" width="300" y="134" as="geometry" /></mxCell>
        <mxCell id="56" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- date : LocalDate" vertex="1"><mxGeometry height="26" width="300" y="160" as="geometry" /></mxCell>

        <!-- ==================== REQUEST DTOs (Left) ==================== -->
        <mxCell id="D2" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;GenerateRequest" vertex="1">
          <mxGeometry height="90" width="260" x="50" y="100" as="geometry" />
        </mxCell>
        <mxCell id="D2_1" parent="D2" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- semesterCode : String" vertex="1"><mxGeometry height="26" width="260" y="30" as="geometry" /></mxCell>
        <mxCell id="D2_2" parent="D2" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- config : GAConfigDTO" vertex="1"><mxGeometry height="26" width="260" y="56" as="geometry" /></mxCell>

        <mxCell id="D2_3_Cont" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;GAConfigDTO" vertex="1">
          <mxGeometry height="240" width="300" x="30" y="340" as="geometry" />
        </mxCell>
        <mxCell id="D2_3_1" parent="D2_3_Cont" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- populationSize : Integer" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="D2_3_2" parent="D2_3_Cont" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- maxGenerations : Integer" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="D2_3_3" parent="D2_3_Cont" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- minMutationRate : Double" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>
        <mxCell id="D2_3_4" parent="D2_3_Cont" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- maxMutationRate : Double" vertex="1"><mxGeometry height="26" width="300" y="108" as="geometry" /></mxCell>
        <mxCell id="D2_3_5" parent="D2_3_Cont" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- ... other properties" vertex="1"><mxGeometry height="26" width="300" y="134" as="geometry" /></mxCell>

        <mxCell id="D4" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;UpdateSlotRequest" vertex="1">
          <mxGeometry height="116" width="260" x="50" y="210" as="geometry" />
        </mxCell>
        <mxCell id="D4_1" parent="D4" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- date : LocalDate" vertex="1"><mxGeometry height="26" width="260" y="30" as="geometry" /></mxCell>
        <mxCell id="D4_2" parent="D4" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- slotNumber : Integer" vertex="1"><mxGeometry height="26" width="260" y="56" as="geometry" /></mxCell>
        <mxCell id="D4_3" parent="D4" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- roomId : Long" vertex="1"><mxGeometry height="26" width="260" y="82" as="geometry" /></mxCell>

        <!-- ==================== RESPONSE DTOs (Right) ==================== -->
        <mxCell id="D6" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;GenerateResponse" vertex="1">
          <mxGeometry height="142" width="260" x="1060" y="20" as="geometry" />
        </mxCell>
        <mxCell id="D6_1" parent="D6" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- success : boolean" vertex="1"><mxGeometry height="26" width="260" y="30" as="geometry" /></mxCell>
        <mxCell id="D6_2" parent="D6" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- jobId : String" vertex="1"><mxGeometry height="26" width="260" y="56" as="geometry" /></mxCell>
        <mxCell id="D6_3" parent="D6" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- message : String" vertex="1"><mxGeometry height="26" width="260" y="82" as="geometry" /></mxCell>
        <mxCell id="D6_4" parent="D6" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- ... other stats" vertex="1"><mxGeometry height="26" width="260" y="108" as="geometry" /></mxCell>

        <mxCell id="D7" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;JobStatusResponse" vertex="1">
          <mxGeometry height="168" width="260" x="1350" y="20" as="geometry" />
        </mxCell>
        <mxCell id="D7_1" parent="D7" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- jobId : String" vertex="1"><mxGeometry height="26" width="260" y="30" as="geometry" /></mxCell>
        <mxCell id="D7_2" parent="D7" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- semesterCode : String" vertex="1"><mxGeometry height="26" width="260" y="56" as="geometry" /></mxCell>
        <mxCell id="D7_3" parent="D7" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- status : String" vertex="1"><mxGeometry height="26" width="260" y="82" as="geometry" /></mxCell>
        <mxCell id="D7_4" parent="D7" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- percentComplete : double" vertex="1"><mxGeometry height="26" width="260" y="108" as="geometry" /></mxCell>
        <mxCell id="D7_5" parent="D7" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- ... other props" vertex="1"><mxGeometry height="26" width="260" y="134" as="geometry" /></mxCell>

        <mxCell id="D8" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;AvailabilityResponse" vertex="1">
          <mxGeometry height="116" width="300" x="1640" y="20" as="geometry" />
        </mxCell>
        <mxCell id="D8_1" parent="D8" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- availableSlots : List&amp;lt;Integer&amp;gt;" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="D8_2" parent="D8" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- allRooms : List&amp;lt;RoomDTO&amp;gt;" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="D8_3" parent="D8" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- occupiedRoomIdsBySlot : Map" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>

        <mxCell id="D1" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;TimetableSlotDTO" vertex="1">
          <mxGeometry height="298" width="300" x="1500" y="230" as="geometry" />
        </mxCell>
        <mxCell id="D1_1" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- id : Long" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="D1_2" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- className : String" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="D1_3" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- courseCode : String" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>
        <mxCell id="D1_4" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- lecturerName : String" vertex="1"><mxGeometry height="26" width="300" y="108" as="geometry" /></mxCell>
        <mxCell id="D1_5" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- date : LocalDate" vertex="1"><mxGeometry height="26" width="300" y="134" as="geometry" /></mxCell>
        <mxCell id="D1_6" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- slotNumber : int" vertex="1"><mxGeometry height="26" width="300" y="160" as="geometry" /></mxCell>
        <mxCell id="D1_7" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- attendanceStatus : String" vertex="1"><mxGeometry height="26" width="300" y="186" as="geometry" /></mxCell>
        <mxCell id="D1_8" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- assignmentTitle : String" vertex="1"><mxGeometry height="26" width="300" y="212" as="geometry" /></mxCell>
        <mxCell id="D1_9" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- submissionStatus : String" vertex="1"><mxGeometry height="26" width="300" y="238" as="geometry" /></mxCell>
        <mxCell id="D1_12" parent="D1" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- ... other props" vertex="1"><mxGeometry height="26" width="300" y="264" as="geometry" /></mxCell>

        <mxCell id="D5" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;DailyTimetableDTO" vertex="1">
          <mxGeometry height="142" width="300" x="2020" y="210" as="geometry" />
        </mxCell>
        <mxCell id="D5_1" parent="D5" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- date : LocalDate" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="D5_2" parent="D5" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- dayOfWeek : int" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="D5_3" parent="D5" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- dayName : String" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>
        <mxCell id="D5_4" parent="D5" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- slots : List&amp;lt;TimetableSlotDTO&amp;gt;" vertex="1"><mxGeometry height="26" width="300" y="108" as="geometry" /></mxCell>

        <mxCell id="D3" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;WeeklyTimetableDTO" vertex="1">
          <mxGeometry height="116" width="300" x="2020" y="470" as="geometry" />
        </mxCell>
        <mxCell id="D3_1" parent="D3" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- weekStart : LocalDate" vertex="1"><mxGeometry height="26" width="300" y="30" as="geometry" /></mxCell>
        <mxCell id="D3_2" parent="D3" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- weekEnd : LocalDate" vertex="1"><mxGeometry height="26" width="300" y="56" as="geometry" /></mxCell>
        <mxCell id="D3_3" parent="D3" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;html=1;fontSize=13;" value="- days : List&amp;lt;DailyTimetableDTO&amp;gt;" vertex="1"><mxGeometry height="26" width="300" y="82" as="geometry" /></mxCell>

        <!-- ==================== EDGES ==================== -->
        <mxCell id="R1" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="29"><mxGeometry relative="1" as="geometry" /></mxCell>
        <mxCell id="R2" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="S1"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="980" y="530" /><mxPoint x="980" y="530" /></Array></mxGeometry></mxCell>
        <mxCell id="R3" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="S2"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="980" y="338" /><mxPoint x="980" y="338" /></Array></mxGeometry></mxCell>

        <mxCell id="R5" edge="1" parent="1" source="29" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="67"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="680" y="900" /><mxPoint x="1260" y="900" /></Array></mxGeometry></mxCell>
        <mxCell id="R7" edge="1" parent="1" source="S1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="67"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="1260" y="650" /><mxPoint x="1260" y="650" /></Array></mxGeometry></mxCell>
        
        <mxCell id="R8" edge="1" parent="1" source="67" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;endArrow=open;endFill=0;" target="50" value="1    *"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="1560" y="820" /><mxPoint x="1560" y="820" /></Array></mxGeometry></mxCell>

        <!-- Use Dependencies -->
        <mxCell id="RU1" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D2" value="&amp;lt;&amp;lt;use&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="360" y="145" /><mxPoint x="360" y="145" /></Array></mxGeometry></mxCell>
        <mxCell id="RU2" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D4" value="&amp;lt;&amp;lt;use&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="350" y="268" /><mxPoint x="350" y="268" /></Array></mxGeometry></mxCell>
        
        <mxCell id="RU3" edge="1" parent="1" source="D2" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D2_3_Cont" value="&amp;lt;&amp;lt;has&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry" /></mxCell>

        <mxCell id="RU5" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D1" value="&amp;lt;&amp;lt;use&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="960" y="440" /><mxPoint x="1440" y="440" /><mxPoint x="1440" y="380" /></Array></mxGeometry></mxCell>
        
        <mxCell id="RU6" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D6" value="&amp;lt;&amp;lt;return&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="960" y="91" /><mxPoint x="960" y="91" /></Array></mxGeometry></mxCell>
        <mxCell id="RU7" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D7" value="&amp;lt;&amp;lt;return&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="970" y="110" /><mxPoint x="1320" y="110" /></Array></mxGeometry></mxCell>
        <mxCell id="RU8" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D8" value="&amp;lt;&amp;lt;return&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="980" y="130" /><mxPoint x="1600" y="130" /></Array></mxGeometry></mxCell>
        <mxCell id="RU9" edge="1" parent="1" source="12" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D3" value="&amp;lt;&amp;lt;return&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="960" y="580" /><mxPoint x="1980" y="580" /><mxPoint x="1980" y="528" /></Array></mxGeometry></mxCell>
        
        <mxCell id="RU10" edge="1" parent="1" source="D3" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D5" value="&amp;lt;&amp;lt;has&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="2170" y="420" /><mxPoint x="2170" y="420" /></Array></mxGeometry></mxCell>
        
        <mxCell id="RU11" edge="1" parent="1" source="D5" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1;endArrow=open;endFill=0;dashed=1;" target="D1" value="&amp;lt;&amp;lt;has&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="1830" y="281" /><mxPoint x="1830" y="380" /></Array></mxGeometry></mxCell>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>"""
with open("d:/fams-project/docs/timetable_operations_class_diagram.drawio", "w") as f:
    f.write(xml_template)
print("ok")

