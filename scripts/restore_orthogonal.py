import xml.etree.ElementTree as ET

tree = ET.parse('../docs/authentication_class_diagram.drawio')
root = tree.getroot()

for cell in root.findall('.//mxCell'):
    if cell.get('edge') == '1':
        style = cell.get('style', '')
        if not style:
            continue
            
        # Add back orthogonal capabilities
        if 'edgeStyle=orthogonalEdgeStyle;' not in style:
            style = 'edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;jettySize=auto;' + style
            
        # Force sharp corners instead of rounded
        style = style.replace('rounded=1;', 'rounded=0;')
        if 'rounded=0;' not in style:
            style += 'rounded=0;'
            
        cell.set('style', style)
        
tree.write('../docs/authentication_class_diagram.drawio', encoding='UTF-8', xml_declaration=False)
print("Restored orthogonal styling with sharp non-rounded corners.")
