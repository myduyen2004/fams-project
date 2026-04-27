import os
import re
import glob

SCHEMA_FILE = 'database/fams_schema.sql'
ENTITY_DIR = 'backend/src/main/java/com/fams/backend/entity'

def parse_schema():
    schema = {}
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
        
    tables = re.findall(r'CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\((.*?)\);', content, re.DOTALL | re.IGNORECASE)
    for t_name, t_body in tables:
        t_name = t_name.lower()
        columns = set()
        for line in t_body.split('\n'):
            line = line.strip()
            if not line or line.startswith('--') or line.startswith('CONSTRAINT') or line.startswith('PRIMARY KEY') or line.startswith('FOREIGN KEY') or line.startswith('UNIQUE'):
                continue
            parts = line.split()
            if not parts: continue
            col_name = parts[0].lower()
            columns.add(col_name)
        schema[t_name] = columns
    return schema

def camel_to_snake(name):
    name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()

def parse_entities():
    entities = {}
    for filepath in glob.glob(os.path.join(ENTITY_DIR, '*.java')):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        class_name_match = re.search(r'public\s+class\s+([A-Za-z0-9_]+)', content)
        if not class_name_match: continue
        class_name = class_name_match.group(1)
        
        table_name = camel_to_snake(class_name)
        table_match = re.search(r'@Table\(\s*name\s*=\s*"([^"]+)"', content)
        if table_match:
            table_name = table_match.group(1).lower()
            
        columns = set()
        
        # simple properties
        lines = content.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            if line.startswith('private '):
                parts = line.split()
                if len(parts) >= 3:
                    field_name = parts[2].replace(';', '')
                    if '=' in field_name:
                        field_name = field_name.split('=')[0]
                        
                    col_name = camel_to_snake(field_name)
                    
                    # check previous lines for @Column or @JoinColumn
                    for j in range(i-1, max(i-5, -1), -1):
                        prev = lines[j]
                        if '@Column' in prev and 'name' in prev:
                            m = re.search(r'name\s*=\s*"([^"]+)"', prev)
                            if m: col_name = m.group(1).lower()
                            break
                        if '@JoinColumn' in prev and 'name' in prev:
                            m = re.search(r'name\s*=\s*"([^"]+)"', prev)
                            if m: col_name = m.group(1).lower()
                            break
                            
                    columns.add(col_name)
                    
        entities[table_name] = columns
    return entities

def main():
    schema = parse_schema()
    entities = parse_entities()
    
    print("--- TABLES IN ENTITIES NOT IN SCHEMA ---")
    for e_table in entities:
        if e_table not in schema:
            print(f"Table missing in schema: {e_table}")
            
    print("\n--- TABLES IN SCHEMA NOT IN ENTITIES ---")
    for s_table in schema:
        if s_table not in entities:
            # might be junction tables that are @ManyToMany in java
            print(f"Table missing in entities (might be junction): {s_table}")
            
    print("\n--- COLUMN DISCREPANCIES ---")
    for e_table, e_cols in entities.items():
        if e_table in schema:
            s_cols = schema[e_table]
            missing_in_schema = e_cols - s_cols
            missing_in_entity = s_cols - e_cols
            
            # ignore standard JPA fields that might be mapped differently or just objects
            missing_in_schema = {c for c in missing_in_schema if not c.endswith('_list') and not c.endswith('_set')}
            
            if missing_in_schema:
                print(f"[{e_table}] Columns in Entity but missing in Schema: {missing_in_schema}")
            # if missing_in_entity:
            #     print(f"[{e_table}] Columns in Schema but missing in Entity: {missing_in_entity}")

if __name__ == '__main__':
    main()
