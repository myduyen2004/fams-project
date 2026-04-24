import xml.etree.ElementTree as ET
import re

tree = ET.parse('../docs/authentication_class_diagram.drawio')
root = tree.getroot()

for cell in root.findall('.//mxCell'):
    style = cell.get('style', '')
    if not style:
        continue
        
    original_style = style
    
    # Check if edge
    is_edge = cell.get('edge') == '1'
    is_swimlane = style.startswith('swimlane')
    is_line = style.startswith('line')
    
    if is_edge:
        # Update strokeWidth
        if 'strokeWidth=' in style:
            style = re.sub(r'strokeWidth=\d+;', 'strokeWidth=2;', style)
        else:
            style += 'strokeWidth=2;'
            
        # Update fontSize
        if 'fontSize=' in style:
            style = re.sub(r'fontSize=\d+;', 'fontSize=14;', style)
        else:
            style += 'fontSize=14;'
            
        # Update arrow sizes
        if 'startSize=' in style:
            style = re.sub(r'startSize=\d+;', 'startSize=16;', style)
        elif 'startArrow' in style:
            style += 'startSize=16;'
            
        if 'endSize=' in style:
            style = re.sub(r'endSize=\d+;', 'endSize=16;', style)
        elif 'endArrow' in style:
            style += 'endSize=16;'
            
        cell.set('style', style)
        
    elif is_swimlane or is_line:
        # Update strokeWidth
        if 'strokeWidth=' in style:
            style = re.sub(r'strokeWidth=\d+;', 'strokeWidth=2;', style)
        else:
            style += 'strokeWidth=2;'
            
        cell.set('style', style)

tree.write('../docs/authentication_class_diagram.drawio', encoding='UTF-8', xml_declaration=False)
print("Updated diagram to have thicker lines and clearer symbols!")
