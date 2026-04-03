"""Generate the AI Service layer additions for attendance_taking_class_diagram.drawio"""
import os

# Read existing file
path = os.path.join(os.path.dirname(__file__), 'attendance_taking_class_diagram.drawio')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# AI Service classes (Python Flask) - placed to the RIGHT of existing diagram
# Using a distinct orange/coral color for External AI Service
AI_BG = '#FFCCBC'  # Light coral for AI Service
AI_STR = '#BF360C'  # Deep orange stroke
AI_LAYER_BG = '#FBE9E7'  # Very light coral for layer background

# We need to insert new cells before the closing </root> tag
new_cells = """
        <!-- ============================================ -->
        <!-- AI Service (Python/Flask) External System    -->
        <!-- ============================================ -->
        <mxCell id="300" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FBE9E7;strokeColor=#BF360C;dashed=1;strokeWidth=2;verticalAlign=top;align=left;fontSize=17;fontStyle=1;spacingTop=5;spacingLeft=10;opacity=40;" value="AI Service (Python/Flask)" vertex="1">
          <mxGeometry height="820" width="540" x="1140" y="40" as="geometry" />
        </mxCell>

        <mxCell id="301" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#FFCCBC;strokeColor=#BF360C;rounded=1;shadow=1;fontSize=15;" value="&amp;lt;&amp;lt;Blueprint&amp;gt;&amp;gt;&#xa;face_routes (face_bp)" vertex="1">
          <mxGeometry height="242" width="500" x="1160" y="80" as="geometry" />
        </mxCell>
        <mxCell id="302" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="- face_service : FaceRecognitionService" vertex="1">
          <mxGeometry height="26" width="500" y="30" as="geometry" />
        </mxCell>
        <mxCell id="302b" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="- decision_engine : DecisionEngine" vertex="1">
          <mxGeometry height="26" width="500" y="56" as="geometry" />
        </mxCell>
        <mxCell id="303" parent="301" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="500" y="82" as="geometry" />
        </mxCell>
        <mxCell id="304" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/detect" vertex="1">
          <mxGeometry height="26" width="500" y="90" as="geometry" />
        </mxCell>
        <mxCell id="305" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/verify" vertex="1">
          <mxGeometry height="26" width="500" y="116" as="geometry" />
        </mxCell>
        <mxCell id="306" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/register" vertex="1">
          <mxGeometry height="26" width="500" y="142" as="geometry" />
        </mxCell>
        <mxCell id="307" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/liveness/passive" vertex="1">
          <mxGeometry height="26" width="500" y="168" as="geometry" />
        </mxCell>
        <mxCell id="308" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/quality-check" vertex="1">
          <mxGeometry height="26" width="500" y="194" as="geometry" />
        </mxCell>
        <mxCell id="309" parent="301" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="POST /api/face/anti-spoof" vertex="1">
          <mxGeometry height="26" width="500" y="216" as="geometry" />
        </mxCell>

        <mxCell id="310" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#FFCCBC;strokeColor=#BF360C;rounded=1;shadow=1;fontSize=15;" value="FaceRecognitionService" vertex="1">
          <mxGeometry height="142" width="500" x="1160" y="350" as="geometry" />
        </mxCell>
        <mxCell id="311" parent="310" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="- tolerance : float = 0.5" vertex="1">
          <mxGeometry height="26" width="500" y="30" as="geometry" />
        </mxCell>
        <mxCell id="312" parent="310" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="500" y="56" as="geometry" />
        </mxCell>
        <mxCell id="313" parent="310" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ encode_face(image_base64) : (encoding, error)" vertex="1">
          <mxGeometry height="26" width="500" y="64" as="geometry" />
        </mxCell>
        <mxCell id="314" parent="310" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ verify_face(image, ref_encodings, tol) : FaceVerificationResult" vertex="1">
          <mxGeometry height="26" width="500" y="90" as="geometry" />
        </mxCell>
        <mxCell id="315" parent="310" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ detect_face(image) : FaceDetectionResult" vertex="1">
          <mxGeometry height="26" width="500" y="116" as="geometry" />
        </mxCell>

        <mxCell id="320" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#FFCCBC;strokeColor=#BF360C;rounded=1;shadow=1;fontSize=15;" value="DecisionEngine" vertex="1">
          <mxGeometry height="142" width="500" x="1160" y="520" as="geometry" />
        </mxCell>
        <mxCell id="321" parent="320" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="- WEIGHTS : dict (active, passive, replay, geometry)" vertex="1">
          <mxGeometry height="26" width="500" y="30" as="geometry" />
        </mxCell>
        <mxCell id="322" parent="320" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="500" y="56" as="geometry" />
        </mxCell>
        <mxCell id="323" parent="320" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ calculate_score(...) : {decision, score, message}" vertex="1">
          <mxGeometry height="26" width="500" y="64" as="geometry" />
        </mxCell>
        <mxCell id="324" parent="320" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ quick_decision(active, anti_spoof, replay, geo) : dict" vertex="1">
          <mxGeometry height="26" width="500" y="90" as="geometry" />
        </mxCell>
        <mxCell id="324b" parent="320" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="  Golden Triangle: 2/3 Consensus (FAS + 3D + Physical)" vertex="1">
          <mxGeometry height="26" width="500" y="116" as="geometry" />
        </mxCell>

        <mxCell id="330" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#FFCCBC;strokeColor=#BF360C;rounded=1;shadow=1;fontSize=15;" value="AntiSpoofService" vertex="1">
          <mxGeometry height="116" width="240" x="1160" y="690" as="geometry" />
        </mxCell>
        <mxCell id="331" parent="330" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="  MiniFASNetV2 (ONNX)" vertex="1">
          <mxGeometry height="26" width="240" y="30" as="geometry" />
        </mxCell>
        <mxCell id="332" parent="330" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="240" y="56" as="geometry" />
        </mxCell>
        <mxCell id="333" parent="330" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ predict(image) : dict" vertex="1">
          <mxGeometry height="26" width="240" y="64" as="geometry" />
        </mxCell>
        <mxCell id="334" parent="330" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ check_liveness(image) : tuple" vertex="1">
          <mxGeometry height="26" width="240" y="90" as="geometry" />
        </mxCell>

        <mxCell id="340" parent="1" style="swimlane;fontStyle=1;align=center;startSize=30;html=1;collapsible=0;fillColor=#FFCCBC;strokeColor=#BF360C;rounded=1;shadow=1;fontSize=15;" value="ReplayDetectionService" vertex="1">
          <mxGeometry height="116" width="240" x="1420" y="690" as="geometry" />
        </mxCell>
        <mxCell id="341" parent="340" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="  FFT + Pixel Grid + LCD" vertex="1">
          <mxGeometry height="26" width="240" y="30" as="geometry" />
        </mxCell>
        <mxCell id="342" parent="340" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="240" y="56" as="geometry" />
        </mxCell>
        <mxCell id="343" parent="340" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ detect(image) : dict" vertex="1">
          <mxGeometry height="26" width="240" y="64" as="geometry" />
        </mxCell>
        <mxCell id="344" parent="340" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=13;" value="+ detect_moire_pattern() : tuple" vertex="1">
          <mxGeometry height="26" width="240" y="90" as="geometry" />
        </mxCell>

        <!-- AI Service Internal Edges -->
        <mxCell id="350" edge="1" parent="1" source="301" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=none;strokeColor=#BF360C;fontSize=13;strokeWidth=2;endArrow=open;endFill=0;" target="310" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="351" edge="1" parent="1" source="301" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=none;strokeColor=#BF360C;fontSize=13;strokeWidth=2;endArrow=open;endFill=0;" target="320" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="352" edge="1" parent="1" source="320" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=none;strokeColor=#BF360C;fontSize=13;strokeWidth=2;endArrow=open;endFill=0;" target="330" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="353" edge="1" parent="1" source="320" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=none;strokeColor=#BF360C;fontSize=13;strokeWidth=2;endArrow=open;endFill=0;" target="340" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>

        <!-- Cross-system Edge: FaceRecognitionClient (Backend) -> face_routes (AI Service) -->
        <mxCell id="360" edge="1" parent="1" source="200" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;jumpStyle=none;strokeColor=#BF360C;fontSize=13;strokeWidth=2;endArrow=open;endFill=0;dashed=1;dashPattern=12 4;" target="301" value="&amp;lt;&amp;lt;HTTP/REST&amp;gt;&amp;gt;">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
"""

# Insert before </root>
content = content.replace('      </root>', new_cells + '      </root>')

# Expand the canvas to accommodate AI Service on the right
content = content.replace(
    'dx="1800" dy="1200"',
    'dx="2400" dy="1800"'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Done! Updated {path}")
print(f"File size: {len(content)} bytes")
