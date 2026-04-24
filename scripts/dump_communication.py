import xml.etree.ElementTree as ET
import os

def dump_diagram(file_path):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        cells = root.findall('.//mxCell')
        
        classes = {}
        for cell in cells:
            style = cell.get('style', '')
            if 'swimlane' in style:
                class_id = cell.get('id')
                class_name = cell.get('value', '').replace('&lt;', '<').replace('&gt;', '>').replace('<br>', ' ')
                classes[class_id] = {'name': class_name, 'items': []}
                for item in cells:
                    if item.get('parent') == class_id:
                        val = item.get('value', '')
                        if val:
                            clean_val = val.replace('&lt;', '<').replace('&gt;', '>').replace('<br>', ' ')
                            classes[class_id]['items'].append(clean_val)
        
        with open('dump.txt', 'w', encoding='utf-8') as f:
            for cid, data in classes.items():
                f.write(f"\nCLASS: {data['name']}\n")
                for item in data['items']:
                    f.write(f"  {item}\n")
        print("Dump successful.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_diagram('../docs/class_communication_class_diagram.drawio')
