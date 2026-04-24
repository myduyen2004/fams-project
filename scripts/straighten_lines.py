import xml.etree.ElementTree as ET
import re

tree = ET.parse('../docs/authentication_class_diagram.drawio')
root = tree.getroot()

for cell in root.findall('.//mxCell'):
    if cell.get('edge') == '1':
        style = cell.get('style', '')
        if not style:
            continue
            
        # 1. Remove edgeStyle=something; (this makes it a direct straight line between source and target)
        style = re.sub(r'edgeStyle=[a-zA-Z]+;', '', style)
        
        # 2. Change rounded=1 parameter to rounded=0 (sharp corners if any routing happens)
        style = re.sub(r'rounded=1;', 'rounded=0;', style)
        if 'rounded=0;' not in style:
            style += 'rounded=0;'
            
        # 3. Remove orthogonal routing properties that cause the line to make turns
        style = re.sub(r'orthogonalLoop=\d+;', '', style)
        style = re.sub(r'jettySize=[a-zA-Z0-9]+;', '', style)
        style = re.sub(r'curved=\d+;', '', style)
        
        # Optionally, for pure aesthetic, making them 100% straight ensures no automatic elbow routing.
        
        cell.set('style', style)
        
tree.write('../docs/authentication_class_diagram.drawio', encoding='UTF-8', xml_declaration=False)
print("Updated all edge connectors to be perfectly straight point-to-point lines!")
