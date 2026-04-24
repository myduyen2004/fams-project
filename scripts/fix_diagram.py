import xml.etree.ElementTree as ET

tree = ET.parse(r'C:\Users\admin\Desktop\auth_backup.drawio') if False else ET.parse('../docs/authentication_class_diagram.drawio')
root = tree.getroot()

swimlanes = {}
for cell in root.findall('.//mxCell'):
    style = cell.get('style', '')
    if style.startswith('swimlane'):
        geom = cell.find('mxGeometry')
        if geom is not None:
            swimlanes[cell.get('id')] = {"element": cell, "children": [], "height": float(geom.get('height', '0'))}

for cell in root.findall('.//mxCell'):
    pid = cell.get('parent')
    if pid in swimlanes:
        geom = cell.find('mxGeometry')
        if geom is not None:
            y = float(geom.get('y', '0'))
            swimlanes[pid]["children"].append({"element": cell, "y": y})

root_element = root.find('.//root')
for pid, data in swimlanes.items():
    children = sorted(data["children"], key=lambda x: x["y"])
    if children:
        last_child = children[-1]["element"]
        style = last_child.get('style', '')
        if style.startswith('line'):
            try:
                root_element.remove(last_child)
                geom = data["element"].find('mxGeometry')
                new_h = int(float(geom.get('height'))) - 8
                geom.set('height', str(new_h))
            except Exception as e:
                pass

floating_targets = ["113", "116", "119", "123", "128"]
edge_id_counter = 1000

for target_id in floating_targets:
    edge_id_counter += 1
    edge = ET.Element('mxCell', {
        'id': str(edge_id_counter),
        'edge': '1',
        'parent': '1',
        'source': '11',
        'target': target_id,
        'style': 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#000000;fontSize=10;',
        'value': 'receives'
    })
    geom = ET.Element('mxGeometry', {
        'relative': '1',
        'as': 'geometry'
    })
    edge.append(geom)
    root_element.append(edge)

tree.write('../docs/authentication_class_diagram.drawio', encoding='UTF-8', xml_declaration=False)
print("Fixed diagram successfully")
