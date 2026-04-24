import xml.etree.ElementTree as ET
try:
    tree = ET.parse('../docs/lecturer_records_class_diagram.drawio')
    with open('dump.txt', 'w', encoding='utf-8') as f:
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
