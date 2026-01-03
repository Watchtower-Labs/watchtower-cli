# Fix venv script

Write-Host "Checking venv Python cache locations..." -ForegroundColor Yellow

# Activate venv and find all cache
& venv\Scripts\Activate.ps1
python -c "import sys; import sysconfig; print('Site packages:', sysconfig.get_paths()['purelib'])"

Write-Host "`nCleaning venv cache..." -ForegroundColor Yellow

# Remove all cache in venv
Get-ChildItem -Path venv -Recurse -Filter "__pycache__" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path venv -Recurse -Filter "*.pyc" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "Cache cleaned!" -ForegroundColor Green

# Check for google packages
Write-Host "`nChecking for google packages in venv..." -ForegroundColor Yellow
python -c "import sys; import os; sp = [p for p in sys.path if 'site-packages' in p]; print('\n'.join([f for s in sp for f in os.listdir(s) if 'google' in f.lower()])) if sp else print('No google packages')" 2>$null

Write-Host "`nTry running now:" -ForegroundColor Green
Write-Host "python -B examples\simple_agent.py" -ForegroundColor Cyan
