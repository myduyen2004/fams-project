import xml.etree.ElementTree as ET

for fname in ['attendance_taking_class_diagram.drawio', 'attendance_taking_reporting_class_diagram.drawio']:
    try:
        tree = ET.parse(f'../docs/{fname}')
        with open('dump.txt', 'a' if 'reporting' in fname else 'w', encoding='utf-8') as f:
            f.write(f'\n=== FILE: {fname} ===\n')
            for c in tree.getroot().findall('.//mxCell'):
                style = c.get('style', '')
                if style.startswith('swimlane'):
                    name = c.get('value', '').replace('&lt;', '<').replace('&gt;', '>').replace('&#xa;', ' ').replace('<br>', ' ')
                    pid = c.get('id')
                    f.write(f'\nCLASS: {name}\n')
                    for ch in tree.getroot().findall('.//mxCell'):
                        if ch.get('parent') == pid and ch.get('style', '').startswith('text'):
                            m = ch.get('value', '')
                            f.write('  ' + m.replace('&lt;', '<').replace('&gt;', '>') + '\n')
    except Exception as e:
        print(e)
