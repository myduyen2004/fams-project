# FAMS Project - Team Mobile Connection Guide

To ensure everyone in the team can connect their real mobile devices via USB smoothly, please follow these steps **once** on your machine.

## 1. Add ADB to your System PATH
This allows you to run `adb` from any terminal window.

- **Windows**: 
  1. Find your `platform-tools` folder (usually in `C:\Users\<User>\AppData\Local\Android\Sdk\platform-tools`).
  2. Add this path to your "Environment Variables" -> "Path".
- **Mac/Linux**: 
  Add `export PATH=$PATH:~/Library/Android/sdk/platform-tools` to your `.zshrc` or `.bashrc`.

## 2. Create the "Shortcut" Command
Instead of typing a long command, we will use a short one: `fams-connect`.

### For Windows (PowerShell)
Run this command **one time** in your terminal:
```powershell
if (!(Test-Path $PROFILE)) { New-Item -Type File -Path $PROFILE -Force }
"'function fams-connect { adb reverse tcp:8080 tcp:8080; echo ""[FAMS] USB Connection Established!"" }'" | Out-File -FilePath $PROFILE -Append -Encoding utf8
```
*Note: Restart VS Code after running this.*

### For Mac/Linux (Zsh/Bash)
Add this line to your `~/.zshrc` or `~/.bashrc`:
```bash
alias fams-connect='adb reverse tcp:8080 tcp:8080 && echo "[FAMS] USB Connection Established!"'
```

---

## Daily Workflow
1. Connect your phone via USB (with USB Debugging ON).
2. Open terminal and type: **`fams-connect`**.
3. Run your Flutter app!
