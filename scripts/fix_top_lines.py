import xml.etree.ElementTree as ET

tree = ET.parse('../docs/authentication_class_diagram.drawio')
root = tree.getroot()

swimlanes = {}
for cell in root.findall('.//mxCell'):
    style = cell.get('style', '')
    if style.startswith('swimlane'):
        geom = cell.find('mxGeometry')
        if geom is not None:
            swimlanes[cell.get('id')] = {"element": cell, "children": []}

for cell in root.findall('.//mxCell'):
    pid = cell.get('parent')
    if pid in swimlanes:
        geom = cell.find('mxGeometry')
        if geom is not None:
            swimlanes[pid]["children"].append(cell)

root_element = root.find('.//root')
lines_removed = 0

for pid, data in swimlanes.items():
    children = data["children"]
    # Find line at y=26
    line_to_remove = None
    for child in children:
        style = child.get('style', '')
        geom = child.find('mxGeometry')
        if style.startswith('line') and geom is not None and geom.get('y') == '26':
            line_to_remove = child
            break
            
    if line_to_remove is not None:
        try:
            root_element.remove(line_to_remove)
            lines_removed += 1
            # Adjust y of other children
            for child in children:
                if child is line_to_remove:
                    continue
                geom = child.find('mxGeometry')
                if geom is not None:
                    y = float(geom.get('y', '0'))
                    if y > 26:
                        geom.set('y', str(int(y - 8)))
            
            # Adjust height of parent
            parent_geom = data["element"].find('mxGeometry')
            if parent_geom is not None:
                new_h = int(float(parent_geom.get('height'))) - 8
                parent_geom.set('height', str(new_h))
        except Exception as e:
            print("Error removing line:", e)

tree.write('../docs/authentication_class_diagram.drawio', encoding='UTF-8', xml_declaration=False)
print(f"Fixed diagram successfully, removed {lines_removed} double lines at the top!")
