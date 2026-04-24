
import sys
import os

# Mocking Flask and other dependencies to load the modules
sys.modules['flask'] = type('Mock', (), {'Flask': lambda x: None, 'jsonify': lambda x: None, 'request': None})
sys.modules['flask_cors'] = type('Mock', (), {'CORS': lambda x: None})

# Set environment variables for config if needed
os.environ['SECRET_KEY'] = 'test-secret'

# Setup paths
sys.path.append('/Users/mac/Desktop/hello/fams-project/ai-service')

from app.services.chat.db.tools_loader import tools_loader
from app.services.chat.router.hard_router import hard_router
from app.services.chat.router.light_router import _ROUTE_CACHE, _ROUTE_CACHE_LOCK

def verify():
    print("--- Verification Start ---")
    
    # 1. Initial Load (Simulated)
    # Since I can't easily mock the DB connection for a real reload, 
    # I'll manually set some state to test the registration/clearing logic.
    
    print("Setting up initial state...")
    hard_router._cache["test_msg"] = "test_result"
    with _ROUTE_CACHE_LOCK:
        _ROUTE_CACHE["test_msg"] = {"result": "test"}
    
    print(f"HardRouter cache size: {len(hard_router._cache)}")
    print(f"LightRouter cache size: {len(_ROUTE_CACHE)}")
    
    # 2. Trigger Reload Logic
    # We want to verify that calling tools_loader.reload() triggers clear_cache on routers.
    # I will mock the _load_from_db to do nothing but succeed.
    tools_loader._load_from_db = lambda: ([], [], []) 
    
    print("Triggering tools_loader.reload()...")
    tools_loader.reload()
    
    # 3. Check if caches are cleared
    h_size = len(hard_router._cache)
    l_size = len(_ROUTE_CACHE)
    
    print(f"HardRouter cache size after reload: {h_size}")
    print(f"LightRouter cache size after reload: {l_size}")
    
    if h_size == 0 and l_size == 0:
        print("SUCCESS: Caches cleared on reload!")
    else:
        print("FAILURE: Caches NOT cleared on reload!")
        sys.exit(1)

    # 4. Check Activity Checks
    # We'll mock tool_status to show a tool is locked
    tools_loader.tool_status["view_students"] = False
    
    print("Testing HardRouter locked check...")
    from app.services.chat.router.hard_router import _is_locked, _locked_result
    if _is_locked("view_students"):
        print("HardRouter _is_locked works!")
    else:
        print("HardRouter _is_locked FAILED!")
        sys.exit(1)

    # Testing LightRouter _set_tool
    print("Testing LightRouter _set_tool locked check...")
    from app.services.chat.router.light_router import _set_tool
    result = {}
    _set_tool(result, "view_students")
    if result.get("intent") == "tool_locked":
        print("LightRouter _set_tool respects locked status!")
    else:
        print("LightRouter _set_tool FAILED!")
        sys.exit(1)

    print("--- Verification Complete ---")

if __name__ == "__main__":
    verify()
