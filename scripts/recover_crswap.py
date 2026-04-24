import os
import re

log_path = r'C:\Users\admin\.gemini\antigravity\brain\2b44f882-a195-4eda-a651-481e06ed027e\.system_generated\logs\overview.txt'
if not os.path.exists(log_path):
    print("Log path does not exist:", log_path)
else:
    with open(log_path, 'r', encoding='utf-8') as f:
        text = f.read()

    start_marker = "File Path: `file:///d:/fams-project/docs/authentication_class_diagram.drawio.crswap`"
    # End marker logic might be imprecise because of line breaks, so we just match until we see `</mxfile>`
    
    start_idx = text.find(start_marker)
    if start_idx != -1:
        block = text[start_idx:]
        lines = block.split('\n')
        
        extracted = []
        record = False
        for line in lines:
            if re.match(r'^1:\s<mxfile', line):
                record = True
            
            if record:
                m = re.match(r'^\d+:\s(.*)$', line)
                if m:
                    extracted.append(m.group(1))
                else:
                    # just append exact if no prefix, or handle cases
                    m_blank = re.match(r'^\d+:$', line.strip())
                    if m_blank:
                        extracted.append("")
                        continue

                # Stop when we reach the closing tag
                if line.endswith("</mxfile>"):
                    break
                    
        content = '\n'.join(extracted)
        
        # Remove colors
        content = re.sub(r'(fillColor|strokeColor)=#[0-9a-fA-F]{6};?', '', content)
        
        out_path = r'd:\fams-project\docs\authentication_class_diagram.drawio'
        with open(out_path, 'w', encoding='utf-8') as out:
             out.write(content)
        print("Recovered and applied color removal successfully, extracted lines:", len(extracted))
    else:
        print("Could not find the crswap log")
