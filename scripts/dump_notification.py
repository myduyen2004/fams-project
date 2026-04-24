import xml.etree.ElementTree as ET
try:
    tree = ET.parse('../docs/notification_management_class_diagram.drawio')
    for c in tree.getroot().findall('.//mxCell'):
        style = c.get('style', '')
        if style.startswith('swimlane'):
            name = c.get('value', '').replace('&lt;', '<').replace('&gt;', '>').replace('&#xa;', ' ').replace('<br>', ' ')
            pid = c.get('id')
            print(f'\nCLASS: {name}')
            for ch in tree.getroot().findall('.//mxCell'):
                if ch.get('parent') == pid and ch.get('style', '').startswith('text'):
                    m = ch.get('value', '')
                    print('  ', m.replace('&lt;', '<').replace('&gt;', '>'))
except Exception as e:
    print(e)
