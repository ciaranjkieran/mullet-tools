# Start Backend
Start-Process powershell -ArgumentList "cd backend\mulletbackend; .\venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8000" -NoNewWindow

# Start Frontend
Start-Process powershell -ArgumentList "cd apps\web; npm run dev" -NoNewWindow
