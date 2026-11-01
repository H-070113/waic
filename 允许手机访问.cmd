@echo off
cd /d "%~dp0"
net session >nul 2>nul
if errorlevel 1 (
  echo Please right-click this file and choose "Run as administrator".
  pause
  exit
)
netsh advfirewall firewall delete rule name="star-isle-8899" >nul 2>nul
netsh advfirewall firewall add rule name="star-isle-8899" dir=in action=allow protocol=TCP localport=8899 >nul
echo Firewall rule added: TCP 8899 is open for this local network.
echo Now open http://THIS-PC-IP:8899 on your phone.
pause
